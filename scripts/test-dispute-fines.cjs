// Isolated regression checks: no shared database, notifications or real money.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),swc=require('next/dist/build/swc');
function load(relative,stubs={}){const file=path.resolve(relative),m=new Module(file,module);m.filename=file;m.paths=module.paths;const original=m.require.bind(m);m.require=id=>id in stubs?stubs[id]:original(id);m._compile(swc.transformSync(fs.readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript'},target:'es2020'},module:{type:'commonjs'}}).code,file);return m.exports;}
const amounts=load('src/lib/dispute-fine-amount.ts');
const fees=load('src/lib/cancellation-fees.ts',{'./dispute-fine-amount':amounts});
async function main(){
 for(const [input,expected] of [['75.25',7525],['12.5',1250],['0.01',1],['50',5000],[' 125.00 ',12500],['21474836.47',2147483647]])assert.equal(amounts.parseDisputeFinePence(input),expected);
 for(const input of ['', '0','-1','1.001','NaN','Infinity','1e3','£50','1,000','21474836.48'])assert.equal(amounts.parseDisputeFinePence(input),null,input);
 let events=[],cancellations=[],earlier=false;
 const tx={
  $queryRaw:async(strings,...values)=>{const sql=strings.join('?');
   if(sql.includes('FROM "Dispute"'))return[{id:values[0]}];
   if(sql.includes('LIMIT 1'))return events.filter(e=>e.paymentId===values[0]&&e.note===values[1]);
   if(sql.includes('FROM "TransporterCancellationFee"'))return cancellations.filter(f=>f.appliedPence<f.amountPence);
   if(sql.includes('FROM "FinanceEvent" fine'))return events.filter(e=>e.note.startsWith('ADMIN_DISPUTE_FINE:'));
   if(sql.includes('SELECT EXISTS'))return[{exists:earlier}];
   if(sql.includes('SUM("amountPence")'))return[{amountPence:BigInt(events.filter(e=>e.note===values[0]).reduce((a,e)=>a+e.amountPence,0))}];
   throw Error('Unexpected SQL: '+sql);
  },
  $executeRaw:async(strings,...v)=>{const sql=strings.join('?');
   if(sql.includes('INSERT INTO "FinanceEvent"'))events.push({id:v[0],paymentId:v[1],amountPence:v[2],note:v[3],createdAt:new Date('2026-10-19T10:00Z')});
   else if(sql.includes('INSERT INTO "TransporterCancellationFee"'))cancellations.push({id:v[0],amountPence:v[3],appliedPence:0,createdAt:new Date('2026-10-19T10:00Z')});
   else if(sql.includes('UPDATE "TransporterCancellationFee"'))cancellations.find(f=>f.id===v[3]).appliedPence=v[0];
   else if(!sql.includes('INSERT INTO "TransporterCancellationDeduction"'))throw Error('Unexpected SQL: '+sql);
   return 1;
  }
 };
 const fine=(amountPence,disputeId='d')=>fees.recordTransporterDisputeFine({tx,disputeId,paymentId:'source',actorId:'admin',amountPence});
 const payout=(proceedsPence,paymentId='next')=>fees.applyCancellationFeesToPayout({tx,transporterId:'t',paymentId,completedAt:new Date('2026-10-20T10:00Z'),proceedsPence});
 for(const value of [undefined,0,-1,1.2,Infinity,2147483648])await assert.rejects(fine(value));
 assert.equal(events.length,0);
 assert.equal(await fine(7525),true);assert.equal(events[0].amountPence,7525);
 assert.equal(await fine(12500),false,'repeat must not overwrite or add a different fine');
 assert.deepEqual(await payout(3000),{deductedPence:3000,netProceedsPence:0});
 assert.deepEqual(await payout(10000,'next2'),{deductedPence:4525,netProceedsPence:5475});
 assert.deepEqual(await payout(10000,'next3'),{deductedPence:0,netProceedsPence:10000});
 events=[];await fine(5000);assert.equal((await payout(10000)).deductedPence,5000,'legacy £50 record remains £50');
 events=[];await fine(1250);earlier=true;assert.equal((await payout(10000)).deductedPence,0);earlier=false;assert.equal((await payout(10000)).deductedPence,1250,'smaller fine uses its saved amount');
 events=[];cancellations=[];await fees.recordTransporterCancellationFee(tx,'t','cancelled');assert.equal(cancellations[0].amountPence,5000,'active-delivery cancellation stays fixed at £50');await fine(7525);assert.deepEqual(await payout(20000),{deductedPence:12525,netProceedsPence:7475},'separate cancellation and dispute fine add correctly');
 events=[];cancellations=[];
 let user={id:'admin',role:'ADMIN',accountStatus:'ACTIVE'},enabled=true,notifications=[],transactions=0;
 const booking={payment:{id:'source'},job:{vehicleMake:'Audi',vehicleModel:'A6'},transporter:{id:'t',name:'Test Transporter'},customer:{}};
 tx.dispute={findUniqueOrThrow:async()=>({id:'d',booking})};
 const prisma={
  $transaction:async callback=>{transactions++;return callback(tx)},
  dispute:{findMany:async()=>[{id:'d',booking:{...booking,payment:{...booking.payment,events},job:{id:'job'}}}]},
  $queryRawUnsafe:async()=>[]
 };
 const route=load('src/app/api/admin/disputes/route.ts',{
  '@/lib/stripe-refunds':{stripeRefundsEnabled:()=>false,refundSummarySelect:{}},'@/lib/stripe-connect-provider':{},
  '@/lib/prisma':{prisma},'@/lib/auth':{currentUser:async()=>user},'@/lib/features':{disputesEnabled:()=>enabled},
  '@/lib/email':{sendTransactionalEmailSafely:async()=>{throw Error('Fine must not send email')}},
  '@/lib/notifications':{createNotificationSafely:async n=>notifications.push(n)},'@/lib/payout-policy':{},
  '@/lib/cancellation-fees':fees,'@/lib/dispute-fine-amount':amounts,'@/lib/dispute-review-notes':{disputeReviewHistory:()=>''}
 });
 const request=amount=>new Request('http://localhost/api/admin/disputes',{method:'POST',body:JSON.stringify({disputeId:'d',action:'FINE_TRANSPORTER',amountPence:amount})});
 for(const role of ['CUSTOMER','TRANSPORTER']){user={id:'other',role};assert.equal((await route.POST(request(7525))).status,403)}
 user=null;assert.equal((await route.POST(request(7525))).status,403);user={id:'admin',role:'ADMIN',accountStatus:'ACTIVE'};
 enabled=false;assert.equal((await route.POST(request(7525))).status,404);enabled=true;
 for(const invalid of [undefined,0,-1,7.5,'7525',2147483648])assert.equal((await route.POST(request(invalid))).status,400);
 assert.equal((await route.POST(new Request('http://localhost',{method:'POST',body:'{'}))).status,400);
 assert.equal(transactions,0,'invalid or unauthorized requests never write');
 let response=await route.POST(request(7525));assert.equal(response.status,200);assert.deepEqual(await response.json(),{fineRecorded:true,amountPence:7525});assert.equal(events[0].amountPence,7525);assert.match(notifications[0].title,/£75\.25/);assert.match(notifications[0].body,/£75\.25/);
 assert.equal((await route.POST(request(2000))).status,400);assert.equal(events.length,1);assert.equal(notifications.length,1);
 const readback=await (await route.GET()).json();assert.equal(readback[0].transporterFineRecorded,true);assert.equal(readback[0].transporterFineAmountPence,7525);
 console.log('PASS: custom amounts, validation/auth, stored/read-back amount, duplicate prevention, notification, partial/full deductions, legacy fines and unchanged £50 cancellation. Database and notifications mocked.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
