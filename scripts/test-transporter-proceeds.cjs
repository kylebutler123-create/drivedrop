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
let user={id:'owner',role:'TRANSPORTER'},query,bookings=[];
function row(id,status,payoutStatus,net,fine=0,refund=0){return {id,status,customerConfirmedAt:null,createdAt:new Date('2026-10-01'),customer:{name:'Actual customer'},job:{vehicleType:id==='paid'?'Van':'Car',vehicleMake:'Actual make',vehicleModel:id,registration:'REAL REG',collection:'Actual collection address',delivery:'Actual delivery address',collectionDate:new Date('2026-10-01')},payment:{transporterProceedsPence:net,cancellationDeductionPence:fine,refundedPence:refund,payoutStatus,events:payoutStatus==='PAID'?[{createdAt:new Date('2026-10-04')}]:[]}}}
const mocks={
 'next/link':({children,...props})=>React.createElement('a',props,children),
 'next/navigation':{redirect:()=>{throw Error('redirect')},notFound:()=>{throw Error('notFound')}},
 '@/lib/auth':{currentUser:async()=>user},
 '@/lib/prisma':{prisma:{booking:{findMany:async args=>{query=args;return bookings}}}},
 './proceeds.module.css':styles,
};
const exportsObject={};vm.runInNewContext(code,{exports:exportsObject,require:n=>n in mocks?mocks[n]:require(n),Date,Intl});
const Page=exportsObject.default;
async function render(params={}){return renderToStaticMarkup(await Page({searchParams:Promise.resolve(params)}))}
async function main(){
 bookings=[row('progress','IN_TRANSIT','PENDING',32000),row('ready','DELIVERED','READY',45000),row('held','DELIVERED','HELD',18000),row('paid','DELIVERED','PAID',25000,5000),row('cancelled','CANCELLED','CANCELLED',0,0,12000)];
 let html=await render();assert.equal(query.where.transporterId,'owner');assert.equal(query.select.job.select.vehicleType,true);assert.equal(query.orderBy.createdAt,'desc');
 assert.equal((html.match(/<article/g)||[]).length,4);assert.equal((html.match(/View printable statement/g)||[]).length,3);assert(html.includes('£1,250.00'));assert(html.includes('£300.00'));assert(html.includes('£250.00'));assert(html.includes('−£50.00'));assert(html.includes('1 October 2026'));assert(html.includes('4 October 2026'));assert(html.includes('Actual customer'));assert(!html.includes('Sarah Mitchell'));assert(!html.includes('DriveDrop fee'));
 for(const [filter,status] of [['in_progress','In progress'],['ready','Ready for release'],['held','Held proceeds'],['paid','Paid proceeds']]){html=await render({filter});assert.equal((html.match(/<article/g)||[]).length,1);assert(html.includes('<h2>'+status+'</h2>'));assert(html.includes('aria-current="page"'))}
 html=await render({filter:'fines'});assert.equal((html.match(/<article/g)||[]).length,2);assert(html.includes('Customer refund'));assert(html.includes('Net payout'));assert(html.includes('−£120.00'));assert(html.includes('filter=fines&amp;adjustment=refunds'));
 html=await render({filter:'fines',adjustment:'fines'});assert.equal((html.match(/<article/g)||[]).length,1);assert(html.includes('<h2>Fines</h2>'));
 html=await render({filter:'fines',adjustment:'refunds'});assert.equal((html.match(/<article/g)||[]).length,1);assert(html.includes('<h2>Refunds</h2>'));assert(!html.includes('View printable statement'));
 bookings=[row('awaiting','DELIVERED','PENDING',12500)];html=await render();assert(html.includes('Awaiting customer confirmation'));
 bookings=[];html=await render();assert(html.includes('No booked proceeds'));assert(html.includes('£0.00'));
 user=null;await assert.rejects(render,/redirect/);user={id:'customer',role:'CUSTOMER'};await assert.rejects(render,/notFound/);
 const css=fs.readFileSync(path.join(root,'src/app/transporter/proceeds/proceeds.module.css'),'utf8');require('postcss').parse(css);assert(css.includes('min-width:1024px'));assert(css.includes('grid-template-columns:repeat(6,minmax(0,1fr))'));assert(css.includes('.cardBottom{display:contents}'));
 console.log('PASS: owner access, totals before fines, all proceeds/adjustment filters, cancelled refunds, actual data, payout states, dates, statement links and desktop-only layout.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
