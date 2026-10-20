const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), swc = require('next/dist/build/swc');
const root = path.resolve(__dirname, '..'), clone = v => structuredClone(v);
process.env.VERCEL_ENV = 'preview'; process.env.STRIPE_CONNECT_ENABLED = 'true'; process.env.STRIPE_REFUNDS_ENABLED = 'true';
function loader(mocks = {}) {
 const cache = {};
 function load(file) {
  file = path.resolve(root, file); if (mocks[file]) return mocks[file]; if (cache[file]) return cache[file];
  const exports = cache[file] = {}, code = swc.transformSync(fs.readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript',tsx:file.endsWith('tsx')},target:'es2022',transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}}).code;
  new Function('exports','require','console',code)(exports,name=>name.startsWith('.')||name.startsWith('@/')?load((name.startsWith('@/')?path.join(root,'src',name.slice(2)):path.resolve(path.dirname(file),name))+'.ts'):mocks[name]||require(name),{error(){}});
  return exports;
 }
 return load;
}
const provider = loader()('src/lib/stripe-connect-provider.ts');
function matches(row, where = {}) {
 return Object.entries(where).every(([k,v])=>{
  if(k==='OR')return v.some(w=>matches(row,w)); if(k==='AND')return v.every(w=>matches(row,w));
  if(k==='paymentId_priorRefundedPence')return matches(row,v);
  const a=row[k]; if(v && typeof v==='object' && !(v instanceof Date)) {
   if('not' in v)return a!==v.not; if('in' in v)return v.in.includes(a); if('lt' in v)return a<v.lt; if('lte' in v)return a<=v.lte;
  }
  return a===v;
 });
}
function context(options = {}) {
 const transferred=options.transferred!==false, fine=transferred?(options.fine??2500):0;
 let state={
  payment:{id:'pay',bookingId:'booking',provider:'STRIPE',providerReference:'pi_test',currency:'GBP',status:'PAID',payoutStatus:transferred?'PAID':'READY',paidPence:11000,refundedPence:0,platformFeePence:1000,transporterProceedsPence:10000-fine,cancellationDeductionPence:fine,events:[],booking:{id:'booking',transporterId:'transporter',customerId:'customer',status:'DELIVERED',customerConfirmedAt:new Date(Date.now()-25*3600000),disputes:[]}},
  payout:transferred?{id:'release',paymentId:'pay',environment:'preview',paymentIntentId:'pi_test',sourceChargeId:'ch_test',destinationAccountId:'acct_test',status:fine===10000?'DEDUCTED':'TRANSFERRED',stripeTransferId:fine===10000?null:'tr_test',amountPence:10000-fine,finePence:fine,reversedPence:0,refundedPence:0,transferredAt:new Date()}:null,
  refunds:[], events:fine&&!options.cancellation?[{paymentId:'pay',note:'ADMIN_DISPUTE_FINE_APPLIED:dispute_fine',amountPence:fine}]:[], notifications:[],
  deductions:fine&&options.cancellation?[{id:'deduction',paymentId:'pay',feeId:'fee',amountPence:fine}]:[],
  fees:fine&&options.cancellation?[{id:'fee',transporterId:'transporter',amountPence:5000,appliedPence:fine,status:'PARTIALLY_APPLIED'}]:[],
 };
 const external=[], reversals=[], refundCalls=[], reversalCalls=[];
 let lostRefund=!!options.lostRefund, lostCommit=!!options.lostCommit, lostReversal=!!options.lostReversal, lostRecoveryCommit=!!options.lostRecoveryCommit;
 const request={id:'request',bookingId:'booking',paymentProvider:'STRIPE',paymentEnvironment:'preview',status:'BOOKED',authorisedAmountPence:11000,paymentIntentId:'pi_test'};
 const intent={id:'pi_test',livemode:false,capture_method:'manual',status:'succeeded',currency:'gbp',amount:11000,amount_received:11000,metadata:{availabilityRequestId:'request',environment:'preview'},latest_charge:{id:'ch_test',payment_intent:'pi_test',livemode:false,paid:true,captured:true,disputed:false,currency:'gbp',amount:11000,amount_refunded:0}};
 const transfer={id:'tr_test',livemode:false,currency:'gbp',amount:10000-fine,amount_reversed:0,destination:'acct_test',source_transaction:'ch_test',transfer_group:'dd_payout_release',metadata:{driveDropPayoutId:'release',environment:'preview'}};
 const update=(row,data)=>{for(const[k,v]of Object.entries(data))row[k]=v&&typeof v==='object'&&'increment'in v?(row[k]||0)+v.increment:v&&typeof v==='object'&&'decrement'in v?row[k]-v.decrement:v; row.updatedAt=new Date();return clone(row)};
 const rowGet=where=>state.refunds.find(r=>matches(r,where));
 const db={
  $queryRaw:async()=>[], $executeRaw:async(strings,...values)=>{if(strings.join('').includes('Notification'))state.notifications.push(values);return 1},
  bookingPayment:{findUniqueOrThrow:async()=>({...clone(state.payment),stripePayout:clone(state.payout)}),update:async({data})=>update(state.payment,data)},
  availabilityRequest:{findFirst:async()=>clone(request)},
  stripeRefund:{
   findUnique:async({where,include})=>{const row=rowGet(where);return row?{...clone(row),...(include?{payment:{bookingId:'booking'}}:{})}:null},
   findUniqueOrThrow:async args=>{const row=await db.stripeRefund.findUnique(args);assert(row);return row},
   findMany:async({where={}}={})=>clone(state.refunds.filter(r=>matches(r,where))),
   create:async({data})=>{assert(!state.refunds.some(r=>r.paymentId===data.paymentId&&r.priorRefundedPence===data.priorRefundedPence));const row={id:'refund_'+(state.refunds.length+1),stripeRefundId:null,stripeReversalId:null,ledgerAppliedAt:null,firstAttemptAt:null,recoveryFirstAttemptAt:null,leaseUntil:null,leaseToken:null,retryAfter:null,status:'PENDING',attemptCount:0,disputeId:null,resolution:null,...data};for(const k of ['disputeId','resolution'])if(row[k]===undefined)row[k]=null;state.refunds.push(row);return clone(row)},
   update:async({where,data})=>update(rowGet(where),data),
   updateMany:async({where,data})=>{const rows=state.refunds.filter(r=>matches(r,where));rows.forEach(r=>update(r,data));return{count:rows.length}},
  },
  stripePayout:{findUniqueOrThrow:async()=>clone(state.payout),update:async({data})=>update(state.payout,data)},
  financeEvent:{create:async({data})=>{state.events.push(data);return data},groupBy:async()=>{const map={};for(const e of state.events)if(e.note?.startsWith('ADMIN_DISPUTE_FINE_APPLIED:'))map[e.note]=(map[e.note]||0)+e.amountPence;return Object.entries(map).map(([note,n])=>({note,_sum:{amountPence:n}}))}},
  transporterCancellationDeduction:{findMany:async()=>clone(state.deductions),delete:async({where})=>{state.deductions=state.deductions.filter(d=>d.id!==where.id)},update:async({where,data})=>update(state.deductions.find(d=>d.id===where.id),data)},
  transporterCancellationFee:{findUniqueOrThrow:async({where})=>clone(state.fees.find(f=>f.id===where.id)),update:async({where,data})=>update(state.fees.find(f=>f.id===where.id),data)},
  dispute:{count:async()=>state.payment.booking.disputes.filter(d=>['OPEN','UNDER_REVIEW'].includes(d.status)).length,update:async({where,data})=>update(state.payment.booking.disputes.find(d=>d.id===where.id),data),updateMany:async({where,data})=>{const rows=state.payment.booking.disputes.filter(d=>matches(d,where));rows.forEach(d=>update(d,data));return{count:rows.length}}},
 };
 let tail=Promise.resolve();
 db.$transaction=async fn=>{let unlock;const prior=tail;tail=new Promise(resolve=>unlock=resolve);await prior;const saved=clone(state);try{const result=await fn(db);if(lostCommit&&state.refunds.some(r=>r.ledgerAppliedAt)){lostCommit=false;throw Error('lost database commit')}if(lostRecoveryCommit&&state.refunds.some(r=>r.recoveryStatus==='RECOVERED')){lostRecoveryCommit=false;throw Error('lost recovery commit')}return result}catch(e){state=saved;throw e}finally{unlock()}};
 const stripe={paymentIntents:{retrieve:async()=>{const i=clone(intent);i.latest_charge.amount_refunded=external.filter(r=>!['failed','canceled'].includes(r.status)).reduce((n,r)=>n+r.amount,0);return i}},refunds:{
  list:async()=>({data:clone(external),has_more:false}),
  create:async(params,opts)=>{refundCalls.push({params,opts});let r=external.find(r=>r.key===opts.idempotencyKey);if(!r){r={id:'re_'+(external.length+1),...clone(params),payment_intent:'pi_test',currency:'gbp',status:options.pending?'pending':options.failed?'failed':'succeeded',key:opts.idempotencyKey};external.push(r)}if(lostRefund){lostRefund=false;throw Error('lost refund response')}return clone(r)},
 },transfers:{
  retrieve:async()=>({...clone(transfer),amount_reversed:transfer.amount_reversed+reversals.reduce((n,r)=>n+r.amount,0)}),
  listReversals:async()=>({data:clone(reversals),has_more:false}),
  createReversal:async(id,params,opts)=>{reversalCalls.push({params,opts});if(options.insufficient)throw new provider.ConnectError('Insufficient balance','INSUFFICIENT_BALANCE');let r=reversals.find(r=>r.key===opts.idempotencyKey);if(!r){r={id:'trr_'+(reversals.length+1),transfer:id,currency:'gbp',...clone(params),key:opts.idempotencyKey};reversals.push(r)}if(lostReversal){lostReversal=false;throw Error('lost reversal response')}return clone(r)},
 }};
 const engine=loader({[path.join(root,'src/lib/prisma.ts')]:{prisma:db},[path.join(root,'src/lib/stripe-connect-provider.ts')]:{...provider,verifiedConnectClient:async()=>stripe}})('src/lib/stripe-refunds.ts');
 const input=(amount=11000,prior=0)=>({paymentId:'pay',amountPence:amount,expectedRefundedPence:prior,actorId:'admin'});
 return{engine,input,state:()=>state,db,stripe,intent,transfer,external,reversals,refundCalls,reversalCalls,options};
}
(async()=>{
 let c=context({transferred:false});let rows=await Promise.all([c.engine.prepareStripeRefund(c.input()),c.engine.prepareStripeRefund(c.input())]);assert.equal(rows[0].id,rows[1].id);assert.equal(c.state().payment.payoutStatus,'HELD');
 await Promise.all([c.engine.reconcileStripeRefund(rows[0].id),c.engine.reconcileStripeRefund(rows[0].id)]);assert.equal(c.external.length,1);assert.equal(c.refundCalls.length,1);assert.equal(c.state().payment.refundedPence,11000);assert.equal(c.state().payment.payoutStatus,'CANCELLED');assert.equal(c.state().notifications.length,2);assert.equal(c.reversalCalls.length,0);
 await c.engine.prepareStripeRefund(c.input());await c.engine.reconcileStripeRefund(rows[0].id);assert.equal(c.refundCalls.length,1);assert.equal(c.state().notifications.length,2);
 for(const failure of ['lostRefund','lostCommit','lostReversal','lostRecoveryCommit']){
  c=context({[failure]:true});const row=await c.engine.prepareStripeRefund(c.input());await c.engine.reconcileStripeRefund(row.id);await c.engine.reconcileStripeRefund(row.id);
  assert.equal(c.external.length,1,failure);assert.equal(c.reversals.length,1,failure);assert.equal(c.state().payment.refundedPence,11000,failure);assert.equal(c.state().payment.payoutStatus,'CANCELLED',failure);assert.equal(c.state().notifications.length,2,failure);assert.equal(c.state().events.filter(e=>e.note.startsWith('STRIPE_REFUND_CONFIRMED:')).length,1,failure);assert.equal(c.state().events.filter(e=>e.note.startsWith('ADMIN_DISPUTE_FINE_APPLIED:')).reduce((n,e)=>n+e.amountPence,0),0,failure);
 }
 c=context();let row=await c.engine.prepareStripeRefund(c.input(5500));await c.engine.reconcileStripeRefund(row.id);assert.equal(c.reversals[0].amount,5000);assert.equal(c.state().payment.platformFeePence,500);assert.equal(c.state().payment.transporterProceedsPence,2500);assert.equal(c.state().payment.cancellationDeductionPence,2500);assert.equal(c.state().payment.payoutStatus,'PAID');
 await assert.rejects(()=>c.engine.prepareStripeRefund(c.input(6000,0)));row=await c.engine.prepareStripeRefund(c.input(5500,5500));await c.engine.reconcileStripeRefund(row.id);assert.equal(c.external.length,2);assert.equal(c.reversals[1].amount,2500);assert.equal(c.state().payment.cancellationDeductionPence,0);assert.equal(c.state().payment.refundedPence,11000);
 c=context({cancellation:true});row=await c.engine.prepareStripeRefund(c.input());await c.engine.reconcileStripeRefund(row.id);assert.equal(c.state().deductions.length,0);assert.equal(c.state().fees[0].appliedPence,0);assert.equal(c.state().fees[0].amountPence,5000);assert.equal(c.state().fees[0].status,'PENDING');
 c=context({fine:10000});row=await c.engine.prepareStripeRefund(c.input());await c.engine.reconcileStripeRefund(row.id);assert.equal(c.state().payment.payoutStatus,'CANCELLED');assert.equal(c.reversals.length,0);
 c=context({pending:true});row=await c.engine.prepareStripeRefund(c.input());await c.engine.reconcileStripeRefund(row.id);assert.equal(c.state().payment.refundedPence,0);assert.equal(c.state().refunds[0].status,'PENDING_STRIPE');assert.equal(c.reversalCalls.length,0);c.external[0].status='succeeded';await c.engine.reconcileStripeRefund(row.id);assert.equal(c.state().payment.refundedPence,11000);assert.equal(c.refundCalls.length,1);
 c=context({failed:true});row=await c.engine.prepareStripeRefund(c.input());await c.engine.reconcileStripeRefund(row.id);assert.equal(c.state().payment.refundedPence,0);assert.equal(c.state().refunds[0].status,'FAILED');assert.equal(c.reversalCalls.length,0);
 c=context({insufficient:true});row=await c.engine.prepareStripeRefund(c.input());await c.engine.reconcileStripeRefund(row.id);assert.equal(c.state().refunds[0].status,'SUCCEEDED');assert.equal(c.state().refunds[0].recoveryStatus,'REVIEW');assert.equal(c.state().refunds[0].recoveryFailureCode,'INSUFFICIENT_BALANCE');assert.equal(c.state().payment.payoutStatus,'HELD');assert.equal(c.external.length,1);c.options.insufficient=false;await c.engine.reconcileStripeRefund(row.id);assert.equal(c.external.length,1);assert.equal(c.refundCalls.length,1);assert.equal(c.state().payment.payoutStatus,'CANCELLED');
 c=context();row=await c.engine.prepareStripeRefund(c.input());c.state().refunds[0].firstAttemptAt=new Date(Date.now()-24*3600000);await c.engine.reconcileStripeRefund(row.id);assert.equal(c.refundCalls.length,0);assert.equal(c.state().refunds[0].status,'REVIEW');
 c=context();c.external.push({id:'re_external',amount:100,status:'pending'});await assert.rejects(()=>c.engine.prepareStripeRefund(c.input()));assert.equal(c.refundCalls.length,0);
 for(const mutate of [i=>i.livemode=true,i=>i.latest_charge.disputed=true,i=>i.metadata.environment='production',i=>i.amount_received--]){c=context();mutate(c.intent);await assert.rejects(()=>c.engine.prepareStripeRefund(c.input()));assert.equal(c.state().refunds.length,0)}
 c=context();c.state().payment.booking.disputes.push({id:'dispute',bookingId:'booking',status:'OPEN'});row=await c.engine.prepareStripeRefund({...c.input(5500),disputeId:'dispute',resolution:'PARTIAL_REFUND',resolutionNote:'Reviewed synthetic evidence',approvedProceedsPence:2500});assert.equal(c.state().payment.booking.disputes[0].status,'UNDER_REVIEW');await c.engine.reconcileStripeRefund(row.id);assert.equal(c.state().payment.booking.disputes[0].status,'RESOLVED');assert.equal(c.state().payment.payoutStatus,'PAID');
 c=context();row=await c.engine.prepareStripeRefund(c.input(5500));c.transfer.amount_reversed=6000;await c.engine.reconcileStripeRefund(row.id);assert.equal(c.state().refunds[0].recoveryStatus,'REVIEW');assert.equal(c.reversalCalls.length,0);assert.equal(c.state().payment.payoutStatus,'HELD');
 process.env.STRIPE_REFUNDS_ENABLED='false';assert.equal(c.engine.stripeRefundsEnabled(),false);await assert.rejects(()=>c.engine.prepareStripeRefund(c.input()));process.env.STRIPE_REFUNDS_ENABLED='true';process.env.VERCEL_ENV='production';assert.equal(c.engine.stripeRefundsEnabled(),false);process.env.VERCEL_ENV='preview';
 let actor=null,queued=[],prepared=0;
 const refundRoute=loader({'next/server':{NextResponse:{json:Response.json},after:fn=>queued.push(fn)},
  [path.join(root,'src/lib/auth.ts')]:{currentUser:async()=>actor},[path.join(root,'src/lib/prisma.ts')]:{prisma:{bookingPayment:{findUnique:async()=>({provider:'STRIPE'})}}},
  [path.join(root,'src/lib/stripe-refunds.ts')]:{stripeRefundsEnabled:()=>process.env.STRIPE_REFUNDS_ENABLED==='true',prepareStripeRefund:async()=>{prepared++;return{id:'refund',status:'PENDING',recoveryStatus:'PENDING'}},reconcileStripeRefund:async()=>{}},
  [path.join(root,'src/lib/stripe-connect-provider.ts')]:{...provider,connectOrigin:()=> 'https://preview.example'},
 })('src/app/api/admin/payments/refund/route.ts');
 const request=(data,origin='https://preview.example')=>new Request('https://preview.example/api/admin/payments/refund',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify(data)});
 const body={paymentId:'pay',amountPence:100,expectedRefundedPence:0};
 assert.equal((await refundRoute.POST(request(body))).status,403);actor={id:'admin',role:'ADMIN',accountStatus:'SUSPENDED'};assert.equal((await refundRoute.POST(request(body))).status,403);
 actor={id:'admin',role:'ADMIN',accountStatus:'ACTIVE'};assert.equal((await refundRoute.POST(request(body,'https://unrelated.example'))).status,403);assert.equal((await refundRoute.POST(request({paymentId:'pay',amountPence:100}))).status,409);assert.equal(prepared,0);
 const accepted=await refundRoute.POST(request(body));assert.equal(accepted.status,202);assert.equal((await accepted.json()).status,'PENDING');assert.equal(prepared,1);assert.equal(queued.length,1);
 process.env.VERCEL_ENV='production';assert.equal((await refundRoute.POST(request(body))).status,403);process.env.VERCEL_ENV='preview';
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 const Notice=loader({'next/navigation':{useRouter:()=>({refresh(){}})}})('src/components/StripeRefundNotice.tsx').default;
 const markup=row=>renderToStaticMarkup(React.createElement(Notice,{payment:{stripeRefunds:[{amountPence:11000,recoveryAmountPence:7500,...row}]}}));
 assert.match(markup({status:'PENDING',recoveryStatus:'PENDING'}),/Customer refund pending/);assert.doesNotMatch(markup({status:'PENDING',recoveryStatus:'PENDING'}),/Customer refund confirmed/);
 assert.match(markup({status:'SUCCEEDED',recoveryStatus:'REVIEW',recoveryFailureCode:'INSUFFICIENT_BALANCE'}),/customer refund remains confirmed/);
 assert.match(markup({status:'FAILED',recoveryStatus:'PENDING'}),/confirmed refunded balance has not changed/);
 console.log('PASS: active-admin/origin/version/production guards, asynchronous HTTP 202 and pending/failed/recovery UI states');
 console.log('PASS: refund concurrency, response/commit loss, partial/full sequential recovery, fine restoration, pending/failed refunds, insufficient funds, stale attempts, external refunds, canonical ownership, dispute confirmation, over-reversal and environment gates');
})().catch(error=>{console.error(error);process.exitCode=1});
