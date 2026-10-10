const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),swc=require('next/dist/build/swc');
const root=path.resolve(__dirname,'..');
const mocks={'next/link':({children,...p})=>React.createElement('a',p,children)};
function load(file){const out={};const source=fs.readFileSync(file,'utf8');const {code}=swc.transformSync(source,{filename:file,jsc:{parser:{syntax:'typescript',tsx:true},target:'es2022',transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
new Function('exports','require',code)(out,id=>{if(id in mocks)return mocks[id];if(id.endsWith('.css'))return new Proxy({},{get:(_,k)=>k==='__esModule'?false:k});if(id.startsWith('.')||id.startsWith('@/')){const p=id.startsWith('@/')?path.join(root,'src',id.slice(2)):path.resolve(path.dirname(file),id);return load(fs.existsSync(p+'.tsx')?p+'.tsx':p+'.ts')}return require(id)});return out}

const Compact=load(path.join(root,'src/app/components/TransporterCompactRow.tsx'));
const activeBooking={id:'active-window',status:'CONFIRMED',customer:{phone:'07123456789'},job:{vehicleMake:'Mercedes-Benz',vehicleModel:'E-Class',vehicleType:'Car',collection:'18 Victoria Road, Birmingham, B16 8LA',delivery:'42 Kings Road, Manchester, M21 0XN',collectionDate:'2026-10-14',collectionFrom:'09:00',collectionUntil:'12:00'}};
const activeHtml=renderToStaticMarkup(React.createElement(Compact.ActiveCompactRow,{booking:activeBooking}));
assert(activeHtml.includes('14 October 2026'));assert(activeHtml.includes('09:00 – 12:00'));assert(activeHtml.includes('UK time'));assert(activeHtml.includes('tdCompactCollectionWindow'));assert(activeHtml.includes('Message customer'));assert(activeHtml.includes('Call customer'));assert(activeHtml.includes(activeBooking.job.collection));assert(activeHtml.includes(activeBooking.job.delivery));
for(const window of [{collectionFrom:null,collectionUntil:null},{collectionFrom:'09:00',collectionUntil:null}]){
 const noWindow=renderToStaticMarkup(React.createElement(Compact.ActiveCompactRow,{booking:{...activeBooking,job:{...activeBooking.job,...window}}}));
 assert(!noWindow.includes('tdCompactCollectionWindow'));assert(noWindow.includes('14 October 2026'));
}
const quoteWindow=renderToStaticMarkup(React.createElement(Compact.default,{kind:'quotes',job:activeBooking.job,date:activeBooking.job.collectionDate,collectionWindow:{from:'09:00',until:'12:00'}}));
const windowMarkup=html=>html.match(/<span class="tdCompactCollectionWindow">.*?<\/small><\/span><\/span>/)[0];
assert.equal(windowMarkup(activeHtml),windowMarkup(quoteWindow));

console.log('PASS: active collection window matches My quotes; missing windows hidden; date, full addresses and contact actions preserved.');
