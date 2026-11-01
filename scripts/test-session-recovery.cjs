const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const swc=require('next/dist/build/swc');
const root=path.resolve(__dirname,'..');
function load(file,dependencies){
 const filename=path.join(root,file),exports={};
 const {code}=swc.transformSync(fs.readFileSync(filename,'utf8'),{filename,jsc:{parser:{syntax:'typescript',tsx:file.endsWith('.tsx')},transform:{react:{runtime:'automatic'}},target:'es2022'},module:{type:'commonjs'}});
 new Function('exports','require',code)(exports,id=>dependencies[id]||require(id));
 return exports;
}
const devices={first:new Map(),second:new Map()},sessions=new Map();
let device='first',readOnly=false;
const jar={
 get:name=>devices[device].has(name)?{value:devices[device].get(name)}:undefined,
 set(name,value){assert(!readOnly,'Session reads must not write cookies during server rendering');devices[device].set(name,value)},
 delete(name){assert(!readOnly,'Session reads must not delete cookies during server rendering');devices[device].delete(name)},
};
const session={
 async findUnique({where}){return sessions.get(where.tokenHash)||null},
 async create({data}){sessions.set(data.tokenHash,{...data,user:{id:data.userId,name:'Example',email:'example@example.test',role:'CUSTOMER'}})},
 async deleteMany({where}){
  for(const [key,row] of sessions)if(where.tokenHash===key||where.OR?.some(item=>item.userId===row.userId||(item.expiresAt&&row.expiresAt<item.expiresAt.lt)))sessions.delete(key);
 },
};
const auth=load('src/lib/auth.ts',{'next/headers':{cookies:async()=>jar},'./prisma':{prisma:{session,$transaction:async fn=>fn({session})}}});
const me=load('src/app/api/me/route.ts',{'@/lib/auth':auth});
(async()=>{
 assert.equal(await auth.currentUser(),null);
 await auth.createSession('example-user');
 const firstCookie=devices.first.get('drivedrop_session');
 assert.equal((await auth.currentUser()).id,'example-user');
 let response=await me.GET();assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/private, no-store/);
 device='second';await auth.createSession('example-user');
 assert.equal(sessions.size,1,'Second-device sign-in keeps the single-session policy');
 assert.notEqual(devices.second.get('drivedrop_session'),firstCookie);
 assert.equal((await auth.currentUser()).id,'example-user');
 device='first';assert.equal(devices.first.get('drivedrop_session'),firstCookie);
 readOnly=true;assert.equal(await auth.currentUser(),null);
 response=await me.GET();assert.equal(response.status,401);assert.match(response.headers.get('cache-control'),/private, no-store/);
 readOnly=false;await auth.clearSession();assert.equal(sessions.size,1,'Old-device logout must not remove the newer session');
 device='second';assert.equal((await auth.currentUser()).id,'example-user');
 const active=[...sessions.values()][0];active.expiresAt=new Date(Date.now()-1000);
 readOnly=true;assert.equal(await auth.currentUser(),null,'Expired sessions render as signed out without mutating cookies');
 response=await me.GET();assert.equal(response.status,401);
 readOnly=false;await auth.createSession('example-user');assert.equal(sessions.size,1,'New sign-in cleans expired records');
 await auth.clearSession();assert.equal(sessions.size,0);assert.equal(await auth.currentUser(),null);
 console.log('PASS: second-device revocation, no-store session responses, safe old-device logout, read-only expired-session rendering, re-sign-in and cleanup.');
 const routing=load('src/lib/dashboard-login.ts',{});
 const {dashboardAccount,dashboardLoginTarget}=routing;
 const transporterLink='/transporter?view=deliveries#booking-fixture';
 const customerLink='/customer?view=bookings&bookingId=fixture';
 const target=(account,returnTo)=>dashboardLoginTarget(new URLSearchParams({account,returnTo}));
 assert.equal(target('transporter',transporterLink).href,transporterLink);
 assert.equal(target('customer',customerLink).href,customerLink);
 for(const href of [customerLink,'/transporter/profile/fixture','//example.test/transporter','https://example.test/transporter','/transporter/../admin','/transporter\\evil']){
  assert.equal(target('transporter',href),null);
 }
 assert.equal(dashboardAccount('/transporter/profile/fixture'),null);
 let pathname='/transporter';
 const Boundary=load('src/app/components/SessionBoundary.tsx',{
  '@/lib/dashboard-login':routing,
  'next/navigation':{usePathname:()=>pathname,useSearchParams:()=>new URLSearchParams('view=deliveries')},
 }).default;
 const shell=role=>require('react-dom/server').renderToStaticMarkup(require('react').createElement(Boundary,{user:{id:'fixture',role}},'dashboard content'));
 assert.equal(shell('CUSTOMER'),'','Do not render the transporter dashboard under the customer shell');
 assert.equal(shell('TRANSPORTER'),'dashboard content');
 pathname='/customer';assert.equal(shell('TRANSPORTER'),'');assert.equal(shell('CUSTOMER'),'dashboard content');
 pathname='/transporter/profile/fixture';assert.equal(shell('CUSTOMER'),'dashboard content');
 const created=[];
 const hash=await require('bcryptjs').hash('test-password',4);
 const login=load('src/app/api/auth/login/route.ts',{
  '@/lib/auth':{createSession:async id=>created.push(id)},
  '@/lib/prisma':{prisma:{user:{findUnique:async ({where})=>({id:where.email,role:where.email.startsWith('customer')?'CUSTOMER':'TRANSPORTER',accountStatus:'ACTIVE',passwordHash:hash})}}},
  '@/lib/rate-limit':{checkRateLimit:()=>({allowed:true})}
 });
 const attempt=(email,expectedRole,password='test-password')=>login.POST(new Request('https://example.test/api/auth/login',{
  method:'POST',body:JSON.stringify({email,password,expectedRole})
 }));
 assert.equal((await attempt('customer@example.test','TRANSPORTER','wrong-password')).status,401);
 assert.equal((await attempt('customer@example.test','TRANSPORTER')).status,403);
 assert.equal((await attempt('transporter@example.test','CUSTOMER')).status,403);
 assert.deepEqual(created,[],'Wrong-account attempts must not replace the current session');
 assert.equal((await attempt('transporter@example.test','TRANSPORTER')).status,200);
 assert.equal((await attempt('customer@example.test')).status,200);
 assert.deepEqual(created,['transporter@example.test','customer@example.test']);
 console.log('PASS: dashboard return paths, public profile exception, role-bound account switching and ordinary sign-in.');
})().catch(error=>{console.error(error);process.exitCode=1});
