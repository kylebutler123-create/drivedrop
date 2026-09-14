import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {currentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import styles from './proceeds.module.css';

export const dynamic='force-dynamic';
export const revalidate=0;

const money=(pence:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format((pence||0)/100);
const label=(value:string)=>value.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,character=>character.toUpperCase());
const reference=(id:string)=>'DD-'+id.slice(-8).toUpperCase();
const proceedsStatuses=['CONFIRMED','COLLECTION_SCHEDULED','COLLECTED','IN_TRANSIT','ARRIVING_SOON','DELIVERED','CANCELLED'] as const;
type ProceedsFilter='BOOKED'|'IN_PROGRESS'|'READY'|'HELD'|'PAID'|'FINES';
type AdjustmentFilter='ALL'|'FINES'|'REFUNDS';
const payoutLabel=(booking:any)=>{
 const status=booking.payment?.payoutStatus;
 if(status==='PAID')return'Paid';
 if(status==='HELD')return'Held';
 if(status==='READY')return'Ready for release';
 if(status==='CANCELLED')return'Payout cancelled';
 if(booking.status==='DELIVERED'&&!booking.customerConfirmedAt)return'Awaiting customer confirmation';
 return'In progress';
};
const inProgress=(booking:any)=>!['READY','HELD','PAID','CANCELLED'].includes(booking.payment?.payoutStatus);
const proceedsBeforeFine=(booking:any)=>(booking.payment?.transporterProceedsPence||0)+(booking.payment?.cancellationDeductionPence||0);

export default async function TransporterProceeds({searchParams}:{searchParams:Promise<{filter?:string;adjustment?:string}>}){
 const[user,params]=await Promise.all([currentUser(),searchParams]);
 if(!user)redirect('/login?account=transporter');
 if(user.role!=='TRANSPORTER')notFound();
 const requested=String(params.filter||'').toUpperCase();
 const filter:ProceedsFilter=requested==='IN_PROGRESS'||requested==='READY'||requested==='HELD'||requested==='PAID'||requested==='FINES'?requested:'BOOKED';
 const requestedAdjustment=String(params.adjustment||'').toUpperCase();
 const adjustmentFilter:AdjustmentFilter=requestedAdjustment==='FINES'||requestedAdjustment==='REFUNDS'?requestedAdjustment:'ALL';
 const bookings=await prisma.booking.findMany({
  where:{transporterId:user.id,status:{in:[...proceedsStatuses]}},
  select:{
   id:true,status:true,customerConfirmedAt:true,createdAt:true,
   customer:{select:{name:true}},
   job:{select:{vehicleMake:true,vehicleModel:true,registration:true,collection:true,delivery:true,collectionDate:true}},
   payment:{select:{transporterProceedsPence:true,cancellationDeductionPence:true,refundedPence:true,payoutStatus:true,updatedAt:true,events:{where:{type:'PAYOUT_PAID'},select:{createdAt:true},orderBy:{createdAt:'desc'},take:1}}}
  },
  orderBy:{createdAt:'desc'}
 });
 const allRows=bookings.filter(booking=>booking.payment);
 const rows=allRows.filter(booking=>booking.status!=='CANCELLED'&&booking.payment?.payoutStatus!=='CANCELLED');
 const total=rows.reduce((sum,booking)=>sum+proceedsBeforeFine(booking),0);
 const inProgressTotal=rows.filter(inProgress).reduce((sum,booking)=>sum+proceedsBeforeFine(booking),0);
 const paid=rows.filter(booking=>booking.payment?.payoutStatus==='PAID').reduce((sum,booking)=>sum+proceedsBeforeFine(booking),0);
 const ready=rows.filter(booking=>booking.payment?.payoutStatus==='READY').reduce((sum,booking)=>sum+proceedsBeforeFine(booking),0);
 const held=rows.filter(booking=>booking.payment?.payoutStatus==='HELD').reduce((sum,booking)=>sum+proceedsBeforeFine(booking),0);
 const fineRows=allRows.filter(booking=>(booking.payment?.cancellationDeductionPence||0)>0);
 const refundRows=allRows.filter(booking=>(booking.payment?.refundedPence||0)>0);
 const adjustmentRows=allRows.filter(booking=>(booking.payment?.cancellationDeductionPence||0)>0||(booking.payment?.refundedPence||0)>0);
 const fines=fineRows.reduce((sum,booking)=>sum+(booking.payment?.cancellationDeductionPence||0),0);
 const refunds=refundRows.reduce((sum,booking)=>sum+(booking.payment?.refundedPence||0),0);
 const selectedAdjustments=adjustmentFilter==='FINES'?fineRows:adjustmentFilter==='REFUNDS'?refundRows:adjustmentRows;
 const visibleRows=filter==='BOOKED'?rows:filter==='IN_PROGRESS'?rows.filter(inProgress):filter==='FINES'?selectedAdjustments:rows.filter(booking=>booking.payment?.payoutStatus===filter);
 const breakdownTitle=filter==='IN_PROGRESS'?'In progress':filter==='READY'?'Ready for release':filter==='HELD'?'Held proceeds':filter==='PAID'?'Paid proceeds':filter==='FINES'?(adjustmentFilter==='FINES'?'Fines':adjustmentFilter==='REFUNDS'?'Refunds':'Fines / Refunds'):'Booked proceeds';
 return <main className={`shell dashboardShell ${styles.page}`}>
  <Link className="backLink" href="/transporter">← Back to transporter dashboard</Link>
  <header className={styles.hero}>
   <div><span>Transporter finances</span><h1>Booked proceeds</h1><p>See the proceeds attached to every active and completed delivery, including payout progress and any cancellation fine deductions.</p></div>
   <div className={styles.total}><small>Total booked proceeds before fines</small><strong>{money(total)}</strong><span>{rows.length} booking{rows.length===1?'':'s'}</span></div>
  </header>
  <nav className={styles.summary} aria-label="Filter proceeds">
   <Link href="/transporter/proceeds" className={filter==='BOOKED'?styles.active:undefined} aria-current={filter==='BOOKED'?'page':undefined}><small>Booked proceeds</small><strong>{money(total)}</strong></Link>
   <Link href="/transporter/proceeds?filter=in_progress" className={filter==='IN_PROGRESS'?styles.active:undefined} aria-current={filter==='IN_PROGRESS'?'page':undefined}><small>In progress</small><strong>{money(inProgressTotal)}</strong></Link>
   <Link href="/transporter/proceeds?filter=ready" className={filter==='READY'?styles.active:undefined} aria-current={filter==='READY'?'page':undefined}><small>Ready for release</small><strong>{money(ready)}</strong></Link>
   <Link href="/transporter/proceeds?filter=held" className={filter==='HELD'?styles.active:undefined} aria-current={filter==='HELD'?'page':undefined}><small>Held</small><strong>{money(held)}</strong></Link>
   <Link href="/transporter/proceeds?filter=paid" className={filter==='PAID'?styles.active:undefined} aria-current={filter==='PAID'?'page':undefined}><small>Paid</small><strong>{money(paid)}</strong></Link>
   <Link href="/transporter/proceeds?filter=fines" className={`${styles.adjustments} ${filter==='FINES'?styles.active:''}`} aria-current={filter==='FINES'?'page':undefined}><small>Fines/Refunds</small><strong className={styles.adjustmentsTotal}>−{money(fines)} fines / −{money(refunds)} refunded</strong></Link>
  </nav>
  {filter==='FINES'&&<div className={styles.adjustmentControls}>
   <span>Filter Fines / Refunds records</span>
   <details>
    <summary>{adjustmentFilter==='FINES'?'Fines only · −'+money(fines):adjustmentFilter==='REFUNDS'?'Refunds only · −'+money(refunds):'All fines and refunds · '+adjustmentRows.length}</summary>
    <div>
     <Link className={adjustmentFilter==='ALL'?styles.selectedAdjustment:undefined} href="/transporter/proceeds?filter=fines">All fines and refunds <b>{adjustmentRows.length}</b></Link>
     <Link className={adjustmentFilter==='FINES'?styles.selectedAdjustment:undefined} href="/transporter/proceeds?filter=fines&adjustment=fines">Fines <b>−{money(fines)}</b></Link>
     <Link className={adjustmentFilter==='REFUNDS'?styles.selectedAdjustment:undefined} href="/transporter/proceeds?filter=fines&adjustment=refunds">Refunds <b>−{money(refunds)}</b></Link>
    </div>
   </details>
  </div>}
  <div className={styles.heading}><div><h2>{breakdownTitle}</h2><p>Newest bookings first</p></div><span>{visibleRows.length} record{visibleRows.length===1?'':'s'}</span></div>
  {visibleRows.length===0?<section className="dashboardCard emptyState"><div>£</div><h3>No {breakdownTitle.toLowerCase()}</h3><p>{filter==='BOOKED'?'Proceeds will appear here after a customer accepts and pays for a delivery.':'No proceeds currently match this status.'}</p></section>:<section className={styles.list}>{visibleRows.map(booking=>{const payment=booking.payment!;const fine=payment.cancellationDeductionPence||0;const refund=payment.refundedPence||0;const net=payment.payoutStatus==='CANCELLED'?0:payment.transporterProceedsPence||0;const beforeFine=net+fine;const paidAt=payment.events[0]?.createdAt;return <article className={styles.card} key={booking.id}>
   <div className={styles.cardTop}><div><div className={styles.pills}><span>{label(booking.status)}</span><span className={payment.payoutStatus==='PAID'?styles.paid:payment.payoutStatus==='HELD'?styles.held:''}>{payoutLabel(booking)}</span></div><h3>{booking.job.vehicleMake} {booking.job.vehicleModel}</h3><p>{booking.customer.name}{booking.job.registration?` · ${booking.job.registration}`:''}</p><small>Delivery reference · {reference(booking.id)}</small></div><strong className={filter==='FINES'?styles.adjustmentAmount:undefined}>{filter==='FINES'?`−${money(fine+refund)}`:money(net)}</strong></div>
   <div className={styles.route}><div><small>Collection</small><b>{booking.job.collection}</b></div><span>→</span><div><small>Delivery</small><b>{booking.job.delivery}</b></div></div>
   <div className={styles.breakdown}>
    {fine>0&&<><div><span>Proceeds before cancellation fine</span><b>{money(beforeFine)}</b></div><div><span>Cancellation fine deducted</span><b className={styles.deduction}>−{money(fine)}</b></div></>}
    {refund>0&&<div><span>Customer refund</span><b className={styles.deduction}>−{money(refund)}</b></div>}
    <div><span>{fine>0?'Net proceeds':payment.payoutStatus==='CANCELLED'?'Net payout':'Booked proceeds'}</span><b>{money(net)}</b></div>
    <div><span>Payout status</span><b>{payoutLabel(booking)}</b></div>
    <div><span>Collection date</span><b>{booking.job.collectionDate?new Date(booking.job.collectionDate).toLocaleDateString('en-GB'):'Not recorded'}</b></div>
    {paidAt&&<div><span>Paid on</span><b>{new Date(paidAt).toLocaleDateString('en-GB')}</b></div>}
   </div>
   {booking.status==='DELIVERED'&&<div className={styles.actions}><Link className="btn light" target="_blank" rel="noreferrer" href={`/bookings/${encodeURIComponent(booking.id)}/statement`}>View printable statement</Link></div>}
  </article>})}</section>}
 </main>;
}
