const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), swc = require('next/dist/build/swc');
const root = path.resolve(__dirname, '..'), clone = structuredClone;
process.env.VERCEL_ENV = 'preview'; process.env.STRIPE_CONNECT_ENABLED = 'true'; process.env.STRIPE_REFUNDS_ENABLED = 'false';
process.env.STRIPE_CHECKOUT_ORIGIN = 'https://preview.example.test';
function loader(mocks = {}) {
  const cache = {};
  function load(file) {
    file = path.resolve(root, file); if (mocks[file]) return mocks[file]; if (cache[file]) return cache[file];
    const exports = cache[file] = {}, code = swc.transformSync(fs.readFileSync(file, 'utf8'), {
      filename: file, jsc: {parser: {syntax: 'typescript', tsx: file.endsWith('.tsx')}, target: 'es2022', transform: {react: {runtime: 'automatic'}}}, module: {type: 'commonjs'},
    }).code;
    new Function('exports','require',code)(exports, name => name.startsWith('.') || name.startsWith('@/') ?
      load((name.startsWith('@/') ? path.join(root,'src',name.slice(2)) : path.resolve(path.dirname(file),name)) + '.ts') : mocks[name] || require(name));
    return exports;
  }
  return load;
}
const provider = loader()('src/lib/stripe-connect-provider.ts');
const policy = loader()('src/lib/alternative-refund-policy.ts');
const failedId = '00000000-0000-4000-8000-000000000001', requestId = '00000000-0000-4000-8000-000000000002';
const today = new Date().toISOString().slice(0,10), createdAt = new Date(Date.now() - 86400000);
const validFile = () => new File(['%PDF-1.7\nSYNTHETIC UNIT TEST EVIDENCE - NO PAYMENT'], 'synthetic.pdf', {type: 'application/pdf'});
function context(options = {}) {
  let state = {
    payment: {id:'payment', bookingId:'booking', provider:'STRIPE', currency:'GBP', providerReference:'pi_test', status:'PAID', payoutStatus:'HELD',
      paidPence:11000, refundedPence:0, platformFeePence:1000, transporterProceedsPence:10000, cancellationDeductionPence:0,
      booking:{id:'booking',customerId:'customer',transporterId:'transporter',disputes:[]},stripePayout:null},
    refund: {id:failedId,paymentId:'payment',activePaymentId:'payment',environment:'preview',paymentIntentId:'pi_test',sourceChargeId:'ch_test',
      paidPence:11000,amountPence:11000,priorRefundedPence:0,priorPlatformFeePence:1000,priorProceedsPence:10000,priorDeductionPence:0,
      priorPayoutStatus:'NOT_READY',fineRestorePence:0,payoutId:null,stripeTransferId:null,stripeReversalId:null,requiredReversedPence:0,
      baselineReversedPence:0,recoveryAmountPence:0,status:'FAILED',recoveryStatus:'NOT_REQUIRED',recoveryFailureCode:null,
      stripeRefundId:'re_test',ledgerAppliedAt:createdAt,failureCode:'STRIPE_REFUND_FAILED_AFTER_SUCCESS',createdAt,
      leaseUntil:null,leaseToken:null,retryAfter:null,disputeId:null,attemptCount:1},
    alternatives:[], events:[], notifications:[], actor:{role:'ADMIN',accountStatus:'ACTIVE'},
  };
  const input = {id:requestId,paymentId:'payment',failedRefundId:failedId,amountPence:11000,expectedRefundedPence:0,
    method:'BANK_TRANSFER',reference:'SYNTHETIC-REF-001',settledOn:today,note:'No real payment. Unit test only.',confirmed:true};
  const request = {id:'request',bookingId:'booking',paymentProvider:'STRIPE',paymentEnvironment:'preview',status:'BOOKED',authorisedAmountPence:11000,paymentIntentId:'pi_test'};
  const intent = {id:'pi_test',livemode:false,capture_method:'manual',status:'succeeded',currency:'gbp',amount:11000,amount_received:11000,
    metadata:{availabilityRequestId:'request',environment:'preview'},latest_charge:{id:'ch_test',payment_intent:'pi_test',livemode:false,paid:true,captured:true,disputed:false,currency:'gbp',amount:11000,amount_refunded:0}};
  const external = [{id:'re_test',amount:11000,currency:'gbp',status:'failed',charge:'ch_test',payment_intent:'pi_test',metadata:{driveDropRefundId:failedId,paymentId:'payment',environment:'preview'}}];
  const transfers = [], reads = [];
  const select = (row, fields) => !row ? null : fields ? Object.fromEntries(Object.keys(fields).filter(k=>fields[k]).map(k=>[k,clone(row[k])])) : clone(row);
  const db = {
    user:{findUnique:async()=>clone(state.actor)},
    $queryRaw:async()=>[], $executeRaw:async(_, ...values)=>{state.notifications.push(values);return 1},
    bookingPayment:{findUnique:async()=>({bookingId:'booking'}),findUniqueOrThrow:async()=>({...clone(state.payment),stripeRefunds:[clone(state.refund)],alternativeRefund:clone(state.alternatives[0]||null)}),update:async({data})=>Object.assign(state.payment,data)},
    availabilityRequest:{findFirst:async()=>clone(request)},
    stripeRefund:{update:async({data})=>Object.assign(state.refund,data)},
    alternativeRefund:{
      findUnique:async({where,select:fields})=>select(state.alternatives.find(a => where.paymentId ? a.paymentId === where.paymentId :
        where.environment_referenceHash ? a.referenceHash === where.environment_referenceHash.referenceHash && a.environment === where.environment_referenceHash.environment :
        where.environment_evidenceSha256 ? a.evidenceSha256 === where.environment_evidenceSha256.evidenceSha256 && a.environment === where.environment_evidenceSha256.environment : a.id === where.id),fields),
      create:async({data,select:fields})=>{assert(!state.alternatives.some(a=>a.paymentId===data.paymentId));const record={...clone(data),createdAt:new Date()};state.alternatives.push(record);return select(record,fields)},
    },
    financeEvent:{create:async({data})=>{if(options.failLedger)throw Error('synthetic DB failure');state.events.push(clone(data));return data}},
  };
  let tail=Promise.resolve();
  db.$transaction=async fn=>{let unlock;const prior=tail;tail=new Promise(resolve=>unlock=resolve);await prior;const saved=clone(state);let result;
    try{result=await fn(db)}catch(e){state=saved;unlock();throw e}unlock();
    if(options.lostResponse){options.lostResponse=false;throw Error('synthetic reply lost after commit')}return result;};
  const stripe={
    paymentIntents:{retrieve:async()=>{reads.push('intent');if(options.stale && reads.filter(x=>x==='intent').length===2)intent.latest_charge.amount_refunded=1;return clone(intent)}},
    refunds:{list:async()=>{reads.push('refund-list');return {data:clone(external),has_more:!!options.incomplete}},retrieve:async()=>{reads.push('refund-get');return clone(external[0])},create:()=>{throw Error('Money movement forbidden')}},
    transfers:{list:async()=>{reads.push('transfers');return {data:clone(transfers),has_more:false}},create:()=>{throw Error('Money movement forbidden')}},
  };
  const load=loader({[path.join(root,'src/lib/prisma.ts')]:{prisma:db},[path.join(root,'src/lib/stripe-connect-provider.ts')]:{...provider,verifiedConnectClient:async()=>stripe}});
  return {engine:load('src/lib/alternative-refunds.ts'),input,db,load,state:()=>state,intent,external,transfers,reads,options};
}
(async()=>{
  let c=context(), originalRefund=clone(c.state().refund);
  const beforePreflight=clone(c.state());
  assert.equal((await c.engine.reviewAlternativeRefund(c.input,'admin')).eligible,true);
  assert.deepEqual(c.state(),beforePreflight,'preflight must not write any state');
  c.intent.latest_charge.disputed=true;
  await assert.rejects(()=>c.engine.reviewAlternativeRefund(c.input,'admin'));
  assert.deepEqual(c.state(),beforePreflight);c.intent.latest_charge.disputed=false;
  const outcomes=await Promise.all([c.engine.recordAlternativeRefund(c.input,validFile(),'admin'),c.engine.recordAlternativeRefund(c.input,validFile(),'admin')]);
  assert.deepEqual(outcomes.map(x=>x.replayed).sort(),[false,true]);
  assert.equal(c.state().alternatives.length,1);assert.equal(c.state().events.length,1);assert.equal(c.state().notifications.length,2);
  assert.deepEqual([c.state().payment.refundedPence,c.state().payment.platformFeePence,c.state().payment.transporterProceedsPence,c.state().payment.status,c.state().payment.payoutStatus],[11000,0,0,'REFUNDED','CANCELLED']);
  assert.deepEqual(c.state().refund,{...originalRefund,activePaymentId:null});
  assert(!('evidenceBytes' in outcomes[0].record));assert(!('reference' in outcomes[0].record));
  assert.equal(policy.stripeRefundedTotal({...c.state().payment,alternativeRefund:c.state().alternatives[0]}),0);
  for(const change of [{id:'00000000-0000-4000-8000-000000000003'},{reference:'different'},{note:'changed'}])
    await assert.rejects(()=>c.engine.recordAlternativeRefund({...c.input,...change},validFile(),'admin'));
  c=context({lostResponse:true});await assert.rejects(()=>c.engine.recordAlternativeRefund(c.input,validFile(),'admin'));
  assert.equal((await c.engine.recordAlternativeRefund(c.input,validFile(),'admin')).replayed,true);assert.equal(c.state().events.length,1);
  c=context({failLedger:true});await assert.rejects(()=>c.engine.recordAlternativeRefund(c.input,validFile(),'admin'));
  assert.equal(c.state().alternatives.length,0);assert.equal(c.state().payment.refundedPence,0);assert.equal(c.state().refund.activePaymentId,'payment');assert.equal(c.state().notifications.length,0);
  for(const change of [{amountPence:5500},{amountPence:0},{amountPence:11001},{amountPence:NaN},{expectedRefundedPence:1},{confirmed:false},{method:'CASH_SENT_LATER'},
    {settledOn:'2099-01-01'},{settledOn:'2026-02-30'},{settledOn:'2020-01-01'},{reference:'---'},{reference:'x'},{reference:'bank\nsecret'},{note:'x'.repeat(1001)}]){
    c=context();await assert.rejects(()=>c.engine.recordAlternativeRefund({...c.input,...change},validFile(),'admin'));assert.equal(c.state().events.length,0);
  }
  for(const mutate of [s=>s.payment.refundedPence=1,s=>s.payment.payoutStatus='READY',s=>s.payment.platformFeePence++,s=>s.payment.stripePayout={status:'TRANSFERRED'},
    s=>s.payment.cancellationDeductionPence=1,s=>s.payment.provider='TEST',s=>s.payment.currency='USD',s=>s.payment.status='PARTIALLY_REFUNDED',
    s=>s.payment.booking.disputes.push({status:'OPEN'}),s=>s.payment.booking.disputes.push({status:'RESOLVED'}),s=>s.refund.priorPayoutStatus='HELD',
    s=>s.refund.failureCode='LATE_REFUND_FAILURE_REVIEW',s=>s.refund.leaseToken='worker',s=>s.refund.retryAfter=new Date(),s=>s.refund.recoveryStatus='REVIEW',
    s=>s.refund.amountPence=5500,s=>s.refund.priorDeductionPence=1,s=>s.refund.environment='production',s=>s.refund.activePaymentId=null,
    s=>s.actor.role='CUSTOMER',s=>s.actor.accountStatus='SUSPENDED']){
    c=context();mutate(c.state());await assert.rejects(()=>c.engine.recordAlternativeRefund(c.input,validFile(),'admin'));assert.equal(c.state().alternatives.length,0);
  }
  for(const mutate of [c=>c.intent.livemode=true,c=>c.intent.latest_charge.disputed=true,c=>c.intent.latest_charge.amount_refunded=100,
    c=>c.intent.metadata.environment='production',c=>c.external[0].status='pending',c=>c.external[0].status='succeeded',c=>c.external[0].metadata.paymentId='other',
    c=>c.external.push({...c.external[0],id:'re_external'}),c=>c.transfers.push({id:'tr_test',livemode:false,source_transaction:'ch_test'}),
    c=>c.transfers.push({id:'tr_test',livemode:false,metadata:{paymentId:'payment'}})]){
    c=context();mutate(c);await assert.rejects(()=>c.engine.recordAlternativeRefund(c.input,validFile(),'admin'));assert.equal(c.state().events.length,0);
  }
  for(const opt of [{stale:true},{incomplete:true}]){c=context(opt);await assert.rejects(()=>c.engine.recordAlternativeRefund(c.input,validFile(),'admin'));assert.equal(c.state().alternatives.length,0)}
  for(const file of [new File(['bad'],'fake.pdf',{type:'application/pdf'}),new File([],'empty.png',{type:'image/png'}),new File(['<svg/>'],'x.svg',{type:'image/svg+xml'}),new File([new Uint8Array(3*1024*1024+1)],'large.pdf',{type:'application/pdf'})]){
    c=context();await assert.rejects(()=>c.engine.recordAlternativeRefund(c.input,file,'admin'));assert.equal(c.reads.length,0);
  }
  c=context();c.state().alternatives.push({id:'other',paymentId:'other-payment',environment:'preview',referenceHash:require('node:crypto').createHash('sha256').update('SYNTHETICREF001').digest('hex')});
  // Restrict the related-payment mock to its actual relation for this reference test.
  c.db.bookingPayment.findUniqueOrThrow=async()=>({...clone(c.state().payment),stripeRefunds:[clone(c.state().refund)],alternativeRefund:null});
  await assert.rejects(()=>c.engine.recordAlternativeRefund(c.input,validFile(),'admin'));assert.equal(c.state().events.length,0);
  c=context();c.state().alternatives.push({id:'other',paymentId:'other-payment',environment:'preview',referenceHash:'different',evidenceSha256:require('node:crypto').createHash('sha256').update(new Uint8Array(await validFile().arrayBuffer())).digest('hex')});
  c.db.bookingPayment.findUniqueOrThrow=async()=>({...clone(c.state().payment),stripeRefunds:[clone(c.state().refund)],alternativeRefund:null});
  await assert.rejects(()=>c.engine.recordAlternativeRefund(c.input,validFile(),'admin'));assert.equal(c.state().events.length,0);
  process.env.VERCEL_ENV='production';c=context();await assert.rejects(()=>c.engine.recordAlternativeRefund(c.input,validFile(),'admin'));assert.equal(c.reads.length,0);process.env.VERCEL_ENV='preview';
  console.log('PASS: alternative repayment atomic ledger/evidence, immutable failed audit, duplicate/concurrent submissions, lost replies/rollback, full-only restrictions, private summaries, file/date/reference validation and production/canonical/race guards');

  let user={id:'admin',role:'ADMIN',accountStatus:'ACTIVE'}, calls=0;
  const load=loader({[path.join(root,'src/lib/auth.ts')]:{currentUser:async()=>user},
    [path.join(root,'src/lib/alternative-refunds.ts')]:{alternativeRefundsEnabled:()=>process.env.VERCEL_ENV==='preview',alternativeRefundEvidenceEnabled:()=>process.env.VERCEL_ENV==='preview',recordAlternativeRefund:async()=>{calls++;return {record:{id:requestId},replayed:false}},reviewAlternativeRefund:async()=>({eligible:true})},
    [path.join(root,'src/lib/prisma.ts')]:{prisma:{alternativeRefund:{findUnique:async()=>({environment:'preview',evidenceName:'synthetic.pdf',evidenceType:'application/pdf',evidenceBytes:new Uint8Array([37,80,68,70])})}}},
  });
  const route=load('src/app/api/admin/payments/alternative-refund/route.ts'), download=load('src/app/api/admin/payments/alternative-refund/[id]/evidence/route.ts');
  const preflight=load('src/app/api/admin/payments/alternative-refund/review/route.ts');
  function request(origin='https://preview.example.test') {const form=new FormData();form.set('details',JSON.stringify(context().input));form.set('evidence',validFile());return new Request('https://preview.example.test/api/admin/payments/alternative-refund',{method:'POST',headers:origin?{origin}:{},body:form})}
  for(const actor of [null,{id:'customer',role:'CUSTOMER',accountStatus:'ACTIVE'},{id:'admin',role:'ADMIN',accountStatus:'SUSPENDED'}]){
    user=actor;assert.equal((await route.POST(request())).status,403);assert.equal((await download.GET(new Request('https://preview.example.test'),{params:Promise.resolve({id:requestId})})).status,403);
    assert.equal((await preflight.GET(new Request('https://preview.example.test'))).status,403);
  }
  assert.equal(calls,0);user={id:'admin',role:'ADMIN',accountStatus:'ACTIVE'};
  assert.equal((await preflight.GET(new Request('https://preview.example.test',{headers:{'sec-fetch-site':'cross-site'}}))).status,403);
  const preflightResult=await preflight.GET(new Request('https://preview.example.test'));
  assert.equal(preflightResult.status,200);assert.equal(preflightResult.headers.get('cache-control'),'private, no-store');assert.equal(calls,0);
  for(const origin of ['', 'https://evil.example.test'])assert.equal((await route.POST(request(origin))).status,403);
  assert.equal(calls,0);assert.equal((await route.POST(request())).status,201);assert.equal(calls,1);
  const evidence=await download.GET(new Request('https://preview.example.test'),{params:Promise.resolve({id:requestId})});
  assert.equal(evidence.status,200);assert.equal(evidence.headers.get('cache-control'),'private, no-store');assert.match(evidence.headers.get('content-disposition'),/^attachment/);assert.equal(evidence.headers.get('x-content-type-options'),'nosniff');
  process.env.VERCEL_ENV='production';assert.equal((await route.POST(request())).status,403);assert.equal(calls,1);process.env.VERCEL_ENV='preview';
  console.log('PASS: admin-only recording/download, suspended/non-admin rejection, strict missing/foreign Origin rejection, private no-store attachment and production guard');
})().catch(error=>{console.error(error);process.exitCode=1});
