const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const swc=require('next/dist/build/swc');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/app/transporter/proceeds/page.tsx'),'utf8');
const {code}=swc.transformSync(source,{filename:'proceeds.tsx',jsc:{parser:{syntax:'typescript',tsx:true},target:'es2022',transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
const styles=new Proxy({},{get:(_,key)=>key==='__esModule'?false:key});
let user={id:'owner',role:'TRANSPORTER'},query,bookings=[],iconLookupFails=false;
const models=require('@prisma/client').Prisma.dmmf.datamodel.models;
function validateSelection(modelName,selection){
 const model=models.find(m=>m.name===modelName);assert(model,'Unknown model '+modelName);
 for(const [name,value] of Object.entries(selection)){
  const field=model.fields.find(f=>f.name===name);assert(field,'Unknown Prisma field '+modelName+'.'+name);
  if(value&&typeof value==='object'&&value.select)validateSelection(field.type,value.select);
 }
}
function row(id,status,payoutStatus,net,fine=0,refund=0){return {id,status,customerConfirmedAt:null,createdAt:new Date('2026-10-01'),customer:{name:'Actual customer'},job:{id:'job-'+id,vehicleMake:'Actual make',vehicleModel:id,registration:'REAL REG',collection:'Actual collection address',delivery:'Actual delivery address',collectionDate:new Date('2026-10-01')},payment:{transporterProceedsPence:net,cancellationDeductionPence:fine,refundedPence:refund,payoutStatus,events:payoutStatus==='PAID'?[{createdAt:new Date('2026-10-04')}]:[]}}}
const mocks={
 'next/link':({children,...props})=>React.createElement('a',props,children),
 'next/navigation':{redirect:()=>{throw Error('redirect')},notFound:()=>{throw Error('notFound')}},
 '@/lib/auth':{currentUser:async()=>user},
 '@/lib/prisma':{prisma:{booking:{findMany:async args=>{validateSelection('Booking',args.select);query=args;return bookings}},$queryRawUnsafe:async(sql,...ids)=>{assert(sql.includes('"vehicleType"'));assert(sql.includes('$1'));assert(ids.every(id=>bookings.some(b=>b.job.id===id)));if(iconLookupFails)throw Error('Optional metadata unavailable');return bookings.map(b=>({id:b.job.id,vehicleType:b.id==='paid'?'Van':'Car'}))}}},
 './proceeds.module.css':styles,
 './ProceedsDesktop':()=>null,
};
function loadTs(file,extra={}){
 const source=fs.readFileSync(path.join(root,file),'utf8');
 const {code}=swc.transformSync(source,{filename:file,jsc:{parser:{syntax:'typescript',tsx:true},target:'es2022',transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
 const out={};new Function('exports','require',code)(out,n=>n in extra?extra[n]:n in mocks?mocks[n]:require(n));return out;
}
const data=loadTs('src/lib/transporter-proceeds.ts',{'./prisma':mocks['@/lib/prisma']});
mocks['@/lib/transporter-proceeds']=data;
const exportsObject={};vm.runInNewContext(code,{exports:exportsObject,require:n=>n in mocks?mocks[n]:require(n),Date,Intl,URLSearchParams,console:{warn(){}}});
const Page=exportsObject.default;
async function render(params={}){return renderToStaticMarkup(await Page({searchParams:Promise.resolve({year:'2026',...params})}))}
async function main(){
 bookings=[row('progress','IN_TRANSIT','PENDING',32000),row('ready','DELIVERED','READY',45000),row('held','DELIVERED','HELD',18000),row('paid','DELIVERED','PAID',25000,5000),row('cancelled','CANCELLED','CANCELLED',0,0,12000)];
 assert.throws(()=>validateSelection('TransportJob',{vehicleType:true}),/Unknown Prisma field/);
 let html=await render();assert.equal(query.where.transporterId,'owner');assert.equal(query.select.job.select.vehicleType,undefined);assert.equal(query.select.job.select.id,true);assert.equal(query.orderBy.createdAt,'desc');
 assert.equal((html.match(/<article/g)||[]).length,4);assert.equal((html.match(/View printable statement/g)||[]).length,3);assert(html.includes('£1,250.00'));assert(html.includes('£300.00'));assert(html.includes('£250.00'));assert(html.includes('−£50.00'));assert(html.includes('1 October 2026'));assert(html.includes('4 October 2026'));assert(html.includes('Actual customer'));assert(!html.includes('Sarah Mitchell'));assert(!html.includes('DriveDrop fee'));
 for(const [filter,status] of [['in_progress','In progress'],['ready','Ready for release'],['held','Held proceeds'],['paid','Paid proceeds']]){html=await render({filter});assert.equal((html.match(/<article/g)||[]).length,1);assert(html.includes('<h2>'+status+'</h2>'));assert(html.includes('aria-current="page"'))}
 html=await render({filter:'fines'});assert.equal((html.match(/<article/g)||[]).length,2);assert(html.includes('Customer refund'));assert(html.includes('Net payout'));assert(html.includes('−£120.00'));assert(html.includes('filter=fines&amp;adjustment=refunds'));
 html=await render({filter:'fines',adjustment:'fines'});assert.equal((html.match(/<article/g)||[]).length,1);assert(html.includes('<h2>Fines</h2>'));
 html=await render({filter:'fines',adjustment:'refunds'});assert.equal((html.match(/<article/g)||[]).length,1);assert(html.includes('<h2>Refunds</h2>'));assert(!html.includes('View printable statement'));
 iconLookupFails=true;html=await render();assert.equal((html.match(/<article/g)||[]).length,4);assert(html.includes('£1,250.00'));iconLookupFails=false;
 bookings=[row('awaiting','DELIVERED','PENDING',12500)];html=await render();assert(html.includes('Awaiting customer confirmation'));
 bookings=[];html=await render();assert(html.includes('No booked proceeds'));assert(html.includes('£0.00'));
 // Year selection, custom dates and rollover keep previous records accessible.
 const old=row('old','DELIVERED','PAID',9900);old.createdAt=new Date('2025-12-31T23:59:59Z');
 bookings=[old,row('new','IN_TRANSIT','PENDING',10000)];
 html=await render();assert(html.includes('2025'));assert(!html.includes('Actual make<!-- -->old'));assert(html.includes('year=2026&amp;filter=paid'));
 html=await render({year:'2025'});assert(html.includes('£99.00'));assert.equal((html.match(/<article/g)||[]).length,1);
 html=await render({start:'2025-12-31',end:'2026-01-01'});assert(html.includes('Showing Custom date range'));assert(html.includes('start=2025-12-31&amp;end=2026-01-01'));
 assert.equal(data.proceedsPeriod({},new Date('2027-01-01T00:00:00Z')).year,2027);
 assert.equal(data.londonDate('2026-06-30T23:30:00Z'),'2026-07-01');
 assert.throws(()=>data.proceedsPeriod({start:'2026-02-30',end:'2026-03-01'}));
 assert.throws(()=>data.proceedsPeriod({start:'2026-12-31',end:'2026-01-01'}));
 assert.throws(()=>data.proceedsPeriod({year:'NaN'}));
 const dangerous=row('csv','DELIVERED','PAID',10000,5000,2000);dangerous.customer.name='=HYPERLINK("bad")';
 const csv=data.proceedsCsv([dangerous]);assert(csv.includes("'=HYPERLINK"));assert(csv.includes('"150.00","50.00","100.00","20.00"'));assert(!csv.includes('DriveDrop fee'));
 const periodHelpers=loadTs('src/lib/payment-period.ts');
 const filters=loadTs('src/lib/proceeds-filters.ts',{'./payment-period':periodHelpers});
 assert.equal(filters.filterProceeds(bookings,{q:'old'}).length,1);
 assert.equal(filters.filterProceeds(bookings,{status:'PAID'}).length,1);
 assert.equal(filters.filterProceeds(bookings,{status:'IN_PROGRESS'}).length,1);
 assert.equal(filters.filterProceeds([dangerous],{status:'FINES',adjustment:'REFUNDS'}).length,1);
 assert.equal(filters.filterProceeds([dangerous],{month:'2026-09'}).length,0);
 const ui=loadTs('src/app/transporter/proceeds/ProceedsDesktop.tsx',{'@/lib/payment-period':periodHelpers,'@/lib/proceeds-filters':filters,'@/lib/customer-payments':loadTs('src/lib/customer-payments.ts'),'../../payments/payments.module.css':styles,'./desktop.module.css':styles});
 const desktopHtml=renderToStaticMarkup(React.createElement(ui.default,{bookings:[dangerous],initial:{year:'2026'}}));
 assert(desktopHtml.includes('Proceeds history'));assert(desktopHtml.includes('Proceeds breakdown'));assert(desktopHtml.includes('Download statement (PDF)'));assert(desktopHtml.includes('bookingId=csv'));assert(!desktopHtml.includes('DriveDrop fee'));
 const pdf=loadTs('src/lib/proceeds-pdf.ts',{'./transporter-proceeds':data});
 const bytes=await pdf.proceedsPdf(Array.from({length:15},()=>dangerous),'Test Transporter',data.proceedsPeriod({year:'2026'}));
 const document=await require('pdf-lib').PDFDocument.load(bytes);assert(document.getPageCount()>1);
 const route=loadTs('src/app/api/transporter/proceeds/export/route.ts',{'@/lib/proceeds-pdf':pdf,'@/lib/proceeds-filters':filters});
 bookings=[old,dangerous];
 let response=await route.GET(new Request('https://example.com/api/transporter/proceeds/export?year=2025&format=csv'));
 assert.equal(response.status,200);assert.equal(query.where.transporterId,'owner');assert.equal(response.headers.get('cache-control'),'private, no-store');
 const downloaded=await response.text();assert(downloaded.includes('old'));assert(!downloaded.includes('HYPERLINK'));
 response=await route.GET(new Request('https://example.com/api/transporter/proceeds/export?year=2026&format=pdf'));assert.equal(response.headers.get('content-type'),'application/pdf');assert((await response.arrayBuffer()).byteLength>1000);
 response=await route.GET(new Request('https://example.com/api/transporter/proceeds/export?year=oops&format=csv'));assert.equal(response.status,400);
 response=await route.GET(new Request('https://example.com/api/transporter/proceeds/export?year=2026&format=pdf&bookingId=foreign'));assert.equal(response.status,404);
 response=await route.GET(new Request('https://example.com/api/transporter/proceeds/export?year=2026&format=csv&status=IN_PROGRESS'));assert(!(await response.text()).includes('HYPERLINK'));
 user=null;response=await route.GET(new Request('https://example.com/api/transporter/proceeds/export?format=csv'));assert.equal(response.status,401);
 user={id:'customer',role:'CUSTOMER'};response=await route.GET(new Request('https://example.com/api/transporter/proceeds/export?format=csv'));assert.equal(response.status,403);
 user=null;await assert.rejects(render,/redirect/);user={id:'customer',role:'CUSTOMER'};await assert.rejects(render,/notFound/);
 const css=fs.readFileSync(path.join(root,'src/app/transporter/proceeds/proceeds.module.css'),'utf8');require('postcss').parse(css);assert(css.includes('min-width:1024px'));assert(css.includes('grid-template-columns:repeat(6,minmax(0,1fr))'));assert(css.includes('.cardBottom{display:contents}'));
 console.log('PASS: owner access, totals before fines, all proceeds/adjustment filters, cancelled refunds, actual data, payout states, dates, statement links and desktop-only layout.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
