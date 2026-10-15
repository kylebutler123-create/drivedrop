type Payment={paidPence:number;refundedPence:number;platformFeePence:number};
export const payoutApprovalMarker=(id:string)=>`ADMIN_PARTIAL_PAYOUT_APPROVED:${id}`;
export function refundAmounts(payment:Payment,amountPence:number){
 const balance=payment.paidPence-payment.refundedPence;
 if(!Number.isInteger(amountPence)||amountPence<=0||amountPence>balance)throw Error('Refund must be within the remaining paid balance');
 const remaining=balance-amountPence;
 // Retain the booking's recorded fee proportion, including legacy commission rates.
 const platformFeePence=remaining?Math.round(payment.platformFeePence*remaining/balance):0;
 if(platformFeePence<0||platformFeePence>remaining)throw Error('Payment amounts require review before refunding');
 return {refundedPence:payment.refundedPence+amountPence,platformFeePence,transporterProceedsPence:remaining-platformFeePence};
}
export function adminPayoutApproved(disputes:{id:string;status:string;resolution?:string|null}[],events:{note?:string|null}[]=[]){
 return disputes.some(d=>d.status==='RESOLVED'&&(d.resolution==='RELEASE_PAYOUT'||d.resolution==='PARTIAL_REFUND'&&events.some(e=>e.note===payoutApprovalMarker(d.id))));
}
export const capturedPayment=(status:string)=>['PAID','PARTIALLY_REFUNDED'].includes(status);
export const completedPayoutLabels={WAITING:'24-hour hold',AWAITING:'Awaiting customer confirmation',READY:'Ready for release',PAID:'Paid',HELD:'Payout held',BLOCKED:'Payout blocked — bank details required',REFUNDED:'Refunded — payout cancelled',CANCELLED:'Payout cancelled',NOT_READY:'Payout not ready'};
export type CompletedPayoutStatus=keyof typeof completedPayoutLabels;
export function completedPayoutStatus(booking:ReviewBooking & {payment?:{payoutStatus?:string;status?:string;events?:{note?:string|null}[]}|null},detailsComplete:boolean,now=Date.now()):CompletedPayoutStatus{
 const p=booking.payment;
 if(p?.payoutStatus==='PAID')return 'PAID';
 if(p?.status==='REFUNDED')return 'REFUNDED';
 if(p?.payoutStatus==='CANCELLED')return 'CANCELLED';
 if(p?.payoutStatus==='HELD'||booking.disputes?.some(d=>['OPEN','UNDER_REVIEW'].includes(d.status)))return 'HELD';
 if(inPayoutReviewWindow(booking,booking.payment?.events||[],now))return 'WAITING';
 if(p?.payoutStatus==='READY'&&payoutWindowOpen(booking,booking.payment?.events||[],now))return detailsComplete?'READY':'BLOCKED';
 return booking.customerConfirmedAt?'NOT_READY':'AWAITING';
}

export const DISPUTE_WINDOW_MS=24*60*60*1000;
type ReviewBooking={status?:string;customerConfirmedAt?:unknown;customerDisputeClosed?:boolean;payment?:{payoutStatus?:string;events?:{note?:string|null}[]}|null;disputes?:{id:string;status:string;resolution?:string|null}[]};
export function disputeDeadline(confirmedAt:unknown):number|null{
 if(!confirmedAt)return null;
 const value=new Date(confirmedAt as string|Date).getTime();
 return Number.isFinite(value)?value+DISPUTE_WINDOW_MS:null;
}
export function customerCanDispute(booking:ReviewBooking,now=Date.now()){
 if(booking.status==='CANCELLED'||booking.customerDisputeClosed||booking.payment?.payoutStatus==='PAID')return false;
 const deadline=disputeDeadline(booking.customerConfirmedAt);
 return !booking.customerConfirmedAt||(deadline!==null&&now<deadline);
}
export function payoutWindowOpen(booking:ReviewBooking,events:{note?:string|null}[]=booking.payment?.events||[],now=Date.now()){
 if(booking.disputes?.some(d=>['OPEN','UNDER_REVIEW'].includes(d.status)))return false;
 if(adminPayoutApproved(booking.disputes||[],events))return true;
 const deadline=disputeDeadline(booking.customerConfirmedAt);
 return deadline!==null&&now>=deadline;
}
export function inPayoutReviewWindow(booking:ReviewBooking,events:{note?:string|null}[]=booking.payment?.events||[],now=Date.now()){
 const deadline=disputeDeadline(booking.customerConfirmedAt);
 return booking.payment?.payoutStatus==='READY'&&deadline!==null&&now<deadline&&!adminPayoutApproved(booking.disputes||[],events);
}
export const reviewDateLabel=(timestamp:number)=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'Europe/London'}).format(new Date(timestamp));
