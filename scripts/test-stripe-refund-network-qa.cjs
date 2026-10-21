const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const Stripe = require('stripe');
const swc = require('next/dist/build/swc');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'src/lib/stripe-refund-network-qa.ts');
const output = {};
const logs = [];
const code = swc.transformSync(fs.readFileSync(file, 'utf8'), {filename:file,
 jsc:{parser:{syntax:'typescript'},target:'es2022'},module:{type:'commonjs'}}).code;
new Function('exports','require','console',code)(output,require,{info:(event,proof)=>logs.push({event,...proof})});
process.env.VERCEL_ENV = 'preview';
process.env.VERCEL_GIT_COMMIT_REF = 'feature/ui-polish';
process.env.STRIPE_REFUNDS_ENABLED = 'true';
const refundId = 'network_qa_refund';
const params = {charge:'ch_networkqa',amount:110,metadata:{driveDropRefundId:refundId,
 environment:'preview',paymentId:output.NETWORK_QA_PAYMENT_ID}};
const body = new URLSearchParams({amount:'110',charge:params.charge,
 'metadata[driveDropRefundId]':refundId,'metadata[environment]':'preview',
 'metadata[paymentId]':output.NETWORK_QA_PAYMENT_ID}).toString();
const args = ['api.stripe.com','443','/v1/refunds','POST',
 {'Idempotency-Key':'dd-refund-preview-'+refundId},body,'https',12000];
assert(output.networkQaMatches(args));
for (const [key,value] of [['VERCEL_ENV','production'],['VERCEL_ENV','development'],
 ['VERCEL_GIT_COMMIT_REF','main'],['STRIPE_REFUNDS_ENABLED','false']]) {
 const old=process.env[key];process.env[key]=value;assert(!output.networkQaMatches(args));process.env[key]=old;
}
for (const [index,value] of [[0,'other.example'],[1,'80'],[2,'/v1/transfers'],
 [3,'GET'],[4,{'Idempotency-Key':'different'}],[5,body.replace('110','111')],
 [5,body.replace(output.NETWORK_QA_PAYMENT_ID,'original_payment')],[6,'http']]) {
 const changed=[...args];changed[index]=value;assert(!output.networkQaMatches(changed));
}
assert(!output.networkQaMatches(args,Date.parse('2026-10-22T00:00:00Z')));
(async()=>{
 let requests=[],closed=0,objects=new Map(),resolveClosed;
 const allClosed=new Promise(resolve=>resolveClosed=resolve);
 const server=http.createServer((req,res)=>{
  let body='';req.on('data',chunk=>body+=chunk);
  req.on('end',()=>{
   const key=req.headers['idempotency-key'];
   const replay=objects.has(key);
   if(!replay)objects.set(key,{id:'re_networkqa',object:'refund',amount:110,status:'succeeded'});
   requests.push({key,body});
   res.on('close',()=>{closed++;if(closed===2)resolveClosed();});
   res.writeHead(200,{'Content-Type':'application/json','Request-Id':'req_networkqa_'+requests.length,
    ...(replay?{'Idempotent-Replayed':'true'}:{})});
   res.flushHeaders();
   // The client must close this real socket before any response body is sent.
   const timer=setTimeout(()=>res.end(JSON.stringify(objects.get(key))),2000);
   res.on('close',()=>clearTimeout(timer));
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const request=(options,cb)=>http.request({...options,host:'127.0.0.1',port:server.address().port},cb);
 const client=new Stripe('network-test-placeholder',{httpClient:output.createNetworkQaClient(request),
  maxNetworkRetries:0,timeout:5000});
 try {
  await assert.rejects(()=>client.refunds.create(params,{idempotencyKey:'dd-refund-preview-'+refundId}),
   error=>error instanceof Stripe.errors.StripeConnectionError && error.raw.detail.code==='ECONNRESET');
  assert.equal(objects.size,1);
  assert.equal(requests.length,2,'SDK makes one closed-connection retry even with maxNetworkRetries=0');
  assert.deepEqual(requests[0],requests[1],'automatic retry preserves exact key and parameters');
  assert.equal(logs.length,2);
  assert.deepEqual(logs.map(x=>x.idempotentReplayed),[false,true]);
  assert(logs.every(x=>x.status===200 && !x.bodyCompleteBeforeClose && x.bufferedBodyBytes===0 &&
   x.responseDestroyed && x.requestDestroyed));
  await Promise.race([allClosed,new Promise((_,reject)=>setTimeout(()=>reject(Error('Socket close not observed')),2000).unref())]);
  assert.equal(closed,2);
  console.log(JSON.stringify({pass:true,realLocalSocketsClosed:closed,requests:requests.length,
   distinctProviderObjects:objects.size,proof:logs}));
 } finally {
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(error=>{console.error(error);process.exitCode=1});
