const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),swc=require('next/dist/build/swc');
function load(relative,stubs={}){const file=path.resolve(relative),m=new Module(file,module);m.filename=file;m.paths=module.paths;const original=m.require.bind(m);m.require=id=>id in stubs?stubs[id]:original(id);m._compile(swc.transformSync(fs.readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript',tsx:true},target:'es2020'},module:{type:'commonjs'}}).code,file);return m.exports;}
(async()=>{
 const savedFetch=global.fetch,savedKey=process.env.IDEAL_POSTCODES_API_KEY;process.env.IDEAL_POSTCODES_API_KEY='local-test-only';
 let user={role:'TRANSPORTER'},calls=[],fail=false,foreign=false,missingCoords=false;
 const point={latitude:53.47894,longitude:-2.245278};
 global.fetch=async(url)=>{
  const u=new URL(url);calls.push(u);
  if(fail)return Response.json({error:'unavailable'},{status:503});
  if(u.hostname==='api.postcodes.io'){
   if(u.pathname==='/places')return Response.json({result:u.searchParams.get('q')==='Belfast'?[]:[{code:'osgb123',name_1:'Manchester',county_unitary:'Greater Manchester',country:'England',...point}]});
   return Response.json({result:{name_1:'Manchester',...point}});
  }
  if(u.pathname==='/v1/places')return Response.json({result:{hits:[{id:'geonames_123',name:'Belfast',descriptive_name:'Belfast, Northern Ireland',country_iso:'GBR'},{id:'geonames_456',name:'Belfast',descriptive_name:'Belfast, USA',country_iso:'USA'}]}});
  if(u.pathname.startsWith('/v1/places/'))return Response.json({result:{name:'Belfast',country_iso:foreign?'USA':'GBR',latitude:54.597,longitude:-5.93}});
  const postcode=u.pathname.split('/').pop();
  return Response.json({result:[missingCoords?{latitude:'',longitude:''}:postcode==='M11AA'?point:{latitude:52.48,longitude:-1.89}]});
 };
 const location=load('src/lib/job-locations.ts');
 const stubs={'@/lib/auth':{currentUser:async()=>user},'@/lib/job-locations':location};
 const {GET}=load('src/app/api/jobs/locations/route.ts',stubs),{POST}=load('src/app/api/jobs/radius/route.ts',stubs);
 const search=q=>GET(new Request('https://app.example.test/api/jobs/locations?q='+encodeURIComponent(q)));
 const radius=body=>POST(new Request('https://app.example.test/api/jobs/radius',{method:'POST',body:JSON.stringify(body)}));
 const jobs=[{id:'near',collection:'Manchester M1 1AA'},{id:'duplicate',collection:'Different street M1 1AA'},{id:'far',collection:'Birmingham B1 1AA'},{id:'unknown',collection:'Address without postcode'}];
 try{
  for(const role of [null,'CUSTOMER','ADMIN']){user=role?{role}:null;assert.equal((await search('Manchester')).status,403);assert.equal((await radius({origin:{kind:'place',id:'osgb123'},jobs})).status,403)}assert.equal(calls.length,0);user={role:'TRANSPORTER'};
  assert.deepEqual((await (await search('Ma')).json()).hits,[]);assert.equal((await search('x'.repeat(101))).status,400);
  const postcode=(await (await search('m11aa')).json()).hits[0];assert.equal(postcode.name,'M1 1AA');assert.equal(postcode.origin.kind,'postcode');assert.equal(calls.length,0);
  const city=(await (await search('Manchester')).json()).hits[0];assert.equal(city.name,'Manchester');assert.equal(city.origin.id,'osgb123');assert.match(city.description,/Greater Manchester/);
  const ni=(await (await search('Belfast')).json()).hits;assert.equal(ni.length,1);assert.equal(ni[0].name,'Belfast');assert.equal(calls.at(-1).searchParams.get('country_iso'),'GBR');
  calls=[];const response=await radius({origin:city.origin,jobs});assert.equal(response.status,200);const result=await response.json();assert.equal(result.origin,'Manchester');assert.equal(result.distances[0].miles,0);assert.ok(result.distances[2].miles>25);assert.equal(result.distances[3].miles,null);assert.equal(result.unlocatedCount,1);assert.equal(calls.filter(url=>url.pathname.includes('/postcodes/')).length,2);
  const old=await radius({postcode:'M1 1AA',jobs});assert.equal(old.status,200);assert.equal((await old.json()).origin,'M1 1AA');
  assert.equal((await radius({origin:{kind:'coordinates',point:{lat:53.48,lon:-2.24},label:'your location'},jobs})).status,200);
  for(const origin of [{kind:'coordinates',point:{lat:100,lon:-2},label:'Invalid'},{kind:'coordinates',point:{lat:0,lon:0},label:'Outside UK'},{kind:'place',id:'../../keys'},{kind:'postcode',postcode:'Manchester'}])assert.equal((await radius({origin,jobs})).status,400);
  assert.equal((await radius({jobs})).status,400);assert.equal((await radius({postcode:'M1 1AA',jobs:Array(201).fill(jobs[0])})).status,400);
  foreign=true;assert.equal((await radius({origin:{kind:'place',id:'geonames_123'},jobs})).status,503);foreign=false;
  missingCoords=true;assert.equal((await radius({postcode:'M1 1AA',jobs})).status,503);missingCoords=false;
  fail=true;assert.equal((await search('Manchester')).status,503);const failed=await radius({origin:city.origin,jobs});assert.equal(failed.status,503);assert.ok(!(await failed.text()).includes('local-test-only'));
  assert.equal(location.collectionMiles({lat:53,lon:-2},{lat:53,lon:-2}),0);
  console.log('PASS nearby jobs: role checks, town/postcode/NI searches, coordinates, legacy requests, real distances, deduplication, missing data, invalid inputs and provider failures');
 }finally{global.fetch=savedFetch;if(savedKey===undefined)delete process.env.IDEAL_POSTCODES_API_KEY;else process.env.IDEAL_POSTCODES_API_KEY=savedKey}
})().catch(error=>{console.error(error);process.exitCode=1});
