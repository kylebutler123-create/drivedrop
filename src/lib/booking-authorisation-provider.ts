import {createHmac,timingSafeEqual} from 'node:crypto';
import {AvailabilityError} from './availability-error';
import {assertProductionPaymentConfiguration,expectedStripePlatform,paymentEnvironment,productionAppOrigin,stripeLivemode} from './payment-runtime';
export {paymentEnvironment} from './payment-runtime';

export function authorisationProvider(){
 const key=process.env.STRIPE_SECRET_KEY;
 if(paymentEnvironment()==='production'){
  assertProductionPaymentConfiguration();
  if(!key?.startsWith('rk_live_'))throw new AvailabilityError('Production requires a restricted Stripe live-mode key.');
 }else if(key&&!key.startsWith('sk_test_')&&!key.startsWith('rk_test_'))throw new AvailabilityError('Preview requires a Stripe test-mode key.');
 if(key){if(!process.env.STRIPE_WEBHOOK_SECRET||!process.env.CRON_SECRET)throw new AvailabilityError('Configure the Stripe webhook and payment recovery scheduler before enabling Stripe checkout.');return 'STRIPE';}
 return 'TEST';
}
export function assertNewCheckoutAllowed(){
 authorisationProvider();
 if(paymentEnvironment()==='production'&&process.env.STRIPE_CHECKOUT_ENABLED!=='true')throw new AvailabilityError('New booking payments are temporarily paused.');
}
export async function stripeRequest(path:string,body?:Record<string,string>,idempotencyKey?:string):Promise<any>{
 if(authorisationProvider()!=='STRIPE')throw new AvailabilityError('Stripe is not configured.');
 const key=process.env.STRIPE_SECRET_KEY!;
 const headers={Authorization:`Bearer ${key}`,'Stripe-Version':'2024-06-20'};
 if(paymentEnvironment()==='production'){
  const accountResponse=await fetch('https://api.stripe.com/v1/account',{headers,cache:'no-store',signal:AbortSignal.timeout(15000)});
  const account=await accountResponse.json();
  if(!accountResponse.ok||account.id!==expectedStripePlatform())throw new AvailabilityError('Stripe platform account does not match this environment.');
 }
 const response=await fetch('https://api.stripe.com/v1/'+path,{method:body?'POST':'GET',headers:{...headers,...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},body:body?new URLSearchParams(body):undefined,cache:'no-store',signal:AbortSignal.timeout(15000)});
 const value=await response.json();
 if(!response.ok)throw new AvailabilityError('Stripe could not complete this payment operation. Please retry or check the payment status.');
 return value;
}
export function checkoutOrigin(){
 if(paymentEnvironment()==='production'){assertProductionPaymentConfiguration();return productionAppOrigin();}
 const value=process.env.STRIPE_CHECKOUT_ORIGIN||(process.env.VERCEL_BRANCH_URL?`https://${process.env.VERCEL_BRANCH_URL}`:'http://localhost:3000');
 const url=new URL(value);if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw new Error('Invalid checkout origin');return url.origin;
}
export function verifyStripeEvent(raw:string,signature:string|null){
 const secret=process.env.STRIPE_WEBHOOK_SECRET;if(!secret||!signature)throw new Error('Webhook signature required');
 const parts=signature.split(',').map(p=>p.split('='));const timestamp=parts.find(p=>p[0]==='t')?.[1];
 if(!timestamp||!/^\d+$/.test(timestamp)||Math.abs(Date.now()/1000-Number(timestamp))>300)throw new Error('Webhook timestamp invalid');
 const expected=createHmac('sha256',secret).update(`${timestamp}.${raw}`).digest();
 if(!parts.some(([k,v])=>{if(k!=='v1'||!v||!/^[a-f0-9]{64}$/i.test(v))return false;return timingSafeEqual(expected,Buffer.from(v,'hex'));}))throw new Error('Webhook signature invalid');
 assertProductionPaymentConfiguration();
 const event=JSON.parse(raw);if(event.livemode!==stripeLivemode())throw new Error('Live/test Stripe event does not match this environment');return event;
}
