/** Authenticated UI + real local API checks using synthetic data. No live services. */
import {chromium, request} from 'playwright';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {mkdir,writeFile,stat,readFile} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import path from 'node:path';

const root=process.cwd(),baseline=process.argv[2],out=path.join(root,'account-browser-evidence');
const database=new URL(process.env.POSTGRES_PRISMA_URL||'');
if(process.env.CI!=='true'||process.env.DRIVEDROP_ISOLATED_BROWSER_TEST!=='true'||!['127.0.0.1','localhost'].includes(database.hostname)||database.port!=='55432'||database.pathname!=='/drivedrop_browser_ci')throw new Error('Isolated local CI database required.');
if(!baseline||!path.isAbsolute(baseline))throw new Error('Baseline checkout required');
await stat(path.join(baseline,'.next','BUILD_ID'));await mkdir(out,{recursive:true});
const results=[],servers=[],streams=[],states={},mobile=new Map();
const record=(name,passed,detail='')=>{results.push({name,status:passed?'PASS':'FAIL',detail});console.log(`${passed?'PASS':'FAIL'} ${name}${detail?' — '+detail:''}`)};
const hash=b=>createHash('sha256').update(b).digest('hex');
const bases={baseline:'http://localhost:3300',updated:'http://localhost:3301'};
const pages={
 customer:[
  {name:'dashboard',route:'/customer'},
  {name:'quote-requests',route:'/customer?view=quotes'},
  {name:'deliveries',route:'/customer?view=bookings'},
  {name:'completed',route:'/customer',click:'.customerDashboardSummary [role="button"]:has-text("Completed")'},
  {name:'cancelled',route:'/customer',click:'.customerDashboardSummary [role="button"]:has-text("Cancelled")'},
  {name:'account',route:'/account'},
  {name:'messages',route:'/messages'},
  {name:'notifications',route:'/notifications'},
  {name:'manage-requests',route:'/customer/manage-requests'},
  {name:'transporter-profile',route:'/transporter/profile/ci-transporter'},
  {name:'receipt',route:'/bookings/ci-booking-paid/statement'},
 ],
 transporter:[
  {name:'dashboard',route:'/transporter'},
  {name:'available-jobs',route:'/transporter',click:'[data-available-jobs-summary]'},
  {name:'active-deliveries',route:'/transporter?view=deliveries'},
  {name:'submitted-quotes',route:'/transporter/quotes'},
  {name:'completed',route:'/transporter/delivered'},
  {name:'proceeds',route:'/transporter/proceeds'},
  {name:'ready-proceeds',route:'/transporter/proceeds?filter=ready'},
  {name:'held-proceeds',route:'/transporter/proceeds?filter=held'},
  {name:'paid-proceeds',route:'/transporter/proceeds?filter=paid'},
  {name:'adjustments',route:'/transporter/proceeds?filter=fines'},
  {name:'verification',route:'/transporter/verification'},
  {name:'reviews',route:'/transporter/reviews'},
  {name:'account',route:'/account'},
  {name:'messages',route:'/messages'},
  {name:'notifications',route:'/notifications'},
  {name:'statement',route:'/bookings/ci-booking-paid/statement'},
 ],
 admin:[
  {name:'dashboard',route:'/admin'},
  {name:'verification',route:'/admin?action=verification'},
  {name:'disputes',route:'/admin?action=disputes'},
  {name:'payouts',route:'/admin/payouts'},
  {name:'review-moderation',route:'/admin/review-disputes'},
  {name:'messages',route:'/messages'},
  {name:'notifications',route:'/notifications'},
  {name:'account',route:'/account'},
 ],
};
async function server(name,cwd,port){
 const log=createWriteStream(path.join(out,`${name}-server.log`));streams.push(log);
 const child=spawn(process.execPath,[path.join(cwd,'node_modules/next/dist/bin/next'),'start','-H','127.0.0.1','-p',String(port)],{cwd,env:{...process.env,NODE_ENV:'production',VERCEL_ENV:'preview'},stdio:['ignore','pipe','pipe']});servers.push(child);child.stdout.pipe(log);child.stderr.pipe(log);
 for(let i=0;i<90;i++){try{const r=await fetch(bases[name]+'/',{signal:AbortSignal.timeout(3000)});if(r.ok)return}catch{}if(child.exitCode!==null)throw new Error(`${name} server exited`);await new Promise(r=>setTimeout(r,700))}throw new Error(`${name} server not ready`);
}
async function login(base,role){
 const api=await request.newContext({baseURL:base});
 const res=await api.post('/api/auth/login',{data:{email:`${role}@drivedrop.example.test`,password:'DriveDrop-local-fixture-2026!'}});
 const data=await res.json();record(`Actual login ${base} ${role}`,res.ok()&&data.role===role.toUpperCase(),String(res.status()));
 const identity=await api.get('/api/me');const me=await identity.json();
 if(!identity.ok()||me?.role!==role.toUpperCase())throw new Error('Real login session was not accepted on loopback; no authentication bypass will be attempted.');
 const state=await api.storageState();await api.dispose();return state;
}
async function open(browser,version,role,scenario,width){
 const context=await browser.newContext({storageState:states[`${version}-${role}`],viewport:{width,height:1000},locale:'en-GB',timezoneId:'Europe/London',reducedMotion:'reduce',deviceScaleFactor:1});
 await context.route('**/*',req=>{const u=new URL(req.request().url());return ['localhost','127.0.0.1'].includes(u.hostname)||['data:','blob:','about:'].includes(u.protocol)?req.continue():req.abort()});
 const page=await context.newPage(),errors=[],failed=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/api/')&&r.status()>=500)failed.push(`${r.status()} ${new URL(r.url()).pathname}`)});
 const response=await page.goto(bases[version]+scenario.route,{waitUntil:'networkidle',timeout:45000});
 if(scenario.click){await page.locator(scenario.click).first().click();await page.waitForLoadState('networkidle')}
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(Array.from(document.images,im=>{im.loading='eager';return im.decode().catch(()=>{})}))});
 // Wait for existing async dashboard data without changing application code.
 if(role==='customer'&&scenario.route.startsWith('/customer'))await page.waitForFunction(()=>!Array.from(document.querySelectorAll('.customerDashboardSummary strong')).some(e=>e.textContent==='—'));
 if(role==='transporter'&&scenario.route==='/transporter')await page.waitForFunction(()=>!Array.from(document.querySelectorAll('.dashboardSummary strong')).some(e=>e.textContent==='—'));
 await page.mouse.move(0,0);await page.evaluate(()=>scrollTo(0,0));
 return{context,page,response,errors,failed};
}
let browser;
try{
 await server('baseline',baseline,3300);await server('updated',root,3301);browser=await chromium.launch({headless:true});
 for(const version of ['baseline','updated']){
  // Reset ONLY the guarded local test database between versions, so read-state changes cannot skew comparisons.
  const seeded=await promisify(execFile)(process.execPath,['scripts/desktop-account-fixtures.mjs'],{cwd:root,env:process.env});console.log(seeded.stdout);
  for(const role of ['customer','transporter','admin']){
   states[`${version}-${role}`]=await login(bases[version],role);
   for(const width of version==='baseline'?[390]:[390,761,1024,1440,1920]){
    for(const scenario of pages[role]){
     let v;
     try{
      v=await open(browser,version,role,scenario,width);
      const identity=await v.context.request.get(bases[version]+'/api/me');const me=await identity.json();
      record(`${version} ${role} ${width} ${scenario.name}: authenticated`,identity.ok()&&me?.role===role.toUpperCase());
      record(`${version} ${role} ${width} ${scenario.name}: HTTP`,v.response?.status()===200,String(v.response?.status()));
      record(`${version} ${role} ${width} ${scenario.name}: client errors`,v.errors.length===0,v.errors.join(' | '));
      record(`${version} ${role} ${width} ${scenario.name}: API server errors`,v.failed.length===0,v.failed.join(' | '));
      const overflow=await v.page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
      record(`${version} ${role} ${width} ${scenario.name}: no horizontal overflow`,overflow.scroll<=width,JSON.stringify(overflow));
      if(width===390||width===1440){
       const png=await v.page.screenshot({fullPage:true,animations:'disabled',caret:'hide'});await writeFile(path.join(out,`${version}-${role}-${width}-${scenario.name}.png`),png);
       if(width===390){const key=`${role}-${scenario.name}`;if(version==='baseline')mobile.set(key,hash(png));else record(`AUTHENTICATED MOBILE UNCHANGED ${key}`,mobile.get(key)===hash(png),'390px exact screenshot comparison against pre-redesign source with identical isolated fixture data')}
      }
     }catch(error){record(`${version} ${role} ${width} ${scenario.name}: execution`,false,error.message);if(v)await v.page.screenshot({path:path.join(out,`error-${version}-${role}-${width}-${scenario.name}.png`),fullPage:true}).catch(()=>{})}
     finally{if(v)await v.context.close()}
    }
   }
  }
 }
 // Existing real APIs against synthetic local accounts only; no mocked financial endpoints.
 const apis={};for(const role of ['customer','transporter','admin'])apis[role]=await request.newContext({baseURL:bases.updated,storageState:states[`updated-${role}`]});
 const guest=await request.newContext({baseURL:bases.updated});
 record('Unauthenticated admin verification rejected',(await guest.get('/api/admin/verifications')).status()===403);
 record('Customer cannot access admin verification',(await apis.customer.get('/api/admin/verifications')).status()===403);
 record('Transporter cannot confirm customer receipt',(await apis.transporter.patch('/api/bookings/confirm-delivery',{data:{bookingId:'ci-booking-awaiting'}})).status()===403);
 const invalid=await apis.customer.post('/api/jobs',{data:{collection:'CI collection',delivery:'CI delivery',collectionDate:'2030-10-15',transportType:'ENCLOSED',vehicleType:'Van',vehicleMake:'CI',vehicleModel:'Invalid',running:true}});
 record('Server rejects incompatible enclosed/van request',invalid.status()===400);
 const jobRes=await apis.customer.post('/api/jobs',{data:{collection:'CI collection',delivery:'CI delivery',collectionDate:'2030-10-15',transportType:'OPEN',vehicleType:'Car',vehicleMake:'CI',vehicleModel:'Workflow',running:true}});const job=await jobRes.json();record('Local customer creates quote request',jobRes.status()===201&&job.status==='OPEN');
 const quoteRes=await apis.transporter.post('/api/quotes',{data:{jobId:job.id,pricePence:20000,message:'CI test quote, no live customer'}});const quote=await quoteRes.json();record('Local approved transporter submits quote',quoteRes.status()===201&&Boolean(quote.id),JSON.stringify({status:quoteRes.status(),error:quote.error}));
 const bookRes=await apis.customer.post('/api/bookings',{data:{quoteId:quote.id}});const booking=await bookRes.json();record('Customer accepts quote using existing Preview payment flow',bookRes.status()===201&&booking.status==='CONFIRMED'&&booking.payment?.status==='PAID');
 record('Existing fee calculation remains authoritative',booking.payment?.transportValuePence===22000&&booking.payment?.transporterProceedsPence===20000,JSON.stringify(booking.payment));
 const sent=await apis.customer.post('/api/bookings/messages',{multipart:{bookingId:booking.id,body:'Isolated CI message; no real customer or recipient.'}});record('Real local booking message can be sent',sent.status()===201);
 const received=await apis.transporter.get(`/api/bookings/messages?bookingId=${booking.id}`);const messages=await received.json();record('Other booking party can read the local message',received.ok()&&Array.isArray(messages)&&messages.some(x=>x.body.startsWith('Isolated CI message')));
 const fine=await apis.admin.post('/api/admin/disputes',{data:{disputeId:'ci-dispute-held',action:'FINE_TRANSPORTER'}});record('Admin records existing £50 fine in test database',fine.ok(),String(fine.status()));
 const confirmation=await apis.customer.patch('/api/bookings/confirm-delivery',{data:{bookingId:'ci-booking-awaiting'}});record('Customer confirms delivered test booking',confirmation.ok());
 const payout=await apis.admin.post('/api/admin/payments/payout',{data:{paymentId:'ci-payment-awaiting'}});const payment=await payout.json();record('Existing sandbox payout releases after confirmation',payout.ok()&&payment.payoutStatus==='PAID',JSON.stringify({status:payout.status(),error:payment.error}));
 record('Existing £50 fine deducted once from eligible test proceeds',payment.cancellationDeductionPence===5000&&payment.transporterProceedsPence===25000);
 const repeat=await apis.admin.post('/api/admin/payments/payout',{data:{paymentId:'ci-payment-awaiting'}});record('Repeated payout request does not pay twice',repeat.status()===400);
 const held=await apis.admin.post('/api/admin/payments/payout',{data:{paymentId:'ci-payment-held'}});record('Active dispute prevents payout',held.status()===400);
 for(const api of [...Object.values(apis),guest])await api.dispose();
}catch(error){record('Authenticated suite execution',false,error.stack||error.message)}
finally{
 if(browser)await browser.close();for(const child of servers)child.kill('SIGTERM');for(const stream of streams)stream.end();
 const report={scope:'Authenticated UI using synthetic local PostgreSQL fixtures, mobile screenshot comparisons, and selected real local API workflows. No production data, external email, live payments or external evidence storage. Real-device/Safari and upload integrations NOT tested.',commit:process.env.GITHUB_SHA,baseline:process.env.BASELINE_REF,pass:results.filter(x=>x.status==='PASS').length,fail:results.filter(x=>x.status==='FAIL').length,results};
 await writeFile(path.join(out,'results.json'),JSON.stringify(report,null,2));const summary=`# Isolated account checks\n\n${report.pass} passed; ${report.fail} failed.\n\n${report.scope}\n\n`+results.filter(x=>x.status==='FAIL').map(x=>`- ${x.name}: ${x.detail}`).join('\n');await writeFile(path.join(out,'summary.md'),summary);if(process.env.GITHUB_STEP_SUMMARY)await writeFile(process.env.GITHUB_STEP_SUMMARY,summary);if(report.fail)process.exitCode=1;
}
