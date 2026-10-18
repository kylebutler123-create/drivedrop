const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const swc=require('next/dist/build/swc');
let slots=[],cursor=0,effects=[];
const react={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value}]},useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i]},useEffect(fn){effects.push(fn)}};
const file=path.resolve('src/app/components/TransporterCardMessages.tsx'),m=new Module(file,module);m.filename=file;m.paths=module.paths;const original=m.require.bind(m);
m.require=id=>id==='react'?react:id==='@/lib/prepare-message-images'?{prepareMessageImages:async files=>files}:id.endsWith('.css')?{}:id==='./MessageDesignIcon'?{__esModule:true,default:()=>null}:original(id);
m._compile(swc.transformSync(fs.readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript',tsx:true},transform:{react:{runtime:'automatic'}},target:'es2020'},module:{type:'commonjs'}}).code,file);
const render=()=>{cursor=0;effects=[];return m.exports.default({bookingId:'booking-a',customerName:'Alex Morgan',transporterId:'transporter-a'})};
function all(node){if(!node||typeof node!=='object')return[];return[node,...[node.props?.children].flat(Infinity).flatMap(all)]}
const find=(tree,type)=>all(tree).find(n=>n.type===type);
const good=new File(['photo'],'car.jpg',{type:'image/jpeg'});
assert.equal(m.exports.imageSelectionError([good]),'');
assert.match(m.exports.imageSelectionError(Array(5).fill(good)),/4 images/);
assert.match(m.exports.imageSelectionError([new File(['bad'],'file.svg',{type:'image/svg+xml'})]),/JPG/);
assert.match(m.exports.imageSelectionError([{type:'image/jpeg',size:8*1024*1024+1}]),/8 MB/);
let tree=render();effects[0]();
find(tree,'textarea').props.onChange({target:{value:'On my way'}});tree=render();
const calls=[];let resolve;
global.fetch=(url,options)=>{calls.push({url,options});return new Promise(r=>resolve=r)};
const submit=find(tree,'form').props.onSubmit;
async function run(){
 const pending=submit({preventDefault(){}});await submit({preventDefault(){}});
 assert.equal(calls.length,1,'double submit must not duplicate');assert.equal(calls[0].options.body.get('bookingId'),'booking-a');assert.equal(calls[0].options.body.get('body'),'On my way');
 resolve({ok:false,json:async()=>({error:'Upload failed'})});await pending;
 tree=render();assert.equal(find(tree,'textarea').props.value,'On my way','failure retains draft');
 find(tree,'input').props.onChange({target:{files:[good],value:'file'}});tree=render();
 const success=find(tree,'form').props.onSubmit({preventDefault(){}});await Promise.resolve();
 assert.equal(calls[1].options.body.getAll('images').length,1);
 resolve({ok:true,json:async()=>({id:'m1',body:'On my way',createdAt:'2026-10-18T19:00:00Z',senderId:'transporter-a',sender:{name:'Driver',role:'TRANSPORTER'},attachments:[{id:'img1'}]})});await success;
 tree=render();assert.equal(find(tree,'textarea').props.value,'');assert(all(tree).some(n=>n.props?.className==='tdThreadMessage isSent'));assert(all(tree).some(n=>n.props?.href==='/api/messages/attachments/img1'));
 find(tree,'input').props.onChange({target:{files:[good],value:'file'}});tree=render();const imageOnly=find(tree,'form').props.onSubmit({preventDefault(){}});await Promise.resolve();assert.equal(calls[2].options.body.get('body'),'');resolve({ok:true,json:async()=>({})});await imageOnly;tree=render();assert(all(tree).some(n=>n.props?.className==='tdReplyAttachment'),'unconfirmed send retains images');
 const css=require('postcss').parse(fs.readFileSync('src/app/transporter-card-messages.css','utf8'));
 css.walkRules(rule=>{if(rule.selector==='.tdCardMessages'){assert.equal(rule.nodes[0].value,'none');return;}assert.equal(rule.parent.params,'screen and (min-width:1024px)');});
 const page=fs.readFileSync('src/app/transporter/page.tsx','utf8');assert(page.includes('transporterId={b.transporter.id}'));assert(page.includes('tdFourLegacyEvidence'));
 console.log('PASS: duplicate sends, failure draft retention, image-only messages, confirmed-send clearing, protected images, file limits, transporter identity and desktop-only styles.');
}
run().catch(error=>{console.error(error);process.exitCode=1});
