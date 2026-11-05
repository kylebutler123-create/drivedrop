const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),swc=require('next/dist/build/swc');
function load(relative,stubs={}){const file=path.resolve(relative),m=new Module(file,module);m.filename=file;m.paths=module.paths;const original=m.require.bind(m);m.require=id=>id in stubs?stubs[id]:original(id);m._compile(swc.transformSync(fs.readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript',tsx:true},target:'es2020'},module:{type:'commonjs'}}).code,file);return m.exports;}

async function run(){
 const originalFetch=global.fetch,originalEnv={url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SERVICE_ROLE_KEY,scope:process.env.VERCEL_ENV};
 process.env.SUPABASE_URL='https://storage.example.test';process.env.SUPABASE_SERVICE_ROLE_KEY='local-test-only';process.env.VERCEL_ENV='preview';
 let user={id:'assigned',role:'TRANSPORTER',accountStatus:'ACTIVE'},status='CONFIRMED',customerState='ACTIVE',storageStatus=200,type='image/png',queries=[],reads=[];
 const bytes=Buffer.from([137,80,78,71]);
 const bucketUrl='https://storage.example.test/storage/v1/bucket/customer-avatars';
 const objectUrl='https://storage.example.test/storage/v1/object/customer-avatars';
 const readUrl='https://storage.example.test/storage/v1/object/authenticated/customer-avatars';
 let bucketPublic=false, bucketStatus=200;
 global.fetch=async(url,options)=>{
  reads.push({url,options});
  if(url===bucketUrl)return Response.json({id:'customer-avatars',public:bucketPublic},{status:bucketStatus});
  return new Response(storageStatus===200?bytes:'not found',{status:storageStatus,headers:{'content-type':type}});
 };
 const storage=load('src/lib/customer-photo-storage.ts',{});
 const prisma={booking:{findFirst:async({where,select})=>{
  queries.push({where,select});
  return where.id==='booking-one'&&where.transporterId==='assigned'&&where.status?.in?.includes(status)&&where.customer?.accountStatus===customerState?{customerId:'customer-owner'}:null;
 }}};
 const {GET}=load('src/app/api/bookings/customer-photo/route.ts',{'@/lib/auth':{currentUser:async()=>user},'@/lib/prisma':{prisma},'@/lib/customer-photo-storage':storage});
 const {NextRequest}=require('next/server');
 const request=(query='bookingId=booking-one')=>new NextRequest('https://app.example.test/api/bookings/customer-photo?'+query);
 try{
  for(const account of [null,{id:'assigned',role:'CUSTOMER',accountStatus:'ACTIVE'},{id:'assigned',role:'TRANSPORTER',accountStatus:'SUSPENDED'},{id:'assigned',role:'TRANSPORTER',accountStatus:'DELETED'}]){user=account;assert.equal((await GET(request())).status,403)}
  assert.equal(queries.length,0);assert.equal(reads.length,0);
  user={id:'stranger',role:'TRANSPORTER',accountStatus:'ACTIVE'};assert.equal((await GET(request())).status,404);assert.equal(reads.length,0);
  user={id:'assigned',role:'TRANSPORTER',accountStatus:'ACTIVE'};
  assert.equal((await GET(request(''))).status,400);assert.equal((await GET(request('bookingId='+('a'.repeat(129))))).status,400);
  assert.equal((await GET(request('bookingId=other-booking'))).status,404);
  for(const value of ['PENDING_PAYMENT','DELIVERED','CANCELLED']){status=value;assert.equal((await GET(request())).status,404)}
  status='CONFIRMED';customerState='DELETED';assert.equal((await GET(request())).status,404);customerState='ACTIVE';assert.equal(reads.length,0);
  for(const value of ['CONFIRMED','COLLECTION_SCHEDULED','COLLECTED','IN_TRANSIT','ARRIVING_SOON']){
   status=value;const response=await GET(request('bookingId=booking-one&customerId=unrelated-customer'));
   assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/png');assert.match(response.headers.get('cache-control'),/private, no-store/);assert.equal(response.headers.get('vary'),'Cookie');assert.equal(response.headers.get('authorization'),null);
   assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);assert.equal(reads.at(-1).url,readUrl+'/preview/customer-owner/avatar');assert.equal(reads.at(-1).options.cache,'no-store');
  }
  assert.deepEqual(queries.at(-1).select,{customerId:true});
  storageStatus=404;assert.equal((await GET(request())).status,204);
  storageStatus=400;assert.equal((await GET(request())).status,204);
  storageStatus=500;assert.equal((await GET(request())).status,502);
  storageStatus=200;type='text/html';assert.equal((await GET(request())).status,502);type='image/png';
  process.env.VERCEL_ENV='production';await GET(request());assert.equal(reads.at(-1).url,readUrl+'/production/customer-owner/avatar');
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;assert.equal((await GET(request())).status,503);process.env.SUPABASE_SERVICE_ROLE_KEY='local-test-only';
  const account=load('src/app/api/account/customer-photo/route.ts',{'@/lib/auth':{currentUser:async()=>user},'@/lib/customer-photo-storage':storage,'@/lib/supabase-storage':{validateProfileImage:async()=>({ok:true})}});
  user={id:'customer-owner',role:'CUSTOMER',accountStatus:'ACTIVE'};assert.equal((await account.GET()).status,200);
  const upload=()=>{const form=new FormData();form.append('file',new File([bytes],'avatar.png',{type:'image/png'}));return new Request('https://app.example.test/api/account/customer-photo',{method:'POST',headers:{origin:'https://app.example.test'},body:form})};
  const before=reads.length;assert.equal((await account.POST(upload())).status,200);assert.equal((await account.POST(upload())).status,200);
  assert.deepEqual(reads.slice(before).map(r=>r.url),[bucketUrl,objectUrl+'/production/customer-owner/avatar',bucketUrl,objectUrl+'/production/customer-owner/avatar']);
  assert.equal(reads.at(-1).options.headers['x-upsert'],'true');
  for(const [isPublic,statusCode] of [[true,200],[false,404]]){
   bucketPublic=isPublic;bucketStatus=statusCode;
   const start=reads.length;
   assert.equal((await account.POST(upload())).status,500);
   assert.deepEqual(reads.slice(start).map(r=>r.url),[bucketUrl],'a public or missing bucket must never receive the photo');
  }
  bucketPublic=false;bucketStatus=200;
  assert.equal((await account.DELETE(new Request('https://app.example.test/api/account/customer-photo',{method:'DELETE',headers:{origin:'https://app.example.test'}}))).status,200);
  assert.equal(reads.at(-1).url,objectUrl);
  assert.deepEqual(JSON.parse(reads.at(-1).options.body),{prefixes:['production/customer-owner/avatar']});
  const count=reads.length;assert.equal((await account.DELETE(new Request('https://app.example.test/api/account/customer-photo',{method:'DELETE',headers:{origin:'https://unrelated.example.test'}}))).status,403);assert.equal(reads.length,count);
  assert.equal(reads.some(r=>r.url.includes('transporter-profiles')||r.url.includes('/object/public/')),false);
  console.log('PASS: private bucket only, public/missing bucket upload refusal, assigned-booking and owner access, caller denials, environment separation, replacement and removal. Database and storage mocked.');
 }finally{
  global.fetch=originalFetch;
  for(const [key,value] of [['SUPABASE_URL',originalEnv.url],['SUPABASE_SERVICE_ROLE_KEY',originalEnv.key],['VERCEL_ENV',originalEnv.scope]])if(value===undefined)delete process.env[key];else process.env[key]=value;
 }
}
run().catch(error=>{console.error(error);process.exitCode=1});
