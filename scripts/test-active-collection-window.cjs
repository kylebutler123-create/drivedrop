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

for(const [status,action] of Object.entries({CONFIRMED:'Complete collection',COLLECTION_SCHEDULED:'Complete collection',IN_TRANSIT:'Complete delivery',ARRIVING_SOON:'Complete delivery',COLLECTED:null,DELIVERED:null,CANCELLED:null})){
 const markup=renderToStaticMarkup(React.createElement(Compact.ActiveCompactRow,{booking:{...activeBooking,status}}));
 assert.equal(markup.includes('tdCompactProofAction'),Boolean(action));
 if(action){assert(markup.includes(action));assert(markup.indexOf('Message customer')<markup.indexOf('Call customer'));assert(markup.indexOf('Call customer')<markup.indexOf('tdCompactProofAction'));assert(markup.indexOf('tdCompactProofAction')<markup.indexOf('class="tdCompactStatus"'));}
}
const noPhone=renderToStaticMarkup(React.createElement(Compact.ActiveCompactRow,{booking:{...activeBooking,customer:{phone:null}}}));
assert(!noPhone.includes('Call customer'));assert(noPhone.includes('Complete collection'));
global.requestAnimationFrame=fn=>{fn();return 1};
for(const stage of ['collection','delivery'])for(const alreadyOpen of [false,true]){
 let expanded=0,launched=0,focused=0,scrolled=0;
 const form={scrollIntoView(){scrolled++},querySelector(){return{focus(){focused++}}}};
 const mount={querySelector(selector){if(selector===':scope > button')return alreadyOpen?null:{click(){launched++}};if(selector==='form')return form;throw Error(selector)}};
 const card={classList:{contains(){return !alreadyOpen}},querySelector(selector){if(selector===':scope > .transporterCardToggle')return{click(){expanded++}};assert.equal(selector,`:scope > .bookingColumns ${stage==='collection'?'[data-poc]':'[data-pod-mount]'}`);return mount;}};
 Compact.openActiveProof(card,stage);
 assert.equal(expanded,alreadyOpen?0:1);assert.equal(launched,alreadyOpen?0:1);assert.equal(focused,1);assert.equal(scrolled,1);
}
const css=fs.readFileSync(path.join(root,'src/app/transporter-expanded-cards.css'),'utf8');
assert(css.includes('grid-template-columns:76px 174px 112px;gap:19px'));
assert(css.includes('@media(min-width:1024px) and (max-width:1240px)'));
assert(fs.readFileSync(path.join(root,'src/app/transporter-compact-cards.css'),'utf8').includes('.tdActiveCompactActions{display:none}'));
console.log('PASS: stage-specific compact actions, contact/action/status order, missing phone, existing-form routing and draft reuse, equal 19px action gaps, desktop-only controls.');
