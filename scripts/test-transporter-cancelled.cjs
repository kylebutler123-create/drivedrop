const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const swc=require('next/dist/build/swc');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
function moduleFrom(file,mocks,globals={}){
 const exports={};
 const {code}=swc.transformSync(fs.readFileSync(path.join(root,file),'utf8'),{filename:file,jsc:{parser:{syntax:'typescript',tsx:file.endsWith('.tsx')},target:'es2022',transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
 vm.runInNewContext(code,{exports,require:name=>name in mocks?mocks[name]:require(name),console,AbortController,...globals},{filename:file});
 return exports;
}
const sample=(id,when)=>({id,createdAt:new Date('2026-09-01'),job:{vehicleMake:'BMW',vehicleModel:'3 Series',collection:'Birmingham',delivery:'Manchester',registration:'AB12 CDE',running:true,transportType:'OPEN',collectionDate:'2026-10-07'},customer:{name:'Example customer'},trackingEvents:when?[{createdAt:new Date(when),note:'Change of plans'}]:[]});
async function testApi(){
 let user=null,query=null,fail=false;
 const api=moduleFrom('src/app/api/transporter/cancelled/route.ts',{
  'next/server':{NextResponse:{json:(body,options)=>({body,...options})}},
  '@/lib/auth':{currentUser:async()=>user},
  '@/lib/prisma':{prisma:{booking:{findMany:async args=>{query=args;if(fail)throw Error('Database failed');return[sample('older','2026-10-01'),sample('unknown',null),sample('newer','2026-10-03')]}}}}
 });
 for(const role of [null,'CUSTOMER','ADMIN']){
  user=role?{id:'someone',role}:null;
  assert.equal((await api.GET()).status,401);assert.equal(query,null);
 }
 user={id:'transporter-123',role:'TRANSPORTER'};
 const result=await api.GET();
 assert.equal(query.where.transporterId,user.id);assert.equal(query.where.status,'CANCELLED');
 assert.equal(result.body.bookings.map(b=>b.id).join(','),'newer,older,unknown');
 assert.equal(result.body.bookings[2].cancelledAt,null);
 assert.equal(query.select.payment,undefined);assert.equal(query.select.evidence,undefined);
 assert.equal(result.headers['Cache-Control'],'no-store, max-age=0');
 fail=true;assert.equal((await api.GET()).status,500);
 console.log('PASS API: authentication, owner/status scope, sort, missing dates, no fee/proof fields, no-store and errors');
}
async function testComponent(){
 const slots=[];let cursor=0,effects=[],dirty=false,tree,props={selected:false},calls=0,count=null;
 const onCountChange=value=>{count=value};
 const eq=(a,b)=>a&&b&&a.length===b.length&&a.every((x,i)=>Object.is(x,b[i]));
 const react={
  useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],v=>{const next=typeof v==='function'?v(slots[i]):v;if(!Object.is(slots[i],next)){slots[i]=next;dirty=true}}]},
  useRef(initial){const i=cursor++;return slots[i]||(slots[i]={current:initial})},
  useCallback(fn,deps){const i=cursor++;if(!slots[i]||!eq(slots[i].deps,deps))slots[i]={fn,deps};return slots[i].fn},
  useEffect(fn,deps){const i=cursor++;if(!slots[i]||!eq(slots[i].deps,deps)){const previous=slots[i];slots[i]={deps};effects.push(()=>{previous?.cleanup?.();slots[i].cleanup=fn()})}}
 };
 let response={bookings:[{...sample('booking123','2026-10-03'),cancelledAt:'2026-10-03',cancellationNote:'Change of plans'}]},failed=false;
 const media=new EventTarget();media.matches=true;
 const win=new EventTarget();win.matchMedia=()=>media;
 const component=moduleFrom('src/app/components/TransporterCancelledDeliveries.tsx',{
  react,
  './ApprovedIcon':{default:()=>null},'@/lib/transport-types':{transportTypeDisplay:v=>v},'../transporter-cancelled.css':{}
 },{window:win,document:{querySelector:()=>({})},fetch:async()=>{calls++;if(failed)throw Error('Offline');return{ok:true,json:async()=>response}}}).default;
 async function render(next=props){props=next;for(let i=0;i<15;i++){dirty=false;cursor=0;effects=[];tree=component({...props,onCountChange});effects.forEach(effect=>effect());await new Promise(resolve=>setImmediate(resolve));if(!dirty)return}throw Error('Render did not settle')}
 function nodes(value=tree){if(value==null||typeof value==='boolean')return[];if(Array.isArray(value))return value.flatMap(x=>nodes(x??null));if(typeof value!=='object')return[value];return[value,...nodes(value.props?.children??null)]}
 const find=className=>nodes().find(n=>n?.props?.className===className);
 const text=()=>nodes().filter(n=>typeof n==='string'||typeof n==='number').join(' ');
 await render();assert.equal(calls,1);assert.equal(count,1);assert.equal(find('transporterCancelledList'),undefined);
 await render({selected:true});assert.equal(calls,2);assert.ok(find('transporterCancelledList'));assert.match(text(),/Birmingham/);
 assert.equal(find('transporterCancelledToggle').props['aria-expanded'],false);
 find('transporterCancelledToggle').props.onClick();await render();assert.equal(find('transporterCancelledToggle').props['aria-expanded'],true);assert.equal(find('transporterCancelledDetails').props.hidden,false);
 await render({selected:false});assert.equal(find('transporterCancelledList'),undefined);
 failed=true;await render({selected:true});assert.match(text(),/existing cards are still shown/);assert.match(text(),/BMW/);
 failed=false;response={bookings:[]};nodes().find(n=>n?.type==='button'&&n.props.children==='Try again').props.onClick();await new Promise(resolve=>setImmediate(resolve));await render();assert.match(text(),/No cancelled deliveries/);assert.equal(count,0);
 media.matches=false;media.dispatchEvent(new Event('change'));await render();assert.equal(find('transporterCancelledList'),undefined);
 slots.forEach(slot=>slot?.cleanup?.());
 console.log('PASS component: live counter, selected list, card expansion, refresh, retained cards on error, retry, empty and mobile states');
}
async function main(){await testApi();await testComponent();
 const page=fs.readFileSync(path.join(root,'src/app/transporter/page.tsx'),'utf8');
 assert.match(page,/role="button" data-cancelled-summary/);assert.match(page,/onClick=\{\(\)=>toggleView\('CANCELLED'\)\}/);
 assert.match(page,/<TransporterCancelledDeliveries selected=\{view==='CANCELLED'\}/);
 const component=fs.readFileSync(path.join(root,'src/app/components/TransporterCancelledDeliveries.tsx'),'utf8');
 assert.doesNotMatch(component,/createPortal|setTarget/);
 const button=page.match(/<button[^>]*data-cancelled-summary[^>]*>[\s\S]*?<\/button>/);
 assert.ok(button,'Cancelled must have a real button with its own children');
 for(const child of ['cancelledSummaryIcon','cancelledCount','<span>Cancelled</span>'])assert.ok(button[0].includes(child));
 assert.match(page,/onCountChange=\{setCancelledCount\}/);
 const completed=fs.readFileSync(path.join(root,'src/app/components/TransporterDeliveredSummary.tsx'),'utf8');
 assert.match(completed,/standardBoxes.forEach\(box=>box.addEventListener\('click',clearDelivered\)\)/);
 console.log('PASS wiring: native keyboard button, single-view selection, existing completed-list deselection');
}
main().catch(error=>{console.error(error);process.exitCode=1});
