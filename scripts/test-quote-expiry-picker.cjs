const fs=require('fs'),path=require('path'),assert=require('assert/strict'),swc=require('next/dist/build/swc'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
let state=[],index=0;
function load(file){const filename=path.resolve(file),exports={};const code=swc.transformSync(fs.readFileSync(filename,'utf8'),{filename,jsc:{parser:{syntax:'typescript',tsx:file.endsWith('tsx')},target:'es2022',transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}}).code;new Function('exports','require',code)(exports,id=>{
 if(id==='react')return {...React,useState:()=>[state[index++],()=>{}],useEffect(){},useLayoutEffect(){},useRef:()=>({current:null})};
 if(id==='react-dom')return {createPortal:node=>node};
 if(id.includes('CollectionWindowFields'))return {Icon:()=>null};
 if(id.endsWith('.css'))return {};
 if(id==='@/lib/availability-time')return load('src/lib/availability-time.ts');
 if(id==='./availability-error')return load('src/lib/availability-error.ts');
 return require(id);
});return exports;}
global.document={body:{}};
const {quoteExpiry}=load('src/lib/availability-time.ts');
const now=new Date('2026-10-11T19:59:30Z'); // 20:59 UK, even if the browser is elsewhere.
assert.throws(()=>quoteExpiry('2026-10-10T23:59',now),/future/);
assert.throws(()=>quoteExpiry('2026-10-11T20:59',now),/future/);
assert.equal(quoteExpiry('2026-10-11T21:00',now).toISOString(),'2026-10-11T20:00:00.000Z');
assert.throws(()=>quoteExpiry('2026-10-11T21:00',new Date('2026-10-11T20:00:00Z')),/future/);
assert.throws(()=>quoteExpiry('2027-03-28T01:30',now),/clock time/);
assert.throws(()=>quoteExpiry('2026-10-25T01:30',now),/clock time/);
assert.equal(quoteExpiry('',now),null);
const Picker=load('src/app/components/QuoteDatePicker.tsx').default;
function render(hour,minute){index=0;state=['',true,'2026-10-11',hour,minute,'','','','','',new Date('2026-10-01T12:00:00Z'),now,{top:0,left:0}];return renderToStaticMarkup(React.createElement(Picker,{id:'expiry',name:'expiresAt',label:'Quote valid until',withTime:true}));}
let html=render('20','59');
assert.match(html,/<button[^>]*aria-label="10 October 2026"[^>]*disabled/);
assert.match(html,/<button[^>]*aria-label="Previous month"[^>]*disabled/);
assert.match(html,/<button[^>]*class="quotePickerApply"[^>]*disabled/);
html=render('21','00');
assert.doesNotMatch(html,/<button[^>]*class="quotePickerApply"[^>]*disabled/);
assert.match(html,/<option[^>]*disabled[^>]*>20<\/option>/);
console.log('PASS: past dates, elapsed/same-minute times, future UK time, stale submission, UK DST gaps/ambiguity, optional empty expiry and picker disabled states.');
function windowPicker(hourly,savedFrom='',savedUntil=''){
 index=0;state=['2026-12-14',true,'2026-12-14','','',savedFrom,savedUntil,savedFrom,savedUntil,'',new Date('2026-12-01T12:00:00Z'),now,{top:0,left:0},hourly];
 return renderToStaticMarkup(React.createElement(Picker,{id:'window',name:'collectionDate',label:'Collection window',withWindow:true}));
}
html=windowPicker(true);
assert(!html.includes('>09:30</option>'));assert(html.includes('>09:00</option>'));
assert(windowPicker(false).includes('>09:30</option>'),'mobile keeps existing intervals');
html=windowPicker(true,'09:30','11:30');
assert.match(html,/name="proposedCollectionFrom" value="09:30"/);
assert.match(html,/<option[^>]*disabled[^>]*>09:30<\/option>/);
const Fields=load('src/app/components/CollectionWindowFields.tsx').default;
function fields(hourly){index=0;state=['09:30','11:30','from',true,1,'',false,now,hourly];return renderToStaticMarkup(React.createElement(Fields,{date:'2026-12-14'}));}
html=fields(true);assert.equal((html.match(/class="dd-slot"/g)||[]).length,6);assert(!html.includes('>09:30</button>'));assert.match(html,/name="collectionFrom" value="09:30"/);
assert.equal((fields(false).match(/class="dd-slot"/g)||[]).length,12);
console.log('PASS: both collection pickers offer hourly desktop slots, preserve stored half-hour windows, and retain mobile intervals.');
