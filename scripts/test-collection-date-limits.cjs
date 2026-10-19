const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),swc=require('next/dist/build/swc');
const root=path.resolve(__dirname,'..'),RealDate=Date;
let instant='2026-10-18T23:30:00Z';
global.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[instant]))}static now(){return +new RealDate(instant)}};
global.document={body:{}};
const mocks={react:{...React,useState:value=>React.useState(value===false?true:value)},'react-dom':{createPortal:node=>node},'next/navigation':{useRouter:()=>({})},'next/link':({children})=>children};
function load(file,expose=false){const out={};const source=fs.readFileSync(file,'utf8')+(expose?'\nexport {CollectionDatePicker};':'');const {code}=swc.transformSync(source,{filename:file,jsc:{parser:{syntax:'typescript',tsx:true},target:'es2022',transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});new Function('exports','require',code)(out,id=>{if(id in mocks)return mocks[id];if(id.endsWith('.css'))return{};if(id.startsWith('.')||id.startsWith('@/')){const p=id.startsWith('@/')?path.join(root,'src',id.slice(2)):path.resolve(path.dirname(file),id);return load(fs.existsSync(p+'.tsx')?p+'.tsx':p+'.ts')}return require(id)});return out}
const Quote=load(path.join(root,'src/app/components/QuoteDatePicker.tsx')).default;
const Home=load(path.join(root,'src/app/components/HomeQuoteRequestPanel.tsx'),true).CollectionDatePicker;
const {ukParts,validateCollectionWindow}=load(path.join(root,'src/lib/availability-time.ts'));
for(const time of ['2026-10-18T23:30:00Z','2026-01-19T00:30:00Z']){
 instant=time;const today=ukParts().date,yesterday=today.slice(0,8)+'18',tomorrow=today.slice(0,8)+'20';
 for(const Component of [Quote,Home]){
  const html=renderToStaticMarkup(React.createElement(Component,{id:'date',name:'collectionDate',label:'Collection date',withWindow:true,value:'',onChange(){},disabled:false}));
  const button=date=>{const label=new RealDate(date+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});return html.match(new RegExp('<button[^>]*aria-label="'+label+'"[^>]*>'))?.[0]};
  assert(button(yesterday)?.includes('disabled=""'),yesterday+' must be disabled');
  assert(button(today)&&!button(today).includes('disabled=""'),today+' must be available');
  assert(button(tomorrow)&&!button(tomorrow).includes('disabled=""'));
  assert(html.match(/<button[^>]*aria-label="Previous month"[^>]*>/)?.[0].includes('disabled=""'));
 }
 assert.throws(()=>validateCollectionWindow(yesterday,'10:00','12:00'),/today or later/);
 assert.doesNotThrow(()=>validateCollectionWindow(today,'10:00','12:00'));
}
console.log('PASS: rendered desktop/home calendars disable yesterday and previous month; today/future enabled; UK summer midnight and winter dates; server rejection preserved. Hooks/portal mocked for rendering.');
