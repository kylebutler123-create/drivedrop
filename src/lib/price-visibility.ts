import type {AvailabilityRequest} from '@prisma/client';
import {calculateCustomerPrice} from './finance';

// Only these fields may cross the account API boundary. Payment provider IDs,
// authorised totals and the other party's price remain server-side.
export function availabilityForAccount(r:AvailabilityRequest & {customerName?:string;transporterName?:string;job?:unknown},role:string){
 const fields=['id','quoteId','jobId','status','collectionDate','collectionFrom','collectionUntil','respondBy','payBy','confirmedAt','bookingId','customerName','transporterName','job','paymentProvider','paymentState','createdAt','updatedAt'] as const;
 return {...Object.fromEntries(fields.map(key=>[key,r[key]])),pricePence:role==='CUSTOMER'?(r.authorisedAmountPence??calculateCustomerPrice(r.pricePence).customerTotalPence):r.pricePence};
}
type PaymentViewSource={status:string;transportValuePence:number;paidPence:number;refundedPence:number};
export function customerPayment(p:PaymentViewSource){
 return {status:p.status,transportValuePence:p.transportValuePence,depositPence:p.transportValuePence,paidPence:p.paidPence,refundedPence:p.refundedPence};
}
// Use the recorded remaining proceeds, not a second percentage calculation:
// repeated partial refunds can round by a penny. Keep fines separate.
export function transporterRefund(base:number,p:{refundedPence:number;transporterProceedsPence:number;cancellationDeductionPence?:number}){
 if(p.refundedPence<=0)return 0;
 return Math.min(base,Math.max(0,base-p.transporterProceedsPence-(p.cancellationDeductionPence||0)));
}
export function notificationForAccount<T extends {type:string;title:string;body:string}>(n:T,role:string):T{
 let body=n.body;
 if(role==='CUSTOMER'&&n.type==='QUOTE')body=body.replace(/ including the DriveDrop fee/g,'');
 if(role==='TRANSPORTER'){
  if(n.type==='BOOKING'&&n.title==='New confirmed booking')body=body.replace(/has paid £[\d,.]+ and confirmed/,'has paid and confirmed');
  if(n.type==='PAYMENT'&&n.title==='Customer payment secured')body=body.replace(/Payment of £[\d,.]+ is secured/,'Payment is secured');
  if(n.type==='DISPUTE'&&n.title==='Dispute resolved')body=body.replace(/ Refund recorded: £[\d,.]+\./,' A refund adjustment has been recorded. View your proceeds for the updated amount.');
 }
 return {...n,body};
}
