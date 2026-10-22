// Offline only: every provider, email and database call is replaced by a fixture.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), {createHmac} = require('node:crypto');
const swc = require('next/dist/build/swc');
const {context: refundContext} = require('./test-stripe-refunds.cjs');
const {context: payoutContext} = require('./test-stripe-connect.cjs');
const root = path.resolve(__dirname, '..'), original = {...process.env}, originalFetch = global.fetch;
const envKeys = ['VERCEL_ENV','NODE_ENV','STRIPE_PAYMENTS_ENABLED','STRIPE_CHECKOUT_ENABLED','STRIPE_CONNECT_ENABLED',
  'STRIPE_REFUNDS_ENABLED','STRIPE_ALTERNATIVE_REFUNDS_ENABLED','STRIPE_PLATFORM_ACCOUNT_ID','STRIPE_SECRET_KEY',
  'STRIPE_CONNECT_SECRET_KEY','STRIPE_WEBHOOK_SECRET','STRIPE_CONNECT_WEBHOOK_SECRET','STRIPE_CONNECT_EVENTS_SECRET',
  'CRON_SECRET','NEXT_PUBLIC_APP_URL','STRIPE_CHECKOUT_ORIGIN','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY',
  'POSTGRES_PRISMA_URL','RESEND_API_KEY','TRANSACTIONAL_EMAILS_ENABLED','TRANSACTIONAL_EMAILS_SENDER_VERIFIED','DISPUTES_ENABLED'];
function environment(mode = 'production') {
  for (const key of envKeys) delete process.env[key];
  Object.assign(process.env, {VERCEL_ENV: mode, NODE_ENV:'test'});
  global.fetch = async () => {throw Error('Unexpected network call in offline test');};
}
function configured() {
  environment();
  Object.assign(process.env, {STRIPE_PAYMENTS_ENABLED:'true', STRIPE_PLATFORM_ACCOUNT_ID:'acct_ProductionFixture',
    STRIPE_SECRET_KEY:['rk','live','NOT_A_KEY'].join('_'), STRIPE_CONNECT_SECRET_KEY:['rk','live','NOT_A_KEY'].join('_'),
    STRIPE_WEBHOOK_SECRET:'fixture-checkout', STRIPE_CONNECT_WEBHOOK_SECRET:'fixture-connect',
    STRIPE_CONNECT_EVENTS_SECRET:'fixture-thin', CRON_SECRET:'fixture-cron',
    NEXT_PUBLIC_APP_URL:'https://production.example', STRIPE_CHECKOUT_ORIGIN:'https://production.example',
    SUPABASE_URL:'https://srqhjgrhgyyfdaxckjum.supabase.co', SUPABASE_SERVICE_ROLE_KEY:'fixture-only',
    POSTGRES_PRISMA_URL:'postgresql://postgres:fixture@db.srqhjgrhgyyfdaxckjum.supabase.co/postgres'});
}
function loader(mocks = {}) {
  const cache = {};
  return function load(file) {
    const full = path.resolve(root, file);
    if (full in mocks) return mocks[full];
    if (cache[full]) return cache[full];
    const exports = cache[full] = {};
    const code = swc.transformSync(fs.readFileSync(full,'utf8'), {filename:full,
      jsc:{parser:{syntax:'typescript',tsx:full.endsWith('.tsx')},target:'es2022',transform:{react:{runtime:'automatic'}}}, module:{type:'commonjs'}}).code;
    new Function('exports','require','console',code)(exports, name => {
      if (name in mocks) return mocks[name];
      if (name.startsWith('.') || name.startsWith('@/')) {
        const resolved=(name.startsWith('@/') ? path.join(root,'src',name.slice(2)) : path.resolve(path.dirname(full),name));
        return load(resolved+(fs.existsSync(resolved+'.ts')?'.ts':'.tsx'));
      }
      return require(name);
    }, {error(){}});
    return exports;
  };
}
const emptyDb = {[path.join(root,'src/lib/prisma.ts')]:{prisma:{}}};
const load = loader(emptyDb), runtime = load('src/lib/payment-runtime.ts');
const checkout = load('src/lib/booking-authorisation-provider.ts'), connect = load('src/lib/stripe-connect-provider.ts');
const refunds = load('src/lib/stripe-refunds.ts'), payouts = load('src/lib/stripe-payouts.ts');
const alternative = load('src/lib/alternative-refunds.ts'), email = load('src/lib/email.ts');

(async () => {
  environment('preview'); assert.equal(checkout.authorisationProvider(),'TEST');
  process.env.STRIPE_SECRET_KEY=['rk','live','NOT_A_KEY'].join('_'); assert.throws(checkout.authorisationProvider,/test-mode/);
  environment(); assert.throws(checkout.authorisationProvider,/production/);
  delete process.env.VERCEL_ENV; process.env.NODE_ENV='production'; assert.equal(runtime.paymentEnvironment(),'production');
  assert.throws(checkout.authorisationProvider,/production/); assert.throws(runtime.assertTestFinanceAllowed,/Test finance/);
  process.env.VERCEL_ENV='staging'; assert.throws(runtime.paymentEnvironment,/Unsupported/);

  const badConfiguration = [
    ['STRIPE_PLATFORM_ACCOUNT_ID','acct_1US4BzLAzgkvCvrI'], ['STRIPE_PLATFORM_ACCOUNT_ID',''],
    ['STRIPE_CHECKOUT_ORIGIN','https://preview.example'], ['NEXT_PUBLIC_APP_URL','http://production.example'],
    ['NEXT_PUBLIC_APP_URL','https://production.example/path'], ['SUPABASE_URL','https://yozbuuvebzxitoqrvyer.supabase.co'],
    ['POSTGRES_PRISMA_URL','postgresql://postgres:fixture@db.yozbuuvebzxitoqrvyer.supabase.co/postgres'],
    ['STRIPE_SECRET_KEY',['rk','test','NOT_A_KEY'].join('_')], ['STRIPE_SECRET_KEY',['sk','live','NOT_A_KEY'].join('_')],
    ['STRIPE_CONNECT_SECRET_KEY',''], ['STRIPE_CONNECT_SECRET_KEY',['rk','test','NOT_A_KEY'].join('_')],
    ['STRIPE_WEBHOOK_SECRET',''], ['STRIPE_CONNECT_WEBHOOK_SECRET',''], ['STRIPE_CONNECT_EVENTS_SECRET',''],
    ['CRON_SECRET',''], ['CRON_SECRET','   '], ['STRIPE_PAYMENTS_ENABLED','false'],
  ];
  for (const [key,value] of badConfiguration) {
    configured(); process.env[key]=value;
    assert.throws(checkout.authorisationProvider,key);
    assert.throws(connect.connectClient,key);
  }
  configured(); assert.equal(checkout.authorisationProvider(),'STRIPE');
  assert.throws(checkout.assertNewCheckoutAllowed,/paused/);
  assert.equal(connect.connectEnabled(),false); assert.equal(connect.connectReconciliationEnabled(),true);
  assert.equal(refunds.stripeRefundsEnabled(),false); assert.equal(refunds.stripeRefundRecoveryEnabled(),true);
  assert.equal(alternative.alternativeRefundsEnabled(),false); assert.equal(alternative.alternativeRefundEvidenceEnabled(),true);
  await assert.rejects(() => refunds.prepareStripeRefund({}),/paused/);
  await assert.rejects(() => payouts.prepareStripePayout('payment','admin'),/paused/);
  await assert.rejects(() => load('src/lib/stripe-connect-accounts.ts').createOrGetConnectAccount({}),/paused/);
  assert.throws(runtime.assertTestFinanceAllowed,/Test finance/);
  process.env.STRIPE_CHECKOUT_ENABLED='true'; checkout.assertNewCheckoutAllowed();
  assert.equal(load('src/lib/features.ts').disputesEnabled(),false);
  process.env.DISPUTES_ENABLED='true'; assert.equal(load('src/lib/features.ts').disputesEnabled(),true);
  console.log('PASS: fail-closed production configuration, database/account/origin binding, TEST denial and independent creation/recovery controls');

  let accountId='acct_wrong', requests=[];
  global.fetch=async (url,options) => {requests.push({url,method:options.method||'GET'}); return Response.json(url.endsWith('/account')?{id:accountId}:{id:'pi_fixture'});};
  await assert.rejects(() => checkout.stripeRequest('payment_intents/pi_fixture/capture',{}),/account/);
  assert.equal(requests.length,1); accountId='acct_ProductionFixture'; requests=[];
  assert.equal((await checkout.stripeRequest('payment_intents/pi_fixture')).id,'pi_fixture');
  assert.deepEqual(requests.map(r=>r.method),['GET','GET']);
  let providerIdentity='acct_wrong';
  class OfflineStripe {constructor(){this.accounts={retrieveCurrent:async()=>({id:providerIdentity})};}}
  OfflineStripe.errors=require('stripe').errors;
  const checkedConnect=loader({...emptyDb,stripe:OfflineStripe})('src/lib/stripe-connect-provider.ts');
  await assert.rejects(checkedConnect.verifiedConnectClient,/account/);
  providerIdentity='acct_ProductionFixture'; await checkedConnect.verifiedConnectClient();
  process.env.STRIPE_CONNECT_SECRET_KEY=['rk','test','NOT_A_KEY'].join('_'); assert.throws(checkedConnect.connectClient,/matching/);

  configured();
  const timestamp=Math.floor(Date.now()/1000), event=live=>JSON.stringify({id:'evt_fixture',livemode:live});
  const signature=raw=>`t=${timestamp},v1=${createHmac('sha256',process.env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${raw}`).digest('hex')}`;
  assert.equal(checkout.verifyStripeEvent(event(true),signature(event(true))).id,'evt_fixture');
  assert.throws(()=>checkout.verifyStripeEvent(event(false),signature(event(false))),/environment/);
  assert.throws(()=>checkout.verifyStripeEvent(event(true)+' ',signature(event(true))),/invalid/);
  const account={livemode:true,metadata:{driveDropUserId:'user',environment:'production'},dashboard:'express',identity:{country:'gb'},
    defaults:{currency:'gbp',responsibilities:{fees_collector:'application',losses_collector:'application'}},
    configuration:{recipient:{capabilities:{stripe_balance:{stripe_transfers:{status:'active'},payouts:{status:'active'}}}}}};
  const accounts=load('src/lib/stripe-connect-accounts.ts'); assert.equal(accounts.accountReadiness(account,'user').status,'READY');
  for(const mutate of [a=>a.livemode=false,a=>a.metadata.environment='preview',a=>a.identity.country='us',a=>a.defaults.currency='usd']){
    const bad=structuredClone(account);mutate(bad);assert.throws(()=>accounts.accountReadiness(bad,'user'));
  }
  console.log('PASS: both restricted keys verify platform identity; signed webhook mode and live UK/GBP capability checks reject mismatches');

  for(const failure of [null,'lostRefund','lostCommit','lostReversal','lostRecoveryCommit']){
    configured();process.env.STRIPE_CONNECT_ENABLED='true';process.env.STRIPE_REFUNDS_ENABLED='true';
    const c=refundContext({environment:'production',...(failure?{[failure]:true}:{})});
    const row=await c.engine.prepareStripeRefund(c.input());
    process.env.STRIPE_CONNECT_ENABLED='false';process.env.STRIPE_REFUNDS_ENABLED='false';
    await assert.rejects(()=>c.engine.prepareStripeRefund(c.input(100,0)),/paused/);
    await c.engine.reconcileStripeRefund(row.id);await c.engine.reconcileStripeRefund(row.id);
    assert.equal(c.external.length,1,failure);assert.equal(c.reversals.length,1,failure);
    assert.equal(c.state().payment.refundedPence,11000);assert.equal(c.state().payment.payoutStatus,'CANCELLED');
    assert.equal(c.state().notifications.length,2);assert.equal(c.external[0].metadata.environment,'production');
    assert.equal(c.state().refunds[0].recoveryStatus,'RECOVERED');
  }
  for(const failure of [null,'timeoutOnce','loseCommit']){
    configured();process.env.STRIPE_CONNECT_ENABLED='true';
    const c=payoutContext({environment:'production',...(failure?{[failure]:true}:{})});
    const row=await c.engine.prepareStripePayout('pay_test','admin');process.env.STRIPE_CONNECT_ENABLED='false';
    await assert.rejects(()=>c.engine.prepareStripePayout('pay_test','admin'),/paused/);
    await c.engine.reconcileStripePayout(row.id);await c.engine.reconcileStripePayout(row.id);
    assert.equal(c.external.length,1);assert.equal(c.state().payment.payoutStatus,'PAID');
    assert.equal(c.external[0].livemode,true);assert.equal(c.external[0].metadata.environment,'production');
    assert.equal(new Set(c.keys).size,1);assert.equal(c.state().reservations,1);
  }
  configured();process.env.STRIPE_CONNECT_ENABLED='true';process.env.STRIPE_REFUNDS_ENABLED='true';
  const wrongMode=refundContext({environment:'production'});wrongMode.intent.livemode=false;
  await assert.rejects(()=>wrongMode.engine.prepareStripeRefund(wrongMode.input()));assert.equal(wrongMode.refundCalls.length,0);
  environment('preview');process.env.STRIPE_CONNECT_ENABLED='true';process.env.STRIPE_REFUNDS_ENABLED='false';
  assert.equal(refunds.stripeRefundRecoveryEnabled(),false);
  console.log('PASS: production pending refunds/reversals/transfers recover once through response/commit loss while creation is paused; preview off behavior preserved');

  configured();let user={id:'admin',role:'ADMIN',accountStatus:'ACTIVE'}, provider='TEST', callbacks=[], created=0, payoutLookup;
  const routeMocks={...emptyDb,'next/server':{NextResponse:{json:Response.json},after:fn=>callbacks.push(fn)},
    [path.join(root,'src/lib/auth.ts')]:{currentUser:async()=>user},
    [path.join(root,'src/lib/prisma.ts')]:{prisma:{bookingPayment:{findUnique:async()=>({provider})},stripePayout:{findFirst:async({where})=>{payoutLookup=where;return where.id==='existing'?{id:'existing'}:null;}}}},
    [path.join(root,'src/lib/stripe-refunds.ts')]:{prepareStripeRefund:async()=>{created++;return{id:'refund',status:'PENDING'};},reconcileStripeRefund:async()=>{},stripeRefundRecoveryEnabled:()=>true},
    [path.join(root,'src/lib/stripe-payouts.ts')]:{prepareStripePayout:async()=>{created++;return{id:'payout',status:'PENDING'};},reconcileStripePayout:async()=>{}}};
  const routes=loader(routeMocks), refundRoute=routes('src/app/api/admin/payments/refund/route.ts'), payoutRoute=routes('src/app/api/admin/payments/payout/route.ts');
  const request=(origin='https://production.example')=>new Request('https://production.example/api/admin/payments/refund',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({paymentId:'pay',amountPence:100,expectedRefundedPence:0})});
  assert.equal((await refundRoute.POST(request())).status,403);assert.equal((await payoutRoute.POST(request())).status,403);assert.equal(created,0);
  provider='STRIPE';user.role='CUSTOMER';assert.equal((await payoutRoute.POST(request())).status,403);assert.equal(created,0);
  user.role='ADMIN';user.accountStatus='SUSPENDED';assert.equal((await refundRoute.POST(request())).status,403);
  user.accountStatus='ACTIVE';assert.equal((await refundRoute.POST(request('https://foreign.example'))).status,403);
  assert.equal((await payoutRoute.POST(request('https://foreign.example'))).status,403);assert.equal(created,0);
  for(const route of [refundRoute,payoutRoute]){const absent=request();absent.headers.delete('origin');assert.equal((await route.POST(absent)).status,403);}
  assert.equal((await refundRoute.POST(request())).status,202);assert.equal((await payoutRoute.POST(request())).status,202);assert.equal(created,2);assert.equal(callbacks.length,2);
  const recoveryRequest=id=>new Request('https://production.example/api/admin/payments/payout',{method:'PATCH',headers:{origin:'https://production.example','content-type':'application/json'},body:JSON.stringify({payoutId:id})});
  assert.equal((await payoutRoute.PATCH(recoveryRequest('missing'))).status,404);
  assert.equal((await payoutRoute.PATCH(recoveryRequest('existing'))).status,202);
  assert.deepEqual(payoutLookup,{id:'existing',environment:'production'});assert.equal(created,2);assert.equal(callbacks.length,3);
  const missingOrigin=recoveryRequest('existing');missingOrigin.headers.delete('origin');assert.equal((await payoutRoute.PATCH(missingOrigin)).status,403);
  console.log('PASS: active administrator and same-origin production routes; TEST finance cannot reach a mutation with live mode enabled');

  configured();let queries=[], stages=[], finished, healthRuns=[], backlog=[];
  const sql=(strings,...values)=>strings.reduce((s,part,i)=>s+part+(i<values.length?(values[i]?.sql||String(values[i])):''),'');
  const db={availabilityRequest:{findMany:async()=>{stages.push('authorisation');throw Error('fixture failure');}},
    $queryRaw:async(...args)=>{const q=sql(...args);queries.push(q);return q.includes('pg_try_advisory')?[{locked:true}]:q.includes("SELECT 'authorisations'")?backlog:q.includes('order by started_at')?healthRuns:[];},
    $executeRaw:async(...args)=>{const q=sql(...args);queries.push(q);if(q.includes('finished_at = now()')&&q.includes('checked ='))finished=q;return 1;}};
  db.$transaction=async fn=>fn(db);
  const recovery=loader({[path.join(root,'src/lib/prisma.ts')]:{prisma:db},
    [path.join(root,'src/lib/stripe-payouts.ts')]:{recoverStripePayouts:async()=>{stages.push('payout');return{checked:1,failed:0};}},
    [path.join(root,'src/lib/stripe-refunds.ts')]:{recoverStripeRefunds:async()=>{stages.push('refund');return{checked:1,failed:0};}}})('src/lib/booking-authorisation-recovery.ts');
  const run=await recovery.claimPaymentRecoveryRun();assert.equal(run.created,true);await recovery.completePaymentRecoveryRun(run.id);
  assert.deepEqual(stages,['authorisation','payout','refund']);assert(queries.some(q=>q.includes('drivedrop_production_ops.booking_authorisation_runs')));
  assert(queries.every(q=>!q.includes('drivedrop_preview_ops')));assert(finished.includes('failed'));assert(finished.includes('checked = 2'));
  assert.equal((await recovery.paymentRecoveryHealth()).healthy,false);
  healthRuns=[{status:'succeeded',started_at:new Date(),finished_at:new Date(),checked:1,failed:0}];
  assert.equal((await recovery.paymentRecoveryHealth()).healthy,true);
  backlog=[{queue:'refunds',pending:0,oldest:null,review:1,reserved:1,expired_leases:0}];
  assert.equal((await recovery.paymentRecoveryHealth()).healthy,false);
  backlog=[{queue:'transfers',pending:1,oldest:new Date(Date.now()-16*60_000),review:0,reserved:1,expired_leases:0}];
  assert.equal((await recovery.paymentRecoveryHealth()).needsReview,true);
  backlog=[{queue:'refunds',pending:1,oldest:new Date(),review:0,reserved:1,expired_leases:1}];
  assert.equal((await recovery.paymentRecoveryHealth()).healthy,false);
  backlog=[];healthRuns[0].finished_at=new Date(Date.now()-6*60_000);
  assert.equal((await recovery.paymentRecoveryHealth()).workerHealthy,false);
  delete process.env.STRIPE_PAYMENTS_ENABLED;const count=queries.length;await assert.rejects(recovery.claimPaymentRecoveryRun,/production/);assert.equal(queries.length,count);
  console.log('PASS: isolated production runs, failure continuation, stale workers/backlogs/review/leases health checks and disabled-before-query guard');

  configured();let sends=[];global.fetch=async(url,options)=>{sends.push({url,body:JSON.parse(options.body)});return Response.json({id:'fixture-message'});};
  const message={to:'test@example.invalid',subject:'Offline fixture',heading:'Booking',body:'Synthetic test',ctaLabel:'Open booking',ctaPath:'/customer'};
  assert.equal((await email.sendTransactionalEmail(message)).sent,false);assert.equal(sends.length,0);
  process.env.RESEND_API_KEY='fixture-only';process.env.TRANSACTIONAL_EMAILS_ENABLED='true';
  assert.equal((await email.sendTransactionalEmail(message)).sent,false);process.env.TRANSACTIONAL_EMAILS_SENDER_VERIFIED='true';
  assert.equal((await email.sendTransactionalEmail(message)).sent,true);assert(sends[0].body.html.includes('https://production.example/customer'));
  process.env.NEXT_PUBLIC_APP_URL='http://localhost:3000';assert.equal((await email.sendTransactionalEmail(message)).sent,false);assert.equal(sends.length,1);
  process.env.NEXT_PUBLIC_APP_URL='https://production.example';global.fetch=async()=>new Response('private provider detail',{status:400});
  await assert.rejects(()=>email.sendTransactionalEmail(message),error=>error.message==='TRANSACTIONAL_EMAIL_400');
  const notice=loader({'next/navigation':{useRouter:()=>({refresh(){}})}})('src/components/StripeRefundNotice.tsx').default;
  const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
  const html=renderToStaticMarkup(React.createElement(notice,{payment:{stripeRefundsEnabled:false,stripeRefundRecoveryEnabled:true,
    stripeRefunds:[{id:'r',status:'SUCCEEDED',recoveryStatus:'REVIEW',activePaymentId:'pay',amountPence:11000,recoveryAmountPence:7500}]}}));
  assert(html.includes('Check refund / recovery status'));
  const ui=loader({'next/navigation':{useRouter:()=>({refresh(){}})}});
  const payoutNotice=ui('src/components/StripePayoutNotice.tsx').default;
  const liveHtml=renderToStaticMarkup(React.createElement(payoutNotice,{payment:{provider:'STRIPE',stripeLivemode:true,payoutStatus:'PAID'}}));
  assert(!liveHtml.includes('sandbox'));assert(liveHtml.includes('Stripe payout'));
  const setupHtml=renderToStaticMarkup(React.createElement(ui('src/app/account/StripePayoutSetup.tsx').default,{live:true}));
  assert(!setupHtml.includes('Sandbox'));assert(!setupHtml.includes('no real money'));
  const buttonLoader=loader({'react':{useState:initial=>[initial,()=>{}]},'next/navigation':{useRouter:()=>({refresh(){}})}});
  const payoutButton=buttonLoader('src/components/PayoutButton.tsx').default;
  const oldConfirm=global.confirm;let sent,confirmation;
  try{
    global.confirm=message=>{confirmation=message;return true;};
    global.fetch=async(url,options)=>{sent=options;return Response.json({accepted:true});};
    const button=payoutButton({paymentId:'pay',payoutId:'existing',amountPence:100,retry:true,live:true});
    await button.props.children[0].props.onClick();
    assert(confirmation.includes('live payout'));assert.equal(sent.method,'PATCH');assert.deepEqual(JSON.parse(sent.body),{payoutId:'existing'});
  }finally{global.confirm=oldConfirm;}
  console.log('PASS: production email disabled by default, explicit sender/origin controls, redacted provider errors and visible recovery action while new refunds are off');
  console.log('PASS: live payout/setup labels and existing-instruction PATCH recovery from the administrator button');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{
  global.fetch=originalFetch;for(const key of Object.keys(process.env))if(!(key in original))delete process.env[key];Object.assign(process.env,original);
});
