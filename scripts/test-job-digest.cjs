const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),swc=require('next/dist/build/swc');
function load(relative,stubs={}){const file=path.resolve(relative),m=new Module(file,module);m.filename=file;m.paths=module.paths;const original=m.require.bind(m);m.require=id=>id in stubs?stubs[id]:original(id);m._compile(swc.transformSync(fs.readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript',tsx:true},target:'es2020'},module:{type:'commonjs'}}).code,file);return m.exports;}
async function main(){
 const RealDate=Date,instant=new RealDate('2026-10-19T08:10:00Z');
 global.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[instant]));}static now(){return instant.getTime();}};
 const originalTimeout=global.setTimeout;global.setTimeout=fn=>originalTimeout(fn,0);
 const DbNull=require('@prisma/client').Prisma.DbNull;
 let row=null,requests=[],failure=false,empty=false,noInsurance=false,users=[],lastJobQuery,updateWrites=[];
 function update(data){for(const [key,value] of Object.entries(data)){if(value===DbNull)row[key]=null;else if(value&&typeof value==='object'&&'increment'in value)row[key]+=value.increment;else row[key]=value;}return structuredClone(row);}
 const prisma={jobDigestRun:{
  upsert:async({create})=>{row??={...create,pending:null,cursor:null,completed:false,leaseUntil:null,sentCount:0,skippedCount:0,createdAt:new Date()};return row;},
  updateMany:async({where,data})=>{if(where.completed===false&&(row.completed||(row.leaseUntil&&row.leaseUntil>=new Date())))return{count:0};if(where.leaseToken&&row.leaseToken!==where.leaseToken)return{count:0};update(data);return{count:1};},
  findUniqueOrThrow:async()=>structuredClone(row),update:async({data})=>update(data),deleteMany:async()=>({count:0}),
 },user:{findMany:async({where,take})=>users.filter(u=>u.dailyJobEmails&&u.accountStatus==='ACTIVE'&&!u.workRestricted&&u.role==='TRANSPORTER'&&(!where.id?.gt||u.id>where.id.gt)&&(!where.id?.in||where.id.in.includes(u.id))).slice(0,take||1000),update:async args=>{updateWrites.push(args);return args.data;}},transportJob:{
  findMany:async args=>{lastJobQuery=args;return empty?[]:[{id:'job1',vehicleMake:'Audi',vehicleModel:'A6',collection:'London',delivery:'Manchester',collectionDate:new Date('2026-10-22'),transportType:'OPEN'}];},count:async()=>empty?0:1,
 }};
 const email={transactionalNotificationsEnabled:()=>true,sendTransactionalEmailBatch:async(messages,key)=>{requests.push({messages,key});if(failure)throw Error('Provider timeout');return{sent:true,count:messages.length};}};
 const lib=load('src/lib/job-digest.ts',{'./prisma':{prisma},'./job-expiry':load('src/lib/job-expiry.ts'),'./insurance-expiry-notifications':{insuranceStatusForVerification:()=>({state:noInsurance?'EXPIRED':'VALID'})},'./email':email,'./transport-types':load('src/lib/transport-types.ts')});
 process.env.RESEND_API_KEY='mock-key';process.env.VERCEL_ENV='preview';
 const makeUser=id=>({id,name:'Test transporter',email:`${id}@example.test`,dailyJobEmails:true,accountStatus:'ACTIVE',workRestricted:false,role:'TRANSPORTER'});
 const reset=()=>{row=null;requests=[];failure=false;empty=false;noInsurance=false;users=[makeUser('u001')];};
 reset();let result=await lib.sendDailyJobDigest();assert.equal(result.sent,1);assert.equal(row.completed,true);assert.equal(lastJobQuery.take,5);assert.deepEqual(lastJobQuery.where.status.in,['OPEN','QUOTED']);assert.equal(lastJobQuery.where.createdAt.gte.toISOString(),'2026-10-18T08:00:00.000Z');assert.equal(lastJobQuery.where.createdAt.lt.toISOString(),'2026-10-19T08:00:00.000Z');
 await lib.sendDailyJobDigest();assert.equal(requests.length,1,'completed run must not resend');
 reset();users=Array.from({length:205},(_,i)=>makeUser('u'+String(i).padStart(4,'0')));await lib.sendDailyJobDigest();assert.deepEqual(requests.map(r=>r.messages.length),[100,100,5]);assert.equal(row.sentCount,205);
 reset();users.push({...makeUser('u002'),dailyJobEmails:false},{...makeUser('u003'),workRestricted:true},{...makeUser('u004'),accountStatus:'SUSPENDED'},{...makeUser('u005'),role:'CUSTOMER'});await lib.sendDailyJobDigest();assert.equal(requests[0].messages.length,1);
 reset();noInsurance=true;await lib.sendDailyJobDigest();assert.equal(requests.length,0);
 reset();empty=true;await lib.sendDailyJobDigest();assert.equal(requests.length,0);assert.equal(row.completed,true);
 reset();failure=true;await assert.rejects(lib.sendDailyJobDigest());assert.ok(row.pending);assert.equal(row.leaseToken,null);failure=false;await lib.sendDailyJobDigest();assert.equal(requests.length,2);assert.deepEqual(requests[0],requests[1],'retry must retain exact payload/key');
 reset();failure=true;await assert.rejects(lib.sendDailyJobDigest());users[0].dailyJobEmails=false;failure=false;await lib.sendDailyJobDigest();assert.equal(requests.length,1,'no retry after opt-out');assert.equal(row.skippedCount,1);
 reset();failure=true;await assert.rejects(lib.sendDailyJobDigest());empty=true;failure=false;await lib.sendDailyJobDigest();assert.equal(requests.length,1,'no retry of unavailable jobs');
 reset();await prisma.jobDigestRun.upsert({create:{id:'test'}});row.leaseUntil=new Date(Date.now()+60000);await lib.sendDailyJobDigest();assert.equal(requests.length,0,'concurrent worker must not acquire lease');
 assert.equal(lib.digestWindow(new Date('2026-10-25T07:59:59Z')).end.toISOString(),'2026-10-24T08:00:00.000Z');assert.equal(lib.digestWindow(new Date('2026-10-25T08:00:00Z')).start.toISOString(),'2026-10-24T08:00:00.000Z');
 let user=null;
 const route=load('src/app/api/account/email-preferences/route.ts',{'@/lib/auth':{currentUser:async()=>user},'@/lib/prisma':{prisma}});
 const request=data=>new Request('https://example.test/api/account/email-preferences',{method:'PUT',body:JSON.stringify(data)});
 assert.equal((await route.PUT(request({dailyJobEmails:false}))).status,401);
 user={id:'customer',role:'CUSTOMER',accountStatus:'ACTIVE'};assert.equal((await route.PUT(request({dailyJobEmails:false}))).status,403);
 user={id:'owner',role:'TRANSPORTER',accountStatus:'ACTIVE'};assert.equal((await route.PUT(request({dailyJobEmails:'false'}))).status,400);assert.equal((await route.PUT(request({dailyJobEmails:false,userId:'someone-else'}))).status,400);
 assert.equal((await route.PUT(request({dailyJobEmails:false}))).status,200);assert.equal(updateWrites.at(-1).where.id,'owner');assert.equal(updateWrites.at(-1).data.dailyJobEmails,false);
 let called=0;const cron=load('src/app/api/cron/daily-job-summary/route.ts',{'@/lib/job-digest':{sendDailyJobDigest:async()=>{called++;return{state:'complete',sent:0}}}});process.env.CRON_SECRET='test-secret';
 assert.equal((await cron.GET(new Request('https://example.test/cron'))).status,401);assert.equal(called,0);assert.equal((await cron.GET(new Request('https://example.test/cron',{headers:{Authorization:'Bearer test-secret'}}))).status,200);assert.equal(called,1);
 const runtime=load('src/lib/payment-runtime.ts',{'./availability-error':load('src/lib/availability-error.ts')});
 const mail=load('src/lib/email.ts',{'./payment-runtime':runtime});assert.equal(mail.transactionalNotificationsEnabled(),true);process.env.VERCEL_ENV='production';assert.equal(mail.transactionalNotificationsEnabled(),false);
 process.env.NEXT_PUBLIC_APP_URL='https://production.example';
 const rendered=mail.resendMessage({to:'test@example.test',subject:'Test',heading:'Test',body:'<script>bad()</script>',preferencesPath:'/account#email-preferences'});assert.ok(rendered.html.includes('&lt;script&gt;'));assert.ok(rendered.html.includes('Manage job email preferences'));
 assert.ok(!fs.readFileSync('src/app/api/jobs/route.ts','utf8').includes('sendTransactionalEmail'));
 global.Date=RealDate;global.setTimeout=originalTimeout;
 console.log('PASS: 205 recipients in 100/100/5 batches; daily window; no-job/opt-out/restricted/insurance exclusions; concurrency lease; exact retries; changed-account/job safeguards; owner-only preference API; cron auth; production email guard. Database and provider mocked; no emails sent.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
