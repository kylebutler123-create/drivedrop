const fs=require('node:fs'),assert=require('node:assert/strict'),swc=require('next/dist/build/swc');
const code=fs.readFileSync('src/lib/booking-authorisation.ts','utf8').split('export async function respondToRequest')[1];
const compiled=swc.transformSync('export async function respondToRequest'+code,{jsc:{parser:{syntax:'typescript'},target:'es2022'},module:{type:'commonjs'}}).code;
let row,quote,job,otherQuotes,fail=false,releaseFailure=false;
const tx={quote:{updateMany:async({where,data})=>{assert.equal(where.id,row.quoteId);assert.equal(where.transporterId,row.transporterId);if(quote.status===where.status)Object.assign(quote,data)},count:async()=>otherQuotes+(quote.status==='PENDING'?1:0)},transportJob:{updateMany:async({where,data})=>{if(job.status===where.status)Object.assign(job,data)}},availabilityRequest:{findUniqueOrThrow:async()=>row,update:async({data})=>{if(fail)throw Error('write failed');Object.assign(row,data);return row}}};
async function locked(id,fn){const before=structuredClone({row,quote,job});try{return await fn(tx,row)}catch(e){({row,quote,job}=before);throw e}}
const exported={};new Function('exports','locked','AvailabilityError','checkEnvironment','terminal','closeExpired','eligibleQuote','validateCollectionWindow','collectionLimit','reconcileRequest',compiled)(exported,locked,Error,()=>{},s=>['EXPIRED','WITHDRAWN','DECLINED','PAYMENT_FAILED'].includes(s),async()=>{},async()=>quote,()=>{},()=>Date.now()+86400000,async()=>{if(releaseFailure)throw Error("provider interrupted");return row});
const transporter={id:'t',role:'TRANSPORTER'},customer={id:'c',role:'CUSTOMER'};
function reset(){row={id:'r',quoteId:'q',jobId:'j',transporterId:'t',customerId:'c',status:'AWAITING_TRANSPORTER',paymentProvider:'STRIPE',paymentState:'AUTHORISED',activeJobId:'j'};quote={status:'PENDING'};job={status:'QUOTED'};otherQuotes=1;fail=false;releaseFailure=false}
(async()=>{
 reset();await exported.respondToRequest(transporter,'r','DECLINE');assert.equal(quote.status,'WITHDRAWN');assert.equal(row.status,'DECLINED');assert.equal(row.activeJobId,null);assert.equal(row.paymentState,'RELEASE_PENDING');assert.equal(job.status,'QUOTED');
 assert.equal((await exported.respondToRequest(transporter,'r','DECLINE')).changed,false);
 reset();releaseFailure=true;const interrupted=await exported.respondToRequest(transporter,'r','DECLINE');assert.equal(interrupted.request.paymentState,'RELEASE_PENDING');assert.equal(interrupted.changed,true);assert.equal(quote.status,'WITHDRAWN');
 reset();otherQuotes=0;await exported.respondToRequest(transporter,'r','DECLINE');assert.equal(job.status,'OPEN');
 reset();await exported.respondToRequest(customer,'r','WITHDRAW');assert.equal(quote.status,'PENDING');assert.equal(row.status,'WITHDRAWN');
 reset();await assert.rejects(()=>exported.respondToRequest({...transporter,id:'wrong'},'r','DECLINE'));assert.equal(quote.status,'PENDING');
 reset();row.status='CAPTURING';await assert.rejects(()=>exported.respondToRequest(transporter,'r','DECLINE'));assert.equal(quote.status,'PENDING');
 reset();row.status='BOOKED';await assert.rejects(()=>exported.respondToRequest(transporter,'r','DECLINE'));assert.equal(quote.status,'PENDING');
 reset();fail=true;await assert.rejects(()=>exported.respondToRequest(transporter,'r','DECLINE'));assert.equal(quote.status,'PENDING');assert.equal(row.status,'AWAITING_TRANSPORTER');
 // Run the real eligibility guard used by selection, not a UI-only check.
 const eligibleSource=fs.readFileSync('src/lib/availability.ts','utf8').split('export async function eligibleQuote')[1].split('export async function closeExpired')[0];
 const eligibility={};const js=swc.transformSync('export async function eligibleQuote'+eligibleSource,{jsc:{parser:{syntax:'typescript'},target:'es2022'},module:{type:'commonjs'}}).code;
 new Function('exports','quoteInclude','isOfferLive','AvailabilityError','insuranceStatusForVerification',js)(eligibility,{},q=>q.status==='PENDING',Error,()=>({state:'VALID'}));
 await assert.rejects(()=>eligibility.eligibleQuote({quote:{findUniqueOrThrow:async()=>({status:'WITHDRAWN',job:{status:'QUOTED'}})}},'q',new Date()),/unavailable/);
 console.log('PASS: decline withdraws only its quote; counts/job state; authorisation release; duplicate decline; customer withdrawal; ownership; capture/booking protection; rollback; stale selection rejected.');
})().catch(e=>{console.error(e);process.exitCode=1});
