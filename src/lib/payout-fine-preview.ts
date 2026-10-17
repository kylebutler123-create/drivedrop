/** Read-only estimate. Release remains authoritative and recalculates deductions. */
export type OutstandingPayoutFine={transporterId:string;outstandingPence:number;createdAt:Date|string};
type PreviewPayment={id:string;payoutStatus:string;transporterProceedsPence:number;booking:{transporterId:string;status:string;customerConfirmedAt:Date|string|null;trackingEvents?:{createdAt:Date|string}[]}};
export function payoutFinePreview(payment:PreviewPayment,payments:PreviewPayment[],fines:OutstandingPayoutFine[],now=new Date()){
 const proceeds=Math.max(0,payment.transporterProceedsPence);
 if(payment.payoutStatus==='PAID')return null;
 const own=fines.filter(f=>f.transporterId===payment.booking.transporterId);
 const outstandingPence=own.reduce((sum,f)=>sum+Math.max(0,f.outstandingPence),0);
 const completedAt=new Date(payment.booking.customerConfirmedAt||payment.booking.trackingEvents?.[0]?.createdAt||now).getTime();
 const eligible=own.filter(f=>{
  const createdAt=new Date(f.createdAt).getTime();
  return createdAt<=completedAt&&!payments.some(other=>other.id!==payment.id&&other.booking.transporterId===payment.booking.transporterId&&other.booking.status==='DELIVERED'&&other.booking.customerConfirmedAt&&['READY','HELD'].includes(other.payoutStatus)&&new Date(other.booking.customerConfirmedAt).getTime()>=createdAt&&new Date(other.booking.customerConfirmedAt).getTime()<completedAt);
 }).reduce((sum,f)=>sum+Math.max(0,f.outstandingPence),0);
 const expectedDeductionPence=Math.min(proceeds,eligible);
 return {outstandingPence,expectedDeductionPence,netPayoutPence:proceeds-expectedDeductionPence};
}
