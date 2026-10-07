// Run only against a disposable local database, never a shared preview/production database.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),swc=require('next/dist/build/swc');
if(!/^postgres(?:ql)?:\/\/[^@]*@(?:localhost|127\.0\.0\.1):/.test(process.env.POSTGRES_PRISMA_URL||''))throw Error('Disposable localhost database required');
let clock='2026-10-07T11:30:00Z';class ClockDate extends Date{constructor(...args){super(...(args.length?args:[clock]))}static now(){return +new Date(clock)}}
const {PrismaClient}=require('@prisma/client');const prisma=new PrismaClient();const root=path.resolve(__dirname,'..'),cache={};let user;
const mocks={'@/lib/auth':{currentUser:async()=>user},'next/server':{NextResponse:{json:(v,o)=>Response.json(v,o)},after:()=>{}},'@/lib/notifications':{createNotificationSafely:async()=>{}},'@/lib/email':{sendTransactionalEmailSafely:async()=>{}}};
function load(file){file=path.resolve(root,file);if(cache[file])return cache[file];const out={};cache[file]=out;const code=swc.transformSync(fs.readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript'},target:'es2022'},module:{type:'commonjs'}}).code;new Function('exports','require','Date',code)(out,id=>{if(id in mocks)return mocks[id];if(id==='./prisma'||id==='@/lib/prisma')return {prisma};if(id.startsWith('@/'))return load('src/'+id.slice(2)+'.ts');if(id.startsWith('.'))return load(path.resolve(path.dirname(file),id+'.ts'));return require(id)},ClockDate);return out;}
const flow=load('src/lib/availability.ts');let count=0;const ok=(v,m)=>{assert(v,m);count++};const reject=async(fn,pattern)=>{await assert.rejects(fn,pattern);count++};
async function fixture(){const job=await prisma.transportJob.create({data:{customerId:'test-c',collection:'18 Station Road, Reading, RG1 1JX',delivery:'42 High Street, Oxford, OX1 4AP',vehicleMake:'Mercedes-Benz',vehicleModel:'C-Class',collectionDate:new Date('2026-10-07T12:00Z'),collectionFrom:'14:00',collectionUntil:'18:00',status:'QUOTED'}});const q=await prisma.quote.create({data:{jobId:job.id,transporterId:'test-t',pricePence:14500}});const q2=await prisma.quote.create({data:{jobId:job.id,transporterId:'test-t2',pricePence:15000}});return {job,q,q2};}
(async()=>{
 for(const [id,role] of [['test-c','CUSTOMER'],['test-other','CUSTOMER'],['test-t','TRANSPORTER'],['test-t2','TRANSPORTER']]){await prisma.user.upsert({where:{id},update:{},create:{id,email:id+'@example.invalid',name:id,role,passwordHash:'unused',accountStatus:'ACTIVE'}});if(role==='TRANSPORTER'){const v=await prisma.transporterVerification.upsert({where:{transporterId:id},update:{status:'APPROVED'},create:{transporterId:id,businessName:'Oakway Test Transport',businessAddress:'Test address',phone:'07000000000',status:'APPROVED'}});await prisma.verificationDocument.create({data:{verificationId:v.id,uploaderId:id,type:'INSURANCE',documentUrl:'test-only',status:'APPROVED',expiresAt:new Date('2028-01-01')}});}}
 const c={id:'test-c',role:'CUSTOMER',accountStatus:'ACTIVE'},t={id:'test-t',role:'TRANSPORTER',accountStatus:'ACTIVE'};
 let {job,q,q2}=await fixture();
 await reject(()=>flow.selectQuote({...c,id:'test-other'},q.id),/not found/);
 const selected=await flow.selectQuote(c,q.id);ok(selected.request.status==='AWAITING_TRANSPORTER');ok(await prisma.booking.count({where:{jobId:job.id}})===0);ok(await prisma.transporterCancellationFee.count()===0);
 const again=await flow.selectQuote(c,q.id);ok(again.request.id===selected.request.id&&!again.created);
 await reject(()=>flow.selectQuote(c,q2.id),/already have/);
 await reject(()=>flow.respondToRequest({...t,id:'test-t2'},selected.request.id,'CONFIRM'),/not found/);
 await reject(()=>flow.payConfirmedRequest(c,selected.request.id),/not been confirmed/);
 await reject(()=>prisma.$transaction(tx=>flow.assertNoReservation(tx,job.id)),/current confirmation/);
 await flow.respondToRequest(t,selected.request.id,'DECLINE');ok(await prisma.transporterCancellationFee.count()===0);ok((await prisma.quote.findUnique({where:{id:q2.id}})).status==='PENDING');
 const fresh=await flow.selectQuote(c,q.id);clock='2026-10-07T11:45:00Z';
 const confirmed=await flow.respondToRequest(t,fresh.request.id,'CONFIRM',60);ok(confirmed.request.status==='AWAITING_PAYMENT');ok(confirmed.request.payBy.toISOString()==='2026-10-07T12:15:00.000Z');
 const paid=await flow.payConfirmedRequest(c,fresh.request.id);ok(paid.booking.status==='CONFIRMED');ok(paid.booking.payment.status==='PAID');ok(paid.booking.payment.transportValuePence===15950);ok(paid.booking.payment.transporterProceedsPence===14500);
 const duplicate=await flow.payConfirmedRequest(c,fresh.request.id);ok(!duplicate.created&&duplicate.booking.id===paid.booking.id);ok(await prisma.financeEvent.count({where:{paymentId:paid.booking.payment.id}})===1);
 await prisma.booking.update({where:{id:paid.booking.id},data:{status:'IN_TRANSIT'}});ok((await flow.payConfirmedRequest(c,fresh.request.id)).booking.status==='IN_TRANSIT');
 await reject(()=>flow.payConfirmedRequest({...c,id:'test-other'},fresh.request.id),/not found/);
 // Expired response: no booking, payment or cancellation fine, and history remains.
 clock='2026-10-07T11:30:00Z';({job,q}=await fixture());const timeout=await flow.selectQuote(c,q.id);clock='2026-10-07T12:30:00Z';ok((await flow.respondToRequest(t,timeout.request.id,'CONFIRM')).request.status==='EXPIRED');ok(await prisma.booking.count({where:{jobId:job.id}})===0);
 // Late payment, including exact deadline, cannot activate a delivery.
 clock='2026-10-07T11:30:00Z';({job,q}=await fixture());const late=await flow.selectQuote(c,q.id);await flow.respondToRequest(t,late.request.id,'CONFIRM',30);clock='2026-10-07T12:00:00Z';await reject(()=>flow.payConfirmedRequest(c,late.request.id),/expired/);ok(await prisma.booking.count({where:{jobId:job.id}})===0);
 const retry=await flow.selectQuote(c,q.id);ok(retry.request.id!==late.request.id);ok((await prisma.availabilityRequest.findUnique({where:{id:late.request.id}})).status==='EXPIRED');
 // Expired offer cannot be selected, even when job is still valid.
 await flow.respondToRequest(c,retry.request.id,'WITHDRAW');await prisma.quote.update({where:{id:q.id},data:{expiresAt:new Date(clock)}});await reject(()=>flow.selectQuote(c,q.id),/expired/);
 // Production test capture is always disabled.
 process.env.VERCEL_ENV='production';await reject(()=>flow.payConfirmedRequest(c,fresh.request.id),/disabled in production/);process.env.VERCEL_ENV='preview';
 // Parallel click requests share the same job lock and idempotent result.
 clock='2026-10-07T11:30:00Z';({job,q}=await fixture());const parallel=await Promise.all([flow.selectQuote(c,q.id),flow.selectQuote(c,q.id)]);ok(parallel[0].request.id===parallel[1].request.id);await flow.respondToRequest(t,parallel[0].request.id,'CONFIRM');const captures=await Promise.all([flow.payConfirmedRequest(c,parallel[0].request.id),flow.payConfirmedRequest(c,parallel[0].request.id)]);ok(captures[0].booking.id===captures[1].booking.id);ok(await prisma.booking.count({where:{jobId:job.id}})===1);
 // Cancellation fee route applies only to an active, fully-paid booking.
 user=t;const status=load('src/app/api/bookings/status/route.ts');const cancel=await status.PATCH(new Request('http://localhost/api/bookings/status',{method:'PATCH',body:JSON.stringify({bookingId:captures[0].booking.id,status:'CANCELLED',note:'Test cancellation'})}));ok(cancel.status===200,await cancel.text());ok(await prisma.transporterCancellationFee.count({where:{cancelledBookingId:captures[0].booking.id}})===1);
 // Rebooking preserves the cancelled delivery and its financial history.
 const reselect=await flow.selectQuote(c,q.id);await flow.respondToRequest(t,reselect.request.id,'CONFIRM');const rebook=await flow.payConfirmedRequest(c,reselect.request.id);ok(rebook.booking.id!==captures[0].booking.id);ok((await prisma.booking.findUnique({where:{id:captures[0].booking.id}})).status==='CANCELLED');ok(await prisma.bookingPayment.count({where:{bookingId:captures[0].booking.id}})===1);
 console.log(`PASS: ${count} database-backed checks: ownership, confirmation, expiry, idempotency, parallel clicks, pricing, fines and retained history.`);
})().finally(()=>prisma.$disconnect()).catch(e=>{console.error(e);process.exitCode=1});
