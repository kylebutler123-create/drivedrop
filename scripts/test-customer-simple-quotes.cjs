const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const swc=require('next/dist/build/swc'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const root=path.resolve(__dirname,'..');
function load(file){const filename=path.join(root,file),exports={};const code=swc.transformSync(fs.readFileSync(filename,'utf8'),{filename,jsc:{parser:{syntax:'typescript',tsx:file.endsWith('tsx')},target:'es2022',transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}}).code;new Function('exports','require',code)(exports,id=>id==='@/lib/customer-quote-display'?load('src/lib/customer-quote-display.ts'):id==='next/link'?(({children,...props})=>React.createElement('a',props,children)):require(id));return exports;}
const {offeredCollection,sortCustomerQuotes}=load('src/lib/customer-quote-display.ts');
const job={id:'job',collectionDate:'2026-12-14T00:00:00.000Z',collectionFrom:'09:00',collectionUntil:'12:00'};
const transporter={id:'t',name:'Business · rating decoration',businessName:'Midlands Vehicle Logistics',averageRating:4.9,reviewCount:86,verificationStatus:'APPROVED'};
const original={id:'a',status:'PENDING',pricePence:27500,dateNegotiationStatus:'ORIGINAL',transporter};
const sameDay={...original,id:'b',pricePence:24900,dateNegotiationStatus:'PROPOSED',proposedCollectionDate:job.collectionDate,proposedCollectionFrom:'13:00',proposedCollectionUntil:'16:00',transporter:{...transporter,averageRating:4.8,reviewCount:124}};
const later={...sameDay,id:'c',pricePence:23000,proposedCollectionDate:'2026-12-16T00:00:00.000Z',proposedCollectionFrom:'08:00',proposedCollectionUntil:'11:00',transporter:{...transporter,averageRating:null,reviewCount:0}};
job.quotes=[later,sameDay,original];
assert.deepEqual(sortCustomerQuotes(job.quotes,job,'date').map(q=>q.id),['a','b','c']);
assert.deepEqual(sortCustomerQuotes(job.quotes,job,'price').map(q=>q.id),['c','b','a']);
assert.deepEqual(sortCustomerQuotes(job.quotes,job,'rating').map(q=>q.id),['a','b','c']);
assert.deepEqual(job.quotes.map(q=>q.id),['c','b','a']);
assert.deepEqual(offeredCollection(sameDay,job),{date:job.collectionDate,from:'13:00',until:'16:00'});
assert.equal(offeredCollection({...later,proposedCollectionFrom:null,proposedCollectionUntil:null},job).from,null);
assert.equal(offeredCollection({...later,dateNegotiationStatus:'DECLINED'},job).date,job.collectionDate);
const Component=load('src/app/components/CustomerDesktopQuotes.tsx').default;
const html=renderToStaticMarkup(React.createElement(Component,{job,busyQuoteId:null,onSelect(){},notice:null}));
assert(html.includes('Monday 14 December 2026'));assert(html.includes('Wednesday 16 December 2026'));assert(html.includes('13:00'));assert(html.includes('£249.00'));
assert(!html.includes('rating decoration'));assert(html.includes('New transporter · No reviews yet'));assert.equal((html.match(/>Select quote</g)||[]).length,3);
assert(!html.includes('Keep original date'));assert(!html.includes('Offer another date'));assert(html.includes('/transporter/profile/t'));
const legacy=renderToStaticMarkup(React.createElement(Component,{job:{...job,quotes:[{...later,dateNegotiationStatus:'COUNTERED'}]},busyQuoteId:null,onSelect(){},notice:null}));
assert(legacy.includes('disabled=""'));assert(legacy.includes('earlier date request'));
const page=fs.readFileSync(path.join(root,'src/app/customer/page.tsx'),'utf8');
const handler=page.slice(page.indexOf('async function selectDesktopOffer('),page.indexOf('function openDispute('));
const js=swc.transformSync(handler,{filename:'handler.ts',jsc:{parser:{syntax:'typescript'},target:'es2022'},module:{type:'commonjs'}}).code;
async function run(result,ok=true){let opened=null,notice=null,jobs=[job],requests=0;const fn=new Function('selectingOffer','bookingQuoteId','setSelectingOfferId','setBookingNotice','fetch','setJobs','book',js+';return selectDesktopOffer')({current:false},null,()=>{},v=>notice=v,async()=>{requests++;return {ok,json:async()=>result}},f=>jobs=f(jobs),id=>opened=id);await fn(job,sameDay);return {opened,notice,jobs,requests};}
(async()=>{
const valid={id:'b',dateNegotiationStatus:'ACCEPTED',proposedCollectionDate:job.collectionDate,proposedCollectionFrom:'13:00',proposedCollectionUntil:'16:00',pricePence:1};
let r=await run(valid);assert.equal(r.opened,'b');assert.equal(r.jobs[0].quotes.find(q=>q.id==='b').pricePence,24900);assert.equal(r.jobs[0].quotes.find(q=>q.id==='b').dateNegotiationStatus,'ACCEPTED');
r=await run({...valid,proposedCollectionFrom:'15:00'});assert.equal(r.opened,null);assert.equal(r.notice.type,'error');
r=await run({error:'Quote expired'},false);assert.equal(r.opened,null);assert.equal(r.notice.text,'Quote expired');
console.log('PASS: all sort orders, same-day alternative windows, missing windows, review states, preserved customer price, profile links, legacy counter-date protection, and automatic date acceptance success/error/stale responses.');
if(process.argv[2])fs.writeFileSync(process.argv[2],html);
})().catch(e=>{console.error(e);process.exitCode=1});
