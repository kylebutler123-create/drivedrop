const fs=require('fs'),assert=require('assert/strict'),swc=require('next/dist/build/swc');
const compile=source=>swc.transformSync(source,{jsc:{parser:{syntax:'typescript'},target:'es2022'},module:{type:'commonjs'}}).code;
const state={};new Function('exports',compile(fs.readFileSync('src/lib/quote-selection-state.ts','utf8')))(state);
const active={id:'r',jobId:'j',quoteId:'q',status:'AWAITING_TRANSPORTER'};
assert.equal(state.activeConfirmationForJob([active],'j'),active);
assert.equal(state.activeConfirmationForJob([active],'other'),undefined);
for(const status of ['DECLINED','WITHDRAWN','EXPIRED','PAYMENT_FAILED'])assert.equal(state.activeConfirmationForJob([{...active,status}],'j'),undefined);
assert.equal(state.selectionStatusLabel(active,'q'),'Awaiting confirmation');
assert.equal(state.selectionStatusLabel(active,'other'),'Request in progress');
let row=null,creates=0,updates=0,tail=Promise.resolve();
async function serial(fn){const previous=tail;let release;tail=new Promise(r=>release=r);await previous;try{return await fn()}finally{release()}}
const tx={quote:{findUniqueOrThrow:async()=>({jobId:'j'})},booking:{findUnique:async()=>null},availabilityRequest:{findFirst:async()=>row,findUniqueOrThrow:async()=>({...row}),create:async({data})=>{creates++;row={id:'r',...data};return {...row}},update:async({data})=>{updates++;row={...row,...data};return {...row}}}};
const q={id:'q',jobId:'j',transporterId:'t',pricePence:20000,job:{customerId:'c',collectionDate:'2026-12-14',collectionFrom:'09:00',collectionUntil:'12:00'}};
const actor={id:'c',role:'CUSTOMER',accountStatus:'ACTIVE'};
const selected={};const selectSource='export async function selectQuote'+fs.readFileSync('src/lib/availability.ts','utf8').split('export async function selectQuote')[1].split('// Called only')[0];
new Function('exports','prisma','AvailabilityError','lockJob','eligibleQuote','closeExpired','calendarDate','validateCollectionWindow','authorisationProvider','paymentEnvironment','calculateCustomerPrice','confirmationDeadline',compile(selectSource))(selected,{$transaction:fn=>serial(()=>fn(tx))},Error,async()=>{},async()=>q,async()=>{},x=>x,()=>{},()=> 'TEST',()=> 'preview',price=>({customerTotalPence:price+1000}),()=>new Date(Date.now()+3600000));
const auth={};const authSource='export async function authoriseRequest'+fs.readFileSync('src/lib/booking-authorisation.ts','utf8').split('export async function authoriseRequest')[1].split('async function intentFor')[0];
new Function('exports','locked','AvailabilityError','checkEnvironment','closeExpired','eligibleQuote','authorisationProvider','requestExpired',compile(authSource))(auth,(id,fn)=>serial(()=>fn(tx,{...row})),Error,()=>{},async()=>{},async()=>q,()=> 'TEST',()=>false);
(async()=>{
 const results=await Promise.all([selected.selectQuote(actor,'q'),selected.selectQuote(actor,'q')]);assert.equal(creates,1);assert.equal(results.filter(r=>r.created).length,1);assert.equal(results[0].request.id,results[1].request.id);
 await Promise.all([auth.authoriseRequest(actor,'r'),auth.authoriseRequest(actor,'r')]);assert.equal(updates,1);assert.equal(row.paymentState,'AUTHORISED');
 await auth.authoriseRequest(actor,'r');assert.equal(updates,1);
 q.id='other';await assert.rejects(()=>selected.selectQuote(actor,'other'),/already have a confirmation request/);assert.equal(creates,1);
 console.log('PASS: pending selection state, terminal unlock, concurrent selection reuse, one authorisation update, repeat retry reuse and different-quote rejection.');
})().catch(error=>{console.error(error);process.exitCode=1});
