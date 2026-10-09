// Run only against a disposable local database, never a shared preview/production database.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),swc=require('next/dist/build/swc');
if(!/^postgres(?:ql)?:\/\/[^@]*@(?:localhost|127\.0\.0\.1):/.test(process.env.POSTGRES_PRISMA_URL||''))throw Error('Disposable localhost database required');
let clock='2026-10-07T11:30:00Z';class ClockDate extends Date{constructor(...args){super(...(args.length?args:[clock]))}static now(){return +new Date(clock)}}
const {PrismaClient}=require('@prisma/client');const prisma=new PrismaClient();const root=path.resolve(__dirname,'..'),cache={};let user;
const mocks={'@/lib/auth':{currentUser:async()=>user},'next/server':{NextResponse:{json:(v,o)=>Response.json(v,o)},after:()=>{}},'@/lib/notifications':{createNotificationSafely:async()=>{}},'@/lib/email':{sendTransactionalEmailSafely:async()=>{}}};
function load(file){file=path.resolve(root,file);if(cache[file])return cache[file];const out={};cache[file]=out;const code=swc.transformSync(fs.readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript'},target:'es2022'},module:{type:'commonjs'}}).code;new Function('exports','require','Date',code)(out,id=>{if(id==='./booking-authorisation-provider')return provider;if(id in mocks)return mocks[id];if(id==='./prisma'||id==='@/lib/prisma')return {prisma};if(id.startsWith('@/'))return load('src/'+id.slice(2)+'.ts');if(id.startsWith('.'))return load(path.resolve(path.dirname(file),id+'.ts'));return require(id)},ClockDate);return out;}

let mode='TEST',failure=false,ambiguous=false;
const intents=new Map(),sessions=new Map();let captures=0,cancels=0,refunds=0;
const provider={paymentEnvironment:()=>process.env.VERCEL_ENV||'development',authorisationProvider:()=>{if(process.env.VERCEL_ENV==='production')throw Error('disabled in production');return mode},checkoutOrigin:()=> 'http://localhost:3000',stripeRequest:async(path,body,key)=>{
 if(path==='checkout/sessions'){
  let s=[...sessions.values()].find(s=>s.key===key);if(s)return s;
  s={id:'cs_'+sessions.size,key,status:'open',url:'https://checkout.stripe.com/test',payment_intent:null,body};sessions.set(s.id,s);return s;
 }
 const parts=path.split('/');
 if(parts[0]==='checkout') {const s=sessions.get(parts[2]);if(parts[3]==='expire')s.status='expired';return structuredClone(s);}
 if(path==='refunds'){refunds++;return {id:'re_test'};}
 const pi=intents.get(parts[1].split('?')[0]);if(!pi)throw Error('Missing mock intent');
 if(parts[2]==='capture'){captures++;if(failure){pi.status='requires_payment_method';throw Error('card declined')}pi.status='succeeded';pi.amount_received=pi.amount;if(ambiguous)throw Error('connection lost after capture');}
 if(parts[2]==='cancel'){cancels++;pi.status='canceled';}
 return structuredClone(pi);
}};
function completeCheckout(id){const s=sessions.get(id),body=s.body;const pi={id:'pi_'+id,status:'requires_capture',capture_method:'manual',amount:Number(body['line_items[0][price_data][unit_amount]']),currency:'gbp',livemode:false,metadata:{availabilityRequestId:body['metadata[availabilityRequestId]'],environment:'preview'},latest_charge:{payment_method_details:{card:{capture_before:+new Date(clock)/1000+7*86400}}}};pi.amount_capturable=pi.amount;intents.set(pi.id,pi);s.status='complete';s.payment_intent=pi.id;return pi;}
const flow={...load('src/lib/availability.ts'),...load('src/lib/booking-authorisation.ts')};let count=0;const ok=(v,m)=>{assert(v,m);count++};const reject=async(fn,pattern)=>{await assert.rejects(fn,pattern);count++};
async function fixture(){const job=await prisma.transportJob.create({data:{customerId:'test-c',collection:'18 Station Road, Reading, RG1 1JX',delivery:'42 High Street, Oxford, OX1 4AP',vehicleMake:'Mercedes-Benz',vehicleModel:'C-Class',collectionDate:new Date('2026-10-07T12:00Z'),collectionFrom:'14:00',collectionUntil:'18:00',status:'QUOTED'}});const q=await prisma.quote.create({data:{jobId:job.id,transporterId:'test-t',pricePence:14500}});const q2=await prisma.quote.create({data:{jobId:job.id,transporterId:'test-t2',pricePence:15000}});return {job,q,q2};}
(async()=>{
 for(const [id,role] of [['test-c','CUSTOMER'],['test-other','CUSTOMER'],['test-t','TRANSPORTER'],['test-t2','TRANSPORTER']]){await prisma.user.upsert({where:{id},update:{},create:{id,email:id+'@example.invalid',name:id,role,passwordHash:'unused',accountStatus:'ACTIVE'}});if(role==='TRANSPORTER'){const v=await prisma.transporterVerification.upsert({where:{transporterId:id},update:{status:'APPROVED'},create:{transporterId:id,businessName:'Oakway Test Transport',businessAddress:'Test address',phone:'07000000000',status:'APPROVED'}});await prisma.verificationDocument.create({data:{verificationId:v.id,uploaderId:id,type:'INSURANCE',documentUrl:'test-only',status:'APPROVED',expiresAt:new Date('2028-01-01')}});}}
 const c={id:'test-c',role:'CUSTOMER',accountStatus:'ACTIVE'},t={id:'test-t',role:'TRANSPORTER',accountStatus:'ACTIVE'};

 const fresh=async()=>{clock='2026-10-07T11:30:00Z';const f=await fixture();return {...f,request:(await flow.selectQuote(c,f.q.id)).request};};
 let f=await fresh();ok(f.request.status==='AWAITING_AUTHORISATION');ok(await prisma.booking.count({where:{jobId:f.job.id}})===0);
 await reject(()=>flow.respondToRequest(t,f.request.id,'CONFIRM'),/authorised/);
 await reject(()=>flow.authoriseRequest({...c,id:'test-other'},f.request.id),/not found/);
 await flow.authoriseRequest(c,f.request.id);
 ok((await prisma.availabilityRequest.findUnique({where:{id:f.request.id}})).status==='AWAITING_TRANSPORTER');
 const result=await flow.respondToRequest(t,f.request.id,'CONFIRM');ok(result.request.status==='BOOKED');
 const b=await prisma.booking.findUnique({where:{id:result.request.bookingId},include:{payment:true}});ok(b.payment.status==='PAID');ok(b.payment.paidPence===15950);ok(b.payment.transporterProceedsPence===14500);
 const repeat=await flow.respondToRequest(t,f.request.id,'CONFIRM');ok(repeat.request.bookingId===b.id);ok(await prisma.financeEvent.count({where:{paymentId:b.payment.id}})===1);
 await prisma.booking.update({where:{id:b.id},data:{status:'IN_TRANSIT'}});await flow.respondToRequest(t,f.request.id,'CONFIRM');ok((await prisma.booking.findUnique({where:{id:b.id}})).status==='IN_TRANSIT');
 f=await fresh();await flow.authoriseRequest(c,f.request.id);await flow.respondToRequest(t,f.request.id,'DECLINE');ok(await prisma.booking.count({where:{jobId:f.job.id}})===0);ok(await prisma.transporterCancellationFee.count()===0);
 f=await fresh();await flow.authoriseRequest(c,f.request.id);clock='2026-10-07T12:30:00Z';ok((await flow.respondToRequest(t,f.request.id,'CONFIRM')).request.status==='EXPIRED');
 f=await fresh();await flow.authoriseRequest(c,f.request.id);const both=await Promise.all([flow.respondToRequest(t,f.request.id,'CONFIRM'),flow.respondToRequest(t,f.request.id,'CONFIRM')]);ok(both[0].request.bookingId===both[1].request.bookingId);ok(await prisma.booking.count({where:{jobId:f.job.id}})===1);
 // Mock Stripe contract backed by real isolated Postgres; no real card operations.
 mode='STRIPE';f=await fresh();const start=await flow.authoriseRequest(c,f.request.id);ok(start.checkoutUrl.startsWith('https://checkout.stripe.com/'));ok(start.request.status==='AWAITING_AUTHORISATION');const again=await flow.authoriseRequest(c,f.request.id);ok(again.request.checkoutSessionId===start.request.checkoutSessionId);
 await reject(()=>flow.respondToRequest({...t,id:'test-t2'},f.request.id,'CONFIRM'),/not found/);
 let pi=completeCheckout(start.request.checkoutSessionId);await flow.reconcileRequest(f.request.id);ok((await prisma.availabilityRequest.findUnique({where:{id:f.request.id}})).paymentState==='AUTHORISED');
 ambiguous=true;const booked=await flow.respondToRequest(t,f.request.id,'CONFIRM');ambiguous=false;ok(booked.request.status==='BOOKED');ok(captures===1);await flow.reconcileRequest(f.request.id);ok(captures===1);ok(await prisma.booking.count({where:{jobId:f.job.id}})===1);
 f=await fresh();let auth=await flow.authoriseRequest(c,f.request.id);pi=completeCheckout(auth.request.checkoutSessionId);await flow.reconcileRequest(f.request.id);await flow.respondToRequest(c,f.request.id,'WITHDRAW');ok(pi.status==='canceled');ok((await prisma.availabilityRequest.findUnique({where:{id:f.request.id}})).paymentState==='RELEASED');ok(await prisma.booking.count({where:{jobId:f.job.id}})===0);
 // Capture succeeded but booking transaction failed: retry must finalise without a second charge.
 f=await fresh();auth=await flow.authoriseRequest(c,f.request.id);pi=completeCheckout(auth.request.checkoutSessionId);await flow.reconcileRequest(f.request.id);
 await prisma.$executeRawUnsafe(`ALTER TABLE "Booking" ADD CONSTRAINT simulate_capture_failure CHECK (status <> 'CONFIRMED') NOT VALID`);
 await reject(()=>flow.respondToRequest(t,f.request.id,'CONFIRM'),/simulate_capture_failure/);await prisma.$executeRawUnsafe('ALTER TABLE "Booking" DROP CONSTRAINT simulate_capture_failure');
 ok((await prisma.availabilityRequest.findUnique({where:{id:f.request.id}})).status==='CAPTURING');
 await reject(()=>flow.respondToRequest(c,f.request.id,'WITHDRAW'),/being processed/);
 const beforeRecovery=captures;const recovered=await flow.reconcileRequest(f.request.id);ok(recovered.status==='BOOKED');ok(captures===beforeRecovery);
 // Failed capture creates no booking/fine and releases the reservation.
 f=await fresh();auth=await flow.authoriseRequest(c,f.request.id);pi=completeCheckout(auth.request.checkoutSessionId);await flow.reconcileRequest(f.request.id);failure=true;const failed=await flow.respondToRequest(t,f.request.id,'CONFIRM');failure=false;ok(failed.request.status==='PAYMENT_FAILED');ok(failed.request.activeJobId===null);ok(await prisma.booking.count({where:{jobId:f.job.id}})===0);
 // Abandoned checkout expires and cannot be used after withdrawal.
 f=await fresh();auth=await flow.authoriseRequest(c,f.request.id);await flow.respondToRequest(c,f.request.id,'WITHDRAW');ok(sessions.get(auth.request.checkoutSessionId).status==='expired');
 // Late authorisation is cancelled instead of re-opening an expired request.
 f=await fresh();auth=await flow.authoriseRequest(c,f.request.id);clock='2026-10-07T12:30:00Z';pi=completeCheckout(auth.request.checkoutSessionId);await flow.reconcileRequest(f.request.id);ok(pi.status==='canceled');ok((await prisma.availabilityRequest.findUnique({where:{id:f.request.id}})).status==='EXPIRED');
 // Unexpected capture without transporter confirmation gets a compensating refund.
 f=await fresh();auth=await flow.authoriseRequest(c,f.request.id);pi=completeCheckout(auth.request.checkoutSessionId);pi.status='succeeded';await flow.reconcileRequest(f.request.id);ok(refunds===1);ok(await prisma.booking.count({where:{jobId:f.job.id}})===0);
 // Amount mismatch cannot create or authorise a booking.
 f=await fresh();auth=await flow.authoriseRequest(c,f.request.id);pi=completeCheckout(auth.request.checkoutSessionId);pi.amount++;await reject(()=>flow.reconcileRequest(f.request.id),/does not match/);ok(await prisma.booking.count({where:{jobId:f.job.id}})===0);
 // Legacy unbacked requests never become paid bookings.
 f=await fresh();await prisma.availabilityRequest.update({where:{id:f.request.id},data:{paymentProvider:null,paymentState:null,status:'AWAITING_TRANSPORTER'}});await reject(()=>flow.respondToRequest(t,f.request.id,'CONFIRM'),/authorised/);
 process.env.VERCEL_ENV='production';await reject(async()=>flow.selectQuote(c,(await fixture()).q.id),/disabled in production/);process.env.VERCEL_ENV='preview';
 console.log(`PASS: ${count} authorisation flow checks, TEST + Stripe contract, ownership, retries, parallel confirmation, expired/failed payments, holds, amount verification and no premature bookings.`);
})().finally(()=>prisma.$disconnect()).catch(e=>{console.error(e);process.exitCode=1});
