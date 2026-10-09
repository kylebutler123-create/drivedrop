import {prisma} from './prisma';
import {AvailabilityError} from './availability-error';
import {lockJob,closeExpired,eligibleQuote,createCapturedBooking,type BookingActor} from './availability';
import {confirmationDeadline,requestExpired,collectionLimit,validateCollectionWindow} from './availability-time';
import {authorisationProvider,paymentEnvironment,checkoutOrigin,stripeRequest} from './booking-authorisation-provider';

type Row=Awaited<ReturnType<typeof getRequest>>;
const getRequest=(id:string)=>prisma.availabilityRequest.findUniqueOrThrow({where:{id}});
const terminal=(s:string)=>['EXPIRED','WITHDRAWN','DECLINED','PAYMENT_FAILED'].includes(s);
function checkEnvironment(r:Row){if(r.paymentEnvironment&&r.paymentEnvironment!==paymentEnvironment())throw new AvailabilityError('Open this payment in the environment where it was started.');}
async function locked<T>(id:string,fn:(tx:any,r:Row)=>Promise<T>){const initial=await getRequest(id);return prisma.$transaction(async tx=>{await lockJob(tx,initial.jobId);return fn(tx,await tx.availabilityRequest.findUniqueOrThrow({where:{id}}));});}

// Only the customer can start/resume checkout. Stripe, never a browser return URL, proves authorisation.
export async function authoriseRequest(actor:BookingActor,id:string){
 let r=await locked(id,async(tx,r)=>{
  if(actor.role!=='CUSTOMER'||actor.id!==r.customerId||(actor.accountStatus&&actor.accountStatus!=='ACTIVE'))throw new AvailabilityError('Confirmation request not found');
  checkEnvironment(r);
  await closeExpired(tx,r.jobId,new Date());r=await tx.availabilityRequest.findUniqueOrThrow({where:{id}});
  if(!r.paymentProvider)throw new AvailabilityError('Withdraw this earlier request and select the quote again to authorise payment first.');
  if(r.status!=='AWAITING_AUTHORISATION')return r;
  await eligibleQuote(tx,r.quoteId,new Date());
  return r;
 });
 if(r.status!=='AWAITING_AUTHORISATION')return {request:r};
 if(r.paymentProvider==='TEST'){
  authorisationProvider();
  r=await locked(id,async(tx,r)=>{
   if(r.status!=='AWAITING_AUTHORISATION'||requestExpired(r))throw new AvailabilityError('This authorisation request has expired');
   return tx.availabilityRequest.update({where:{id},data:{status:'AWAITING_TRANSPORTER',paymentState:'AUTHORISED',paymentIntentId:`test_auth_${id}`,authorisationExpiresAt:new Date(Date.now()+7*86400000)}});
  });
  return {request:r};
 }
 let session:any;
 if(r.checkoutSessionId)session=await stripeRequest(`checkout/sessions/${encodeURIComponent(r.checkoutSessionId)}`);
 else {
  const origin=checkoutOrigin();
  session=await stripeRequest('checkout/sessions',{
   mode:'payment','payment_method_types[0]':'card',
   'payment_intent_data[capture_method]':'manual',
   'payment_intent_data[metadata][availabilityRequestId]':r.id,
   'payment_intent_data[metadata][environment]':r.paymentEnvironment!,
   'metadata[availabilityRequestId]':r.id,'client_reference_id':r.id,
   'line_items[0][price_data][currency]':'gbp','line_items[0][price_data][unit_amount]':String(r.authorisedAmountPence),
   'line_items[0][price_data][product_data][name]':'DriveDrop vehicle transport — subject to transporter confirmation','line_items[0][quantity]':'1',
   'custom_text[submit][message]':'Authorise payment now. Your card will only be charged when the transporter confirms. If declined or expired, the hold is cancelled.',
   success_url:`${origin}/customer?view=quotes&authorisation=returned`,cancel_url:`${origin}/customer?view=quotes&authorisation=cancelled`,
  },`availability-checkout-${r.id}`);
  await locked(id,async(tx,current)=>{if(current.checkoutSessionId&&current.checkoutSessionId!==session.id)throw new Error('Checkout session mismatch');await tx.availabilityRequest.update({where:{id},data:{checkoutSessionId:session.id}});});
 }
 await reconcileRequest(id);
 r=await getRequest(id);
 return {request:r,checkoutUrl:r.status==='AWAITING_AUTHORISATION'&&session.status==='open'?session.url:undefined};
}

async function intentFor(r:Row){
 if(r.paymentIntentId)return stripeRequest(`payment_intents/${encodeURIComponent(r.paymentIntentId)}?expand[]=latest_charge`);
 if(!r.checkoutSessionId)return null;
 const session=await stripeRequest(`checkout/sessions/${encodeURIComponent(r.checkoutSessionId)}`);
 if(!session.payment_intent)return null;
 const id=typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent.id;
 return stripeRequest(`payment_intents/${encodeURIComponent(id)}?expand[]=latest_charge`);
}
function assertIntent(r:Row,pi:any){
 if(pi.livemode!==false||pi.currency!=='gbp'||pi.amount!==r.authorisedAmountPence||pi.capture_method!=='manual'||pi.metadata?.availabilityRequestId!==r.id||pi.metadata?.environment!==r.paymentEnvironment||(r.paymentIntentId&&r.paymentIntentId!==pi.id))throw new Error('Stripe authorisation does not match request');
}
// Safe to retry from webhook, account refresh and scheduled recovery; never trusts event ordering.
export async function reconcileRequest(id:string){
 let r=await getRequest(id);checkEnvironment(r);
 if(!r.paymentProvider||r.status==='BOOKED'||r.paymentState==='RELEASED')return r;
 if(r.paymentProvider==='TEST'){
  authorisationProvider();
  return locked(id,async(tx,r)=>{
   if(r.status==='CAPTURING')return (await createCapturedBooking(tx,r,r.paymentIntentId!,r.transporterId)).request;
   await closeExpired(tx,r.jobId,new Date());return tx.availabilityRequest.findUniqueOrThrow({where:{id}});
  });
 }
 let pi=await intentFor(r);if(pi)assertIntent(r,pi);
 // A committed capture claim prevents cancellation/another booking while Stripe is contacted.
 if(r.status==='CAPTURING'&&pi?.status==='requires_capture'&&Date.now()<+r.respondBy&&(!r.authorisationExpiresAt||Date.now()<+r.authorisationExpiresAt)){
  try{await stripeRequest(`payment_intents/${pi.id}/capture`,{},`availability-capture-${r.id}`);}catch{/* An interrupted response is ambiguous; retrieve before deciding. */}
  pi=await intentFor(r);if(pi)assertIntent(r,pi);
 }
 await locked(id,async(tx,current)=>{
  if(current.status==='BOOKED')return;
  const now=new Date();
  if(pi?.status==='succeeded'&&current.status==='CAPTURING'){
   if(pi.amount_received!==current.authorisedAmountPence)throw new Error('Captured amount mismatch');
   await createCapturedBooking(tx,current,pi.id,current.transporterId);return;
  }
  if(current.status==='CAPTURING'){
   if(pi&&['canceled','requires_payment_method'].includes(pi.status)||now>=current.respondBy||current.authorisationExpiresAt&&now>=current.authorisationExpiresAt){
    await tx.availabilityRequest.update({where:{id},data:{status:'PAYMENT_FAILED',activeJobId:null,paymentState:'RELEASE_PENDING'}});
   }
   return;
  }
  await closeExpired(tx,current.jobId,now);current=await tx.availabilityRequest.findUniqueOrThrow({where:{id}});
  if(terminal(current.status))return;
  if(pi?.status==='requires_capture'&&current.status==='AWAITING_AUTHORISATION'){
   const expiry=pi.latest_charge?.payment_method_details?.card?.capture_before;
   if(!expiry||pi.amount_capturable!==current.authorisedAmountPence)throw new Error('Stripe authorisation expiry/amount missing');
   const q=await eligibleQuote(tx,current.quoteId,now);
   const deadline=new Date(Math.min(+confirmationDeadline(current.collectionDate,current.collectionUntil,now,q.expiresAt),expiry*1000-60000));
   if(+deadline-+now<15*60000)throw new AvailabilityError('Not enough time remains to confirm this booking. Withdraw and choose a later window.');
   await tx.availabilityRequest.update({where:{id},data:{status:'AWAITING_TRANSPORTER',paymentState:'AUTHORISED',paymentIntentId:pi.id,authorisationExpiresAt:new Date(expiry*1000),respondBy:deadline}});
  }else if(pi?.status==='canceled'||pi?.status==='succeeded'){
   await tx.availabilityRequest.update({where:{id},data:{status:'PAYMENT_FAILED',activeJobId:null,paymentState:'RELEASE_PENDING'}});
  }
 });
 r=await getRequest(id);
 if(terminal(r.status)&&r.paymentState!=='RELEASED'){
  // Close the checkout before retrieving the intent again: prevents late authorisations racing release.
  if(r.checkoutSessionId){const session=await stripeRequest(`checkout/sessions/${r.checkoutSessionId}`);if(session.status==='open')await stripeRequest(`checkout/sessions/${r.checkoutSessionId}/expire`,{},`availability-expire-${r.id}`);}
  pi=await intentFor(r);
  if(pi){assertIntent(r,pi);if(pi.status==='succeeded')await stripeRequest('refunds',{payment_intent:pi.id},`availability-unbooked-refund-${r.id}`);else if(pi.status!=='canceled')await stripeRequest(`payment_intents/${pi.id}/cancel`,{},`availability-cancel-${r.id}`);}
  // A row without a session can still have an in-flight checkout creation; don't mark released until it is attached.
  if(r.checkoutSessionId||r.paymentIntentId)await prisma.availabilityRequest.update({where:{id},data:{paymentState:'RELEASED'}});
 }
 return getRequest(id);
}

export async function respondToRequest(actor:BookingActor,id:string,action:'CONFIRM'|'DECLINE'|'WITHDRAW'){
 const result=await locked(id,async(tx,r)=>{
  const customer=actor.role==='CUSTOMER'&&actor.id===r.customerId,transporter=actor.role==='TRANSPORTER'&&actor.id===r.transporterId;
  if(action==='WITHDRAW'?!customer:!transporter)throw new AvailabilityError('Confirmation request not found');
  if(actor.accountStatus&&actor.accountStatus!=='ACTIVE')throw new AvailabilityError('Account is not active');
  checkEnvironment(r);
  if(action==='CONFIRM'&&['CAPTURING','BOOKED'].includes(r.status))return {request:r,changed:false};
  if(r.status==='CAPTURING')throw new AvailabilityError('Payment is being processed. Please wait for the booking result.');
  if(terminal(r.status))return {request:r,changed:false};
  await closeExpired(tx,r.jobId,new Date());r=await tx.availabilityRequest.findUniqueOrThrow({where:{id}});
  if(terminal(r.status))return {request:r,changed:true};
  if(action==='CONFIRM'){
   if(r.status!=='AWAITING_TRANSPORTER'||r.paymentState!=='AUTHORISED'||!r.paymentIntentId)throw new AvailabilityError('Customer payment must be authorised before you can confirm. Earlier requests must be withdrawn and selected again.');
   const now=new Date(),q=await eligibleQuote(tx,r.quoteId,now);
   if(q.pricePence!==r.pricePence)throw new AvailabilityError('The quote changed. Ask the customer to select it again.');
   validateCollectionWindow(r.collectionDate,r.collectionFrom,r.collectionUntil,now);
   if(+collectionLimit(r.collectionDate,r.collectionUntil)-30*60000<=+now||!r.authorisationExpiresAt||+r.authorisationExpiresAt<=+now)throw new AvailabilityError('There is not enough time remaining to confirm this collection.');
   return {request:await tx.availabilityRequest.update({where:{id},data:{status:'CAPTURING',confirmedAt:now,paymentState:'CAPTURE_PENDING'}}),changed:true};
  }
  if(r.status==='BOOKED')throw new AvailabilityError('This booking is already active');
  return {request:await tx.availabilityRequest.update({where:{id},data:{status:action==='WITHDRAW'?'WITHDRAWN':'DECLINED',activeJobId:null,paymentState:r.paymentProvider==='STRIPE'?'RELEASE_PENDING':r.paymentProvider?'RELEASED':null}}),changed:true};
 });
 // Return/GET retries recover any interrupted provider operation. Never call Stripe within a DB transaction.
 const request=await reconcileRequest(id);
 return {request,changed:result.changed||request.status!==result.request.status};
}
