const assert=require('node:assert/strict'),fs=require('node:fs'),swc=require('next/dist/build/swc'),{createHmac}=require('node:crypto');
const cache={};function load(name){if(cache[name])return cache[name];const out={};cache[name]=out;const filename='src/lib/'+name+'.ts';new Function('exports','require',swc.transformSync(fs.readFileSync(filename,'utf8'),{filename,jsc:{parser:{syntax:'typescript'},target:'es2022'},module:{type:'commonjs'}}).code)(out,id=>id.startsWith('./')?load(id.slice(2)):require(id));return out;}
const p=load('booking-authorisation-provider');const original={...process.env};
try{
 process.env.VERCEL_ENV='preview';delete process.env.STRIPE_SECRET_KEY;assert.equal(p.authorisationProvider(),'TEST');
 process.env.STRIPE_SECRET_KEY='sk_live_NOT_A_KEY';assert.throws(()=>p.authorisationProvider(),/test-mode/);
 process.env.STRIPE_SECRET_KEY='sk_test_NOT_A_KEY';delete process.env.STRIPE_WEBHOOK_SECRET;delete process.env.CRON_SECRET;assert.throws(()=>p.authorisationProvider(),/webhook/);process.env.STRIPE_WEBHOOK_SECRET='whsec_LOCAL_TEST_ONLY';process.env.CRON_SECRET='LOCAL_TEST_ONLY';assert.equal(p.authorisationProvider(),'STRIPE');
 process.env.VERCEL_ENV='production';assert.throws(()=>p.authorisationProvider(),/production/);process.env.VERCEL_ENV='preview';
 process.env.STRIPE_WEBHOOK_SECRET='whsec_LOCAL_TEST_ONLY';const raw=JSON.stringify({id:'evt_test',livemode:false}),t=Math.floor(Date.now()/1000);
 const sign=(body,time)=>`t=${time},v1=${createHmac('sha256',process.env.STRIPE_WEBHOOK_SECRET).update(`${time}.${body}`).digest('hex')}`;
 assert.equal(p.verifyStripeEvent(raw,sign(raw,t)).id,'evt_test');
 assert.throws(()=>p.verifyStripeEvent(raw+' ',sign(raw,t)),/invalid/);
 assert.throws(()=>p.verifyStripeEvent(raw,sign(raw,t-600)),/timestamp/);
 assert.throws(()=>p.verifyStripeEvent(raw,null),/required/);
 const live=JSON.stringify({livemode:true});assert.throws(()=>p.verifyStripeEvent(live,sign(live,t)),/Live/);
 console.log('PASS: Stripe provider test/live guards, signed raw webhook, tamper/replay/missing signature and live event rejection.');
}finally{for(const k of Object.keys(process.env))if(!(k in original))delete process.env[k];Object.assign(process.env,original);}
