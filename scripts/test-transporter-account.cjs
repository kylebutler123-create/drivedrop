const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const swc=require('next/dist/build/swc');
const root=path.resolve(__dirname,'..');
function load(file,mocks){
 const source=fs.readFileSync(path.join(root,file),'utf8');
 const {code}=swc.transformSync(source,{filename:file,jsc:{parser:{syntax:'typescript',tsx:true},target:'es2022',transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
 const exports={};vm.runInNewContext(code,{exports,require:n=>n in mocks?mocks[n]:n.endsWith('.css')?{}:require(n),console});return exports.default;
}
const link=p=>React.createElement('a',{href:p.href,className:p.className},p.children);
const icon=()=>React.createElement('svg');
async function main(){
 let role='TRANSPORTER',verification=null;
 const captured={};
 const mocks={'next/link':link,'next/navigation':{redirect:()=>{throw Error('redirect')}},'@/lib/auth':{currentUser:async()=>({id:'owner'})},'@/lib/prisma':{prisma:{user:{findUnique:async()=>({name:'Actual account',email:'actual@example.com',phone:null,role,accountStatus:'ACTIVE',workRestricted:false,createdAt:new Date('2025-01-01'),transporterVerification:verification})},$queryRaw:async()=>[]}},'@/lib/supabase-storage':{profileImageUrl:()=>null},'@/app/components/TransporterAccountIcon':icon};
 for(const name of ['AccountEditor','CustomerAccountDesktop','PasswordEditor','EmailEditor','CloseAccount','ProfileImageEditor','PayoutDetailsEditor'])mocks['./'+name]=p=>{captured[name]=p;return React.createElement('div',{'data-component':name})};
 const Page=load('src/app/account/page.tsx',mocks);
 let html=renderToStaticMarkup(await Page());assert(html.includes('transporterAccountPolish'));assert(html.includes('Actual account'));assert(html.includes('transporterSecurityHost'));assert(html.includes('Set up transporter verification'));assert(!html.includes('kye@example.com'));assert.equal(captured.EmailEditor.transporterDesktop,true);
 verification={id:'v',businessName:'Actual company',companyNumber:'123',businessAddress:'Actual address',phone:'01234567890',yearsOperating:3,website:'',status:'PENDING',documents:[]};
 html=renderToStaticMarkup(await Page());assert(html.includes('Actual company'));assert(html.includes('data-verification-state="PENDING"'));assert(html.includes('Manage documents'));assert(html.includes('No verification documents have been uploaded yet.'));assert(captured.ProfileImageEditor);
 verification.documents=Array.from({length:6},(_,i)=>({id:'doc-'+i,type:'DOCUMENT_'+i,status:i===0?'PENDING':'APPROVED',expiresAt:i<3?new Date('2027-09-30'):null}));
 html=renderToStaticMarkup(await Page());assert.equal((html.match(/class="accountDocumentRow"/g)||[]).length,6);assert.equal((html.match(/No expiry recorded/g)||[]).length,3);assert(html.includes('Expires 30 Sept 2027')||html.includes('Expires 30 Sep 2027'));assert(html.includes('data-verification-state="PENDING"'));
 for(const nextRole of ['CUSTOMER','ADMIN']){role=nextRole;html=renderToStaticMarkup(await Page());assert(!html.includes('transporterAccountPolish'));assert(!html.includes('transporterSecurityHost'));assert.equal(captured.EmailEditor.transporterDesktop,undefined)}
 for(const file of ['EmailEditor','PasswordEditor']){
  for(const open of [false,true]){
   let index=0;
   const Component=load('src/app/account/'+file+'.tsx',{'react':{...React,useState:initial=>[index++===0?open:initial,()=>{}]},'../components/AccountDesignIcon':icon});
   html=renderToStaticMarkup(React.createElement(Component,{email:'actual@example.com',transporterDesktop:true}));
   assert(html.includes(file==='EmailEditor'?(open?'Send verification email':'Change email'):(open?'Update password':'Change password')));
   if(open)assert(html.includes('type="password"'));
  }
 }
 const css=fs.readFileSync(path.join(root,'src/app/transporter-account-page.css'),'utf8');assert(css.includes('min-width:1024px'));assert(css.includes('gap:12px'));
 console.log('PASS: transporter setup/populated states, real values, other roles, email/password forms and desktop-only spacing.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
