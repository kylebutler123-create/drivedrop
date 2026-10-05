const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const swc=require('next/dist/build/swc');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/app/transporter/verification/page.tsx'),'utf8');
const {code}=swc.transformSync(source,{filename:'verification.tsx',jsc:{parser:{syntax:'typescript',tsx:true},target:'es2022',transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
let current=null,states=[],index=0,calls=[];
class MockFormData {
 constructor(values){this.values=values.fields||values}
 get(key){return this.values[key]??null}
 [Symbol.iterator](){return Object.entries(this.values)[Symbol.iterator]()}
}
const policyExports={};
vm.runInNewContext(swc.transformSync(fs.readFileSync(path.join(root,'src/lib/verification-file-policy.ts'),'utf8'),{filename:'policy.ts',jsc:{parser:{syntax:'typescript'},target:'es2022'},module:{type:'commonjs'}}).code,{exports:policyExports});
const exportsObject={};
vm.runInNewContext(code,{
 exports:exportsObject,console,Date,File,FormData:MockFormData,setTimeout:()=>1,clearTimeout:()=>{},
 fetch:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>current}},
 require:name=>name==='@/lib/verification-file-policy'?policyExports:name==='react'?{...React,useState:initial=>{const i=index++;if(!(i in states))states[i]=i===0?current:initial;return [states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value}]},useEffect:()=>{},useRef:()=>({current:null})}:name==='next/link'?(props=>React.createElement('a',{href:props.href},props.children)):name.endsWith('.css')?{}:require(name)
});
function tree(value){current=value;states=[];index=0;calls=[];return exportsObject.default()}
function nodes(element,predicate,result=[]){if(!element||typeof element!=='object')return result;if(predicate(element))result.push(element);React.Children.forEach(element.props?.children,child=>nodes(child,predicate,result));return result}
function render(value){return renderToStaticMarkup(tree(value))}
async function main(){
 let html=render(null);assert(html.includes('Loading'));assert(html.includes('No verification documents yet'));assert(!html.includes('Submit documents'));
 const base={status:'PENDING',businessName:'Actual transporter',phone:'01234567890',yearsOperating:7,businessAddress:'Actual address',documents:[],insuranceStatus:{state:'MISSING'}};
 html=render(base);assert(html.includes('Actual transporter'));assert(html.includes('Pending review'));assert(html.includes('New quote submissions remain blocked'));assert(!html.includes('Kye Transport'));assert(html.includes('Upload both required documents before submitting'));
 const populated={...base,insuranceStatus:{state:'VALID'},documents:Array.from({length:6},(_,i)=>({id:'doc-'+i,type:i%2?'INSURANCE':'DRIVING_LICENCE',status:i===1?'PENDING':'APPROVED',expiresAt:i%2?(i===1?'2099-10-06':'2020-01-01'):null}))};
 const t=tree(populated);html=renderToStaticMarkup(t);assert.equal((html.match(/class="documentRow"/g)||[]).length,6);assert(html.includes('6 documents uploaded'));assert(html.includes('Expires 6 October 2099'));assert(html.includes('data-status="EXPIRED"'));assert(html.includes('/api/verification-documents/doc-5'));
 const forms=nodes(t,e=>e.type==='form');assert.equal(forms.length,3);
 const fileInputs=nodes(t,e=>e.type==='input'&&e.props.type==='file');assert.equal(fileInputs.length,2);assert(fileInputs.every(e=>e.props.required&&e.props.accept.includes('application/pdf')));
 const expiry=nodes(t,e=>e.props?.name==='expiresAt')[0];assert(expiry.props.required);assert.equal(expiry.props.type,'date');
 await forms[0].props.onSubmit({preventDefault(){},currentTarget:{fields:{businessName:'Saved business',phone:'123',yearsOperating:'7',businessAddress:'Address'}}});assert.equal(calls[0].options.method,'PUT');assert.equal(JSON.parse(calls[0].options.body).yearsOperating,7);
 tree(populated);await forms[1].props.onSubmit({preventDefault(){},currentTarget:{fields:{type:'DRIVING_LICENCE'}}});assert.equal(states[1],'Choose a document to upload');assert.equal(calls.length,0);
 const invalid=new File(['bad'],'bad.txt',{type:'text/plain'});await forms[1].props.onSubmit({preventDefault(){},currentTarget:{fields:{type:'DRIVING_LICENCE',file:invalid}}});assert.equal(states[1],'Only PDF, JPG/JPEG, PNG and HEIC/HEIF files are allowed');assert.equal(calls.length,0);
 const tooLarge=new File([new Uint8Array(20*1024*1024+1)],'large.pdf',{type:'application/pdf'});await forms[1].props.onSubmit({preventDefault(){},currentTarget:{fields:{type:'DRIVING_LICENCE',file:tooLarge}}});assert.equal(states[1],'File must be 20 MB or smaller');assert.equal(calls.length,0);
 const ready=tree(populated);const submit=nodes(ready,e=>e.type==='button'&&e.props.onClick)[0];assert.equal(submit.props.disabled,false);await submit.props.onClick();assert.equal(calls[0].options.method,'POST');assert.equal(calls[0].url,'/api/transporter/verification');
 html=render({...populated,status:'APPROVED'});assert(!html.includes('Submit documents'));assert(html.includes('Upload insurance certificate'));
 html=render({...populated,reviewNote:'Replace unreadable licence',insuranceStatus:{state:'EXPIRED',expiresAt:'2020-01-01',replacementPending:true}});assert(html.includes('Insurance expired'));assert(html.includes('Your replacement document is awaiting DriveDrop approval.'));assert(html.includes('Replace unreadable licence'));
 const css=fs.readFileSync(path.join(root,'src/app/transporter/verification/verification-desktop.css'),'utf8');assert(css.includes('@media screen and (min-width:1024px)'));assert(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'));assert(css.includes('gap:14px 24px'));assert(css.includes('.verificationDesktopPolish .verificationDesignIcon{display:none}'));
 console.log('PASS: real data, six documents, loading/empty/pending/approved/expired/replacement states, form fields, save/submit endpoints, file validation and desktop-scoped CSS.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
