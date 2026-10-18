const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),swc=require('next/dist/build/swc'),postcss=require('postcss');
const root=path.resolve(__dirname,'..');let stateIndex=0;
const react={...React,useState:value=>React.useState(stateIndex++===0?true:value)};
function load(name){const exports={};const filename=path.join(root,'src/app/components',name);const {code}=swc.transformSync(fs.readFileSync(filename,'utf8'),{filename,jsc:{parser:{syntax:'typescript',tsx:true},target:'es2022',transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});new Function('exports','require',code)(exports,id=>id==='react'?react:id==='@/lib/prepare-message-images'?{prepareUploadImages:async files=>files}:require(id));return exports.default;}
const rendered=[];
for(const [name,label,submit] of [['TransporterProofOfCollectionEnhancer.tsx','Collection photos','Submit proof &amp; complete collection'],['TransporterProofOfDeliveryEnhancer.tsx','Delivery photos','Submit proof &amp; complete delivery']]){
 stateIndex=0;const html=renderToStaticMarkup(React.createElement(load(name),{booking:{id:'example'},onDone(){}}));rendered.push(html);
 assert(html.includes('Proof of '+(label.startsWith('Collection')?'collection':'delivery')));
 assert.equal((html.match(/type="file"/g)||[]).length,1);
 assert(html.includes('aria-label="'+label+'"'));assert(html.includes('Choose photos'));assert(html.includes('No photos selected'));
 assert(html.includes('accept="image/jpeg,image/png,image/webp"'));assert(html.includes('multiple=""'));assert(html.includes('required=""'));
 assert(html.includes('<canvas'));assert(html.includes('width="900" height="260"'));assert(html.includes('Clear signature'));
 assert(html.includes('type="checkbox"'));assert(html.includes(submit));assert(html.includes('>Close</button>'));
}
assert(rendered[0].includes('Select condition'));assert(rendered[0].includes('Existing damage present'));assert(rendered[0].includes('Up to 8 photos.'));
assert(rendered[1].includes('RECIPIENT NAME'));assert(rendered[1].includes('DELIVERY NOTES'));assert(rendered[1].includes('OPTIONAL'));assert(rendered[1].includes('OpenStreetMap'));assert(rendered[1].includes('Share delivery location'));
const css=postcss.parse(fs.readFileSync(path.join(root,'src/app/transporter-proof-polish.css'),'utf8'));
css.nodes.forEach(node=>{if(node.type==='comment')return;if(node.type==='rule'){assert.equal(node.selector,'.tdProofPhotoControl>span,.tdCancellationWarning');assert.equal(node.nodes[0].value,'none');return;}assert.equal(node.name,'media');assert.equal(node.params,'(min-width:1024px)');});
assert(css.toString().includes('max-width:none'));
assert(css.toString().includes('padding:16px!important'));
assert(css.toString().includes('background:#eaf2fc!important'));
const submitRule=css.nodes.find(n=>n.type==='atrule').nodes.find(n=>n.selector?.endsWith('fieldset>.btn.fullBtn'));
const submitValues=Object.fromEntries(submitRule.nodes.map(n=>[n.prop,n.value]));
assert.equal(submitValues.width,'auto');assert.equal(submitValues['min-height'],'36px');assert.equal(submitValues.padding,'9px 16px');
for(const colour of ['background:#1975d2','background:#168653','stroke:#fff'])assert(css.toString().includes(colour));
const cancel=fs.readFileSync(path.join(root,'src/app/components/TransporterCancelDeliveryEnhancer.tsx'),'utf8');
for(const text of ["['CONFIRMED','COLLECTION_SCHEDULED']","window.prompt('Reason for cancelling this delivery:'","window.confirm('Cancel this delivery?","£50 cancellation fine","method:'PATCH'","data.booking.status!=='CANCELLED'","button.disabled=true"]){assert(cancel.includes(text));}
console.log('PASS: required fields, native photo validation, signatures, confirmations, optional location and cancellation safeguards retained; form styling desktop-only.');
if(process.argv[2])fs.writeFileSync(process.argv[2],rendered.join('\n<!-- NEXT FORM -->\n'));
