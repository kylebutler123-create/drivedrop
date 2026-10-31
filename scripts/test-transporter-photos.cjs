const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const swc=require('next/dist/build/swc');
const root=path.resolve(__dirname,'..');
function load(file,deps){const filename=path.join(root,file),exports={};const {code}=swc.transformSync(fs.readFileSync(filename,'utf8'),{filename,jsc:{parser:{syntax:'typescript'},target:'es2022'},module:{type:'commonjs'}});new Function('exports','require',code)(exports,id=>deps[id]||require(id));return exports}
let queries=[],role='CUSTOMER',customerId='c1',photoLookups=[];
const prisma={
 $queryRawUnsafe:async(sql,...args)=>{queries.push({sql,args});return sql.includes('TransporterVerification')?[{transporterId:'t1',transporterPhotoPath:'t1/person.jpg'},{transporterId:'t2',transporterPhotoPath:null}]:[]},
 booking:{findMany:async({where})=>{assert.deepEqual(where,role==='CUSTOMER'?{customerId}:role==='TRANSPORTER'?{transporterId:customerId}:{});return [{id:'b1',status:'CONFIRMED',agreedPricePence:10000,job:{id:'j1',vehiclePhotoPath:null},transporter:{id:'t1',name:'Example',phone:'07700900123',transporterVerification:{phone:null}},customer:{id:'c1'},evidence:[],messages:[],payment:null}]}},
 supportConversation:{findMany:async()=>[]},conversationInboxState:{findMany:async()=>[]},
};
const {transporterPhotoUrls}=load('src/lib/transporter-photo.ts',{'./prisma':{prisma},'./supabase-storage':{profileImageUrl:p=>p?'https://example.test/'+p:null}});
const {GET}=load('src/app/api/my-bookings/route.ts',{
 '@/lib/transporter-photo':{transporterPhotoUrls:async ids=>{photoLookups.push(ids);return transporterPhotoUrls(ids)}},
 '@/lib/prisma':{prisma},'@/lib/auth':{currentUser:async()=>role?{id:customerId,role}:null},
 '@/lib/finance':{calculateCustomerPrice:p=>({customerTotalPence:p+1000})},
 '@/lib/price-visibility':{customerPayment:p=>p,transporterRefund:()=>0},
});
(async()=>{
 assert.equal((await transporterPhotoUrls([])).size,0);assert.equal(queries.length,0);
 const photos=await transporterPhotoUrls(['t1','t1','t2']);assert.deepEqual(queries[0].args,['t1','t2']);assert.match(queries[0].sql,/IN \(\$1,\$2\)/);assert.equal(photos.get('t1'),'https://example.test/t1/person.jpg');assert.equal(photos.get('t2'),null);
 queries=[];let response=await GET(new Request('https://example.test/api/my-bookings'));let rows=await response.json();
 assert.equal(response.status,200);assert.deepEqual(photoLookups,[['t1']]);assert.equal(rows[0].transporter.transporterPhotoUrl,'https://example.test/t1/person.jpg');assert.equal(rows[0].transporter.phone,'07700900123');assert.equal(rows[0].agreedPricePence,11000);assert(!JSON.stringify(rows).includes('transporterPhotoPath'));
 for(const next of ['CUSTOMER','TRANSPORTER','ADMIN']){
  role=next;photoLookups=[];response=await GET(new Request('https://example.test/api/my-bookings?scope=messages'));rows=await response.json();assert.equal(photoLookups.length,0);assert.equal(rows[0].transporter.transporterPhotoUrl,undefined);
 }
 role='TRANSPORTER';photoLookups=[];response=await GET(new Request('https://example.test/api/my-bookings'));rows=await response.json();assert.equal(photoLookups.length,0);assert.equal(rows[0].transporter.transporterPhotoUrl,undefined);assert.equal(rows[0].agreedPricePence,10000);
 role=null;queries=[];response=await GET(new Request('https://example.test/api/my-bookings'));assert.equal(response.status,401);assert.equal(queries.length,0);
 console.log('PASS: one parameterized photo lookup per authorized customer booking batch; absent photos, message/other-role exclusion, phone/price preservation and signed-out rejection.');
})().catch(error=>{console.error(error);process.exitCode=1});
