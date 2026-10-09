import {createHmac,timingSafeEqual} from 'node:crypto';
import {AvailabilityError} from './availability-error';

export function paymentEnvironment(){return process.env.VERCEL_ENV||'development';}
export function authorisationProvider(){
 const key=process.env.STRIPE_SECRET_KEY;
 // Live money remains disabled until the separate production payments/payout rollout.
 if(paymentEnvironment()==='production'||(!process.env.VERCEL_ENV&&process.env.NODE_ENV==='production'))throw new AvailabilityError('Booking payments are not enabled in production yet.');
 if(key){if(!key.startsWith('sk_test_')&&!key.startsWith('rk_test_'))throw new AvailabilityError('Preview requires a Stripe test-mode key.');if(!process.env.STRIPE_WEBHOOK_SECRET||!process.env.CRON_SECRET)throw new AvailabilityError('Configure the Stripe webhook and payment recovery scheduler before enabling Stripe checkout.');return 'STRIPE';}
 return 'TEST';
}
export async function stripeRequest(path:string,body?:Record<string,string>,idempotencyKey?:string):Promise<any>{
 if(authorisationProvider()!=='STRIPE')throw new AvailabilityError('Stripe is not configured.');
 const response=await fetch('https://api.stripe.com/v1/'+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${process.env.STRIPE_SECRET_KEY}`,'Stripe-Version':'2024-06-20',...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},body:body?new URLSearchParams(body):undefined,cache:'no-store',signal:AbortSignal.timeout(15000)});
 const value=await response.json();
 if(!response.ok)throw new AvailabilityError('Stripe could not complete this payment operation. Please retry or check the payment status.');
 return value;
}
export function checkoutOrigin(){
 const value=process.env.STRIPE_CHECKOUT_ORIGIN||(process.env.VERCEL_BRANCH_URL?`https://${process.env.VERCEL_BRANCH_URL}`:'http://localhost:3000');
 const url=new URL(value);if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw new Error('Invalid checkout origin');return url.origin;
}
export function verifyStripeEvent(raw:string,signature:string|null){
 const secret=process.env.STRIPE_WEBHOOK_SECRET;if(!secret||!signature)throw new Error('Webhook signature required');
 const parts=signature.split(',').map(p=>p.split('='));const timestamp=parts.find(p=>p[0]==='t')?.[1];
 if(!timestamp||!/^\d+$/.test(timestamp)||Math.abs(Date.now()/1000-Number(timestamp))>300)throw new Error('Webhook timestamp invalid');
 const expected=createHmac('sha256',secret).update(`${timestamp}.${raw}`).digest();
 if(!parts.some(([k,v])=>{if(k!=='v1'||!v||!/^[a-f0-9]{64}$/i.test(v))return false;return timingSafeEqual(expected,Buffer.from(v,'hex'));}))throw new Error('Webhook signature invalid');
 const event=JSON.parse(raw);if(event.livemode!==false)throw new Error('Live Stripe events are disabled in preview');return event;
}
