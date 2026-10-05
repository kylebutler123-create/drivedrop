const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const swc=require('next/dist/build/swc');
const root=path.resolve(__dirname,'..');
const MB=1024*1024;
let currentUser={id:'owner',name:'Transporter',role:'TRANSPORTER',accountStatus:'ACTIVE'};
let verification={id:'verification',transporterId:'owner',businessName:'Actual company',status:'APPROVED'};
let stored=null,documents=new Map(),notifyCount=0,uploadOptions=null,signExpiry=null,fetchCalls=0;
const globals={console,Buffer,File,Blob,Headers,Request,Response,URL,TextEncoder,Uint8Array,ArrayBuffer,setTimeout,clearTimeout,
 process:{env:{SUPABASE_URL:'https://storage.example.test',SUPABASE_SERVICE_ROLE_KEY:'test-only-secret-not-a-real-credential'}},
 fetch:async()=>{fetchCalls++;return stored?new Response(stored,{headers:{'content-type':stored.type,'content-length':String(stored.size)}}):new Response(null,{status:404})},
};
const mocks={
 '@supabase/storage-js':{StorageClient:class{from(bucket){assert.equal(bucket,'transporter-verification');return {createSignedUploadUrl:async(p,options)=>{uploadOptions=options;return {data:{signedUrl:'https://storage.example.test/upload/'+p+'?token=test'},error:null}},createSignedUrl:async(p,seconds)=>{signExpiry=seconds;return {data:{signedUrl:'https://storage.example.test/download/'+p+'?token=test'},error:null}}}}}},
 '@/lib/auth':{currentUser:async()=>currentUser},
 '@/lib/prisma':{prisma:{transporterVerification:{findUnique:async()=>verification},verificationDocument:{findUnique:async({where,include})=>{const d=documents.get(where.id);return d&&include?{...d,verification:{transporterId:'owner'}}:d||null},create:async({data})=>{if(documents.has(data.id))throw {code:'P2002'};documents.set(data.id,data);return data}}}},
 '@/lib/notifications':{notifyAdminsSafely:async()=>{notifyCount++}},
 '@/lib/rate-limit':{checkRateLimit:()=>({allowed:true}),rateLimitResponse:()=>new Response(null,{status:429})},
};
const modules=new Map();
function load(file,overrides={}){
 if(!Object.keys(overrides).length&&modules.has(file))return modules.get(file);
 const source=fs.readFileSync(path.join(root,file),'utf8');
 const {code}=swc.transformSync(source,{filename:file,jsc:{parser:{syntax:'typescript',tsx:true},target:'es2022'},module:{type:'commonjs'}});
 const exports={};
 const requireModule=name=>{if(name in overrides)return overrides[name];if(name in mocks)return mocks[name];if(name.startsWith('@/'))return load('src/'+name.slice(2)+'.ts');if(name.startsWith('.'))return load(path.posix.normalize(path.posix.join(path.posix.dirname(file),name))+'.ts');return require(name)};
 vm.runInNewContext(code,{...globals,...overrides.globals,exports,require:requireModule});
 if(!Object.keys(overrides).length)modules.set(file,exports);return exports;
}
const request=(method,data,origin='https://preview.example.test')=>new Request('https://preview.example.test/api/transporter/verification/documents/direct',{method,headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(data)});
const pdf=size=>new File(['%PDF-1.7\n',new Uint8Array(size-9)],'insurance.pdf',{type:'application/pdf'});
async function main(){
 const policy=load('src/lib/verification-file-policy.ts');
 assert.equal(policy.MAX_VERIFICATION_UPLOAD_SIZE,20*MB);
 assert.equal(policy.verificationInputError(pdf(20*MB)),null);
 assert.equal(policy.verificationInputError(pdf(20*MB+1)),'File must be 20 MB or smaller');
 assert.equal(policy.verificationInputError(new File(['test'],'photo.HEIC',{type:''})),null);
 assert(policy.verificationInputError(new File(['test'],'file.exe',{type:'application/octet-stream'})));
 const ticket=load('src/lib/verification-upload-ticket.ts');
 assert(ticket.verificationExpiryError({type:'INSURANCE'}));assert(ticket.verificationExpiryError({type:'INSURANCE',expiresAt:'2020-01-01'}));assert(ticket.verificationExpiryError({type:'INSURANCE',expiresAt:'2099-02-30'}));assert.equal(ticket.verificationExpiryError({type:'INSURANCE',expiresAt:'2099-10-06'}),null);
 const storage=load('src/lib/supabase-storage.ts');
 assert((await storage.validateVerificationFile(pdf(20*MB))).ok);
 assert(!(await storage.validateVerificationFile(pdf(20*MB+1))).ok);
 assert(!(await storage.validateVerificationFile(new File(['not a PDF'],'fake.pdf',{type:'application/pdf'}))).ok);
 stored=pdf(20*MB);assert((await storage.validateStoredVerificationFile('owned/path.pdf','application/pdf',20*MB)).ok);
 assert(!(await storage.validateStoredVerificationFile('owned/path.pdf','application/pdf',19*MB)).ok);
 assert(!(await storage.validateStoredVerificationFile('owned/path.pdf','image/jpeg',20*MB)).ok);
 const api=load('src/app/api/transporter/verification/documents/direct/route.ts');
 const metadata={type:'INSURANCE',expiresAt:'2099-10-06',contentType:'application/pdf',size:8*MB};
 currentUser=null;assert.equal((await api.POST(request('POST',metadata))).status,403);
 currentUser={id:'owner',name:'Transporter',role:'CUSTOMER',accountStatus:'ACTIVE'};assert.equal((await api.POST(request('POST',metadata))).status,403);
 currentUser.role='TRANSPORTER';currentUser.accountStatus='SUSPENDED';assert.equal((await api.POST(request('POST',metadata))).status,403);currentUser.accountStatus='ACTIVE';
 assert.equal((await api.POST(request('POST',metadata,'https://attacker.example'))).status,403);
 assert.equal((await api.POST(request('POST',{...metadata,size:20*MB+1}))).status,400);
 assert.equal((await api.POST(request('POST',{...metadata,contentType:'image/heic'}))).status,400);
 const v=verification;verification=null;assert.equal((await api.POST(request('POST',metadata))).status,400);verification=v;
 const start=await api.POST(request('POST',metadata));assert.equal(start.status,200);const signed=await start.json();assert.equal(uploadOptions.upsert,false);assert(signed.signedUrl.includes('/owner/verification/'));assert(!JSON.stringify(signed).includes('test-only-secret'));
 const decoded=ticket.readVerificationUpload(signed.receipt);assert.equal(decoded.userId,'owner');assert.equal(decoded.size,8*MB);
 assert.equal(ticket.readVerificationUpload(signed.receipt+'bad'),null);
 assert.equal(ticket.readVerificationUpload(ticket.signVerificationUpload({...decoded,expires:Date.now()-1000})),null);
 currentUser.id='intruder';assert.equal((await api.PATCH(request('PATCH',{receipt:signed.receipt}))).status,400);currentUser.id='owner';
 stored=pdf(8*MB);const completed=await api.PATCH(request('PATCH',{receipt:signed.receipt}));assert.equal(completed.status,201);const document=await completed.json();assert.equal(document.uploaderId,'owner');assert.equal(documents.size,1);assert.equal(notifyCount,1);
 const replay=await api.PATCH(request('PATCH',{receipt:signed.receipt}));assert.equal(replay.status,200);assert.equal((await replay.json()).id,document.id);assert.equal(documents.size,1);assert.equal(notifyCount,1);
 const corrupted=await (await api.POST(request('POST',{...metadata,size:8}))).json();stored=new File(['not pdf!'],'wrong.pdf',{type:'application/pdf'});assert.equal((await api.PATCH(request('PATCH',{receipt:corrupted.receipt}))).status,400);assert.equal(documents.size,1);
 const download=load('src/app/api/verification-documents/[id]/route.ts');
 const ctx={params:Promise.resolve({id:document.id})};
 currentUser=null;assert.equal((await download.GET(new Request('https://preview.example.test'),ctx)).status,401);
 currentUser={id:'other',role:'TRANSPORTER'};assert.equal((await download.GET(new Request('https://preview.example.test'),ctx)).status,403);
 currentUser={id:'owner',role:'TRANSPORTER'};const redirect=await download.GET(new Request('https://preview.example.test'),ctx);assert.equal(redirect.status,307);assert.equal(signExpiry,60);assert.equal(redirect.headers.get('cache-control'),'private, no-store');
 currentUser={id:'admin',role:'ADMIN'};assert.equal((await download.GET(new Request('https://preview.example.test'),ctx)).status,307);
 let dimensions={width:8000,height:6000},rendered=null,closed=0,converted=0;
 const prepare=load('src/lib/prepare-verification-file.ts',{
  globals:{
   createImageBitmap:async()=>({...dimensions,close:()=>{closed++}}),
   document:{createElement:()=>({
    width:0,height:0,
    getContext:()=>({fillRect(){},drawImage(...args){rendered=args},fillStyle:''}),
    toBlob(callback,type){callback(new Blob([new Uint8Array(500)],{type}))},
   })},
  },
  'heic-to/csp':{isHeic:async()=>true,heicTo:async()=>{converted++;return new Blob(['converted'],{type:'image/png'})}},
 });
 const original=pdf(9*MB);assert.equal(await prepare.prepareVerificationFile(original),original);
 let result=await prepare.prepareVerificationFile(new File([new Uint8Array(5*MB)],'photo.jpg',{type:'image/jpeg'}));assert.equal(result.type,'image/jpeg');assert.equal(rendered[3],3200);assert.equal(rendered[4],2400);assert(result.size<5*MB);
 result=await prepare.prepareVerificationFile(new File([new Uint8Array(3*MB)],'screenshot.png',{type:'image/png'}));assert.equal(result.type,'image/png');
 result=await prepare.prepareVerificationFile(new File(['heic'],'phone.heic',{type:'image/heic'}));assert.equal(converted,1);assert.equal(result.type,'image/jpeg');assert.equal(result.name,'phone.jpg');assert.equal(closed,3);
 dimensions={width:1000,height:700};const small=new File(['small'],'small.png',{type:'image/png'});assert.equal(await prepare.prepareVerificationFile(small),small);
 let calls=[],attempt=0;
 const client=load('src/lib/upload-verification-document.ts',{
  './prepare-verification-file':{prepareVerificationFile:async f=>f},
  globals:{fetch:async(url,options)=>{calls.push({url,options});if(options.method==='POST')return Response.json({signedUrl:'https://storage.example.test/upload',receipt:'receipt'});if(options.method==='PUT')return new Response(null,{status:200});attempt++;if(attempt===1)return Response.json({error:'retry'},{status:503});return Response.json({id:'document'})}},
 });
 const stages=[];assert.equal((await client.uploadVerificationDocument(original,{type:'INSURANCE',expiresAt:'2099-10-06'},s=>stages.push(s))).id,'document');assert.equal(calls[1].options.body,original);assert.equal(calls[1].options.credentials,'omit');assert.equal(calls.filter(c=>c.options.method==='PATCH').length,2);assert(stages.includes('Checking document…'));
 console.log('PASS: 20 MB boundary, PDFs byte-identical, photo/HEIC preparation, direct-upload retry, signed ticket tampering/expiry, ownership, signature/size validation, duplicate prevention, private owner/admin downloads.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
