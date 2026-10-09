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
export const completedPayoutLabels={AWAITING:'Awaiting customer confirmation',READY:'Ready for release',PAID:'Paid',HELD:'Payout held',BLOCKED:'Payout blocked — bank details required',REFUNDED:'Refunded — payout cancelled',CANCELLED:'Payout cancelled',NOT_READY:'Payout not ready'};
export type CompletedPayoutStatus=keyof typeof completedPayoutLabels;
export function completedPayoutStatus(booking:{customerConfirmedAt?:unknown;payment?:{payoutStatus?:string;status?:string}|null;disputes?:{status:string}[]},detailsComplete:boolean):CompletedPayoutStatus{
 const p=booking.payment;
 if(p?.payoutStatus==='PAID')return 'PAID';
 if(p?.status==='REFUNDED')return 'REFUNDED';
 if(p?.payoutStatus==='CANCELLED')return 'CANCELLED';
 if(p?.payoutStatus==='HELD'||booking.disputes?.some(d=>['OPEN','UNDER_REVIEW'].includes(d.status)))return 'HELD';
 if(p?.payoutStatus==='READY')return detailsComplete?'READY':'BLOCKED';
 return booking.customerConfirmedAt?'NOT_READY':'AWAITING';
}
