const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),swc=require('next/dist/build/swc');
const root=path.resolve(__dirname,'..');let user={id:'owner',role:'TRANSPORTER'},query;
const mocks={'next/link':({children,...p})=>React.createElement('a',p,children),'next/server':{NextResponse:{json:(value,options)=>Response.json(value,options)}},'@/lib/auth':{currentUser:async()=>user},'@/lib/prisma':{prisma:{quote:{findMany:async args=>{query=args;return []}}}}};
function load(file){const out={};const source=fs.readFileSync(file,'utf8');const {code}=swc.transformSync(source,{filename:file,jsc:{parser:{syntax:'typescript',tsx:true},target:'es2022',transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
new Function('exports','require',code)(out,id=>{if(id in mocks)return mocks[id];if(id.endsWith('.css'))return new Proxy({},{get:(_,k)=>k==='__esModule'?false:k});if(id.startsWith('.')||id.startsWith('@/')){const p=id.startsWith('@/')?path.join(root,'src',id.slice(2)):path.resolve(path.dirname(file),id);return load(fs.existsSync(p+'.tsx')?p+'.tsx':p+'.ts')}return require(id)});return out}
(async()=>{
const helpers=load(path.join(root,'src/lib/quote-order.ts'));
const icons=load(path.join(root,'src/app/components/DeliveryDesignIcon.tsx'));
assert.equal(new Set(['Car','Motorcycle','Van','Classic / prestige','Motorhome / campers','Caravan / trailers','Plant / farm','Other vehicles'].map(icons.vehicleTypeIcon)).size,8);
const Compact=load(path.join(root,'src/app/components/TransporterCompactRow.tsx'));
assert.equal(Compact.compactDate('2026-10-14'),'14 October 2026');assert.equal(Compact.compactDate('invalid'),'Not specified');
const row=(id,day,status='PENDING')=>({id,createdAt:'2026-10-01',status,pricePence:32000,dateNegotiationStatus:'ORIGINAL',message:'My message',job:{id:'job'+id,status:status==='ACCEPTED'?'BOOKED':'QUOTED',vehicleMake:'BMW',vehicleModel:'3 Series',collection:'London',delivery:'Bristol',collectionDate:day,customer:{name:'Real customer'},_count:{quotes:5}},booking:status==='ACCEPTED'?{id:'booking',status:'CONFIRMED'}:null});
const a=row('late','2026-10-12'),b=row('early','2026-10-08'),c=row('middle','2026-10-09','ACCEPTED');a.proposedCollectionDate='2026-10-07';
assert.deepEqual(helpers.sortQuotes([c,b,a]).map(q=>q.id),['late','early','middle']);
const View=load(path.join(root,'src/app/transporter/quotes/QuotesDesktop.tsx')).default;
const html=renderToStaticMarkup(React.createElement(View,{quotes:[c,b,a],loading:false,error:'',onUpdate(){},onCancel(){},onRetry(){}}));
assert.equal((html.match(/Adjust quote<\/button>/g)||[]).length,2);assert.equal((html.match(/Cancel quote<\/button>/g)||[]).length,2);assert(html.includes('View active delivery'));assert(html.includes('5 transporter'));assert(html.includes('including you'));assert(html.includes('7 October 2026'));assert(!html.includes('DriveDrop fee'));
assert.equal((html.match(/class="tdCompactToggle"/g)||[]).length,3);assert.equal((html.match(/tdQuoteClosed/g)||[]).length,3);
assert.equal(helpers.dashboardQuotedJobs([a,b,c,{...b,status:'WITHDRAWN'},{...b,job:{...b.job,status:'CANCELLED'}}]).length,2);
const embedded=renderToStaticMarkup(React.createElement(View,{embedded:true,quotes:helpers.dashboardQuotedJobs([a,b,c]),loading:false,error:'',onUpdate(){},onCancel(){},onRetry(){}}));
assert(embedded.includes('Jobs you have quoted on'));assert(embedded.includes('Already quoted'));assert(!embedded.includes('Filter quotes'));assert(!embedded.includes('<main'));assert.equal((embedded.match(/Adjust quote<\/button>/g)||[]).length,2);
const route=load(path.join(root,'src/app/api/my-quotes/route.ts'));assert.equal((await route.GET()).status,200);assert.equal(query.where.transporterId,'owner');assert.equal(query.include.job.select._count.select.quotes.where.status.not,'WITHDRAWN');
const models=require('@prisma/client').Prisma.dmmf.datamodel.models;assert(models.find(m=>m.name==='TransportJob').fields.some(f=>f.name==='quotes'));
user=null;assert.equal((await route.GET()).status,403);
require('postcss').parse(fs.readFileSync(path.join(root,'src/app/transporter/quotes/quotes.module.css'),'utf8'));
require('postcss').parse(fs.readFileSync(path.join(root,'src/app/transporter-compact-cards.css'),'utf8'));
console.log('PASS: collection date sorting, proposed dates, quote counts, edit/cancel eligibility, accepted delivery action, owner query and desktop CSS');
})().catch(e=>{console.error(e);process.exitCode=1});
