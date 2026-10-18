const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),swc=require('next/dist/build/swc');
function load(relative,stubs={}){const file=path.resolve(relative),m=new Module(file,module);m.filename=file;m.paths=module.paths;const original=m.require.bind(m);m.require=id=>id in stubs?stubs[id]:original(id);m._compile(swc.transformSync(fs.readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript',tsx:true},target:'es2020'},module:{type:'commonjs'}}).code,file);return m.exports;}
async function run(){
 const storage=load('src/lib/supabase-storage.ts',{'./verification-file-policy':load('src/lib/verification-file-policy.ts')});
 const {decodeVehiclePhoto}=load('src/lib/vehicle-photo-input.ts',{'./supabase-storage':storage});
 const jpeg=Buffer.from([255,216,255,224,0,0]);
 const data='data:image/jpeg;base64,'+jpeg.toString('base64');
 assert.equal((await decodeVehiclePhoto(data)).extension,'jpg');
 await assert.rejects(decodeVehiclePhoto('data:image/jpeg;base64,aGVsbG8='));
 await assert.rejects(decodeVehiclePhoto('data:image/svg+xml;base64,aGVsbG8='));
 await assert.rejects(decodeVehiclePhoto('data:image/jpeg;base64,'+Buffer.alloc(900001).toString('base64')));
 let user={id:'owner',role:'CUSTOMER'},stored='old.jpg',fail=false,removed=[],uploaded=[];
 const job={id:'job',customerId:'owner',vehiclePhotoPath:stored,booking:{transporterId:'assigned'},quotes:[]};
 const table={findUnique:async()=>({...job,vehiclePhotoPath:stored}),findFirst:async({where})=>where.customerId==='owner'?job:null,findFirstOrThrow:async()=>({vehiclePhotoPath:stored}),update:async({data})=>{if(fail)throw Error('Database unavailable');stored=data.vehiclePhotoPath;return{id:'job',vehiclePhotoPath:stored}}};
 const prisma={transportJob:table,$transaction:fn=>fn({transportJob:table,$queryRaw:async()=>[]})};
 const {GET,PATCH}=load('src/app/api/jobs/[id]/photo/route.ts',{'@/lib/prisma':{prisma},'@/lib/auth':{currentUser:async()=>user},'@/lib/job-expiry':{isQuoteRequestOpen:()=>false},'@/lib/vehicle-photo-input':{decodeVehiclePhoto},'@/lib/vehicle-photo':load('src/lib/vehicle-photo.ts'),'@/lib/supabase-storage':{createVehiclePhotoPath:()=> 'new.jpg',uploadVehiclePhoto:async p=>uploaded.push(p),removeVehiclePhoto:async p=>removed.push(p),downloadVehiclePhoto:async()=>new Response(jpeg,{headers:{'content-type':'image/jpeg'}})}});
 const ctx={params:Promise.resolve({id:'job'})};
 const request=value=>new Request('https://example.test/api/jobs/job/photo',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({vehiclePhoto:value})});
 user=null;assert.equal((await GET(request(null),ctx)).status,401);
 user={id:'stranger',role:'CUSTOMER'};assert.equal((await GET(request(null),ctx)).status,403);assert.equal((await PATCH(request(data),ctx)).status,404);assert.equal(uploaded.length,0);
 user={id:'assigned',role:'TRANSPORTER'};assert.equal((await GET(request(null),ctx)).status,200);assert.equal((await PATCH(request(data),ctx)).status,403);
 user={id:'owner',role:'CUSTOMER'};fail=true;assert.equal((await PATCH(request(data),ctx)).status,400);assert.equal(stored,'old.jpg');assert.deepEqual(removed,['new.jpg']);
 fail=false;removed=[];assert.equal((await PATCH(request(data),ctx)).status,200);assert.equal(stored,'new.jpg');assert.deepEqual(removed,['old.jpg']);
 assert.equal((await PATCH(request(null),ctx)).status,200);assert.equal(stored,null);assert.equal((await GET(request(null),ctx)).status,404);
 console.log('PASS: image signatures/size, photo access permissions, failed replacement preservation, successful replacement cleanup and removal. Storage/database mocked.');
}
run().catch(error=>{console.error(error);process.exitCode=1});
