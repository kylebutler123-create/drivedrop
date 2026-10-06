import {londonDate} from './payment-period';
export const proceedsReference=(id:string)=>'DD-'+id.slice(-8).toUpperCase();
export const proceedsNet=(r:any)=>r.payment?.payoutStatus==='CANCELLED'?0:r.payment?.transporterProceedsPence||0;
export const proceedsStatus=(r:any)=>r.payment?.payoutStatus==='PAID'?'Paid':r.payment?.payoutStatus==='READY'?'Ready for release':r.payment?.payoutStatus==='HELD'?'Held':r.payment?.payoutStatus==='CANCELLED'?'Payout cancelled':r.status==='DELIVERED'&&!r.customerConfirmedAt?'Awaiting customer confirmation':'In progress';
export function filterProceeds(rows:any[],filters:{q?:string;month?:string;status?:string;adjustment?:string}){
 const q=(filters.q||'').trim().toLowerCase();
 return rows.filter(r=>r.payment&&(!q||[r.id,proceedsReference(r.id),r.job.vehicleMake,r.job.vehicleModel,r.job.registration,r.customer.name].join(' ').toLowerCase().includes(q))&&(!filters.month||r.job.collectionDate&&londonDate(r.job.collectionDate).slice(0,7)===filters.month)&&(!filters.status||filters.status==='BOOKED'?(filters.status!=='BOOKED'||r.status!=='CANCELLED'&&r.payment.payoutStatus!=='CANCELLED'):filters.status==='IN_PROGRESS'?!['READY','HELD','PAID','CANCELLED'].includes(r.payment.payoutStatus):filters.status==='FINES'?((filters.adjustment!=='REFUNDS'&&(r.payment.cancellationDeductionPence||0)>0)||(filters.adjustment!=='FINES'&&(r.payment.refundedPence||0)>0)):r.payment.payoutStatus===filters.status));
}
