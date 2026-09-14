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
const activeStatuses=['CONFIRMED','COLLECTION_SCHEDULED','COLLECTED','IN_TRANSIT','ARRIVING_SOON','DELIVERED'] as const;
const payoutLabel=(booking:any)=>{
 const status=booking.payment?.payoutStatus;
 if(status==='PAID')return'Paid';
 if(status==='HELD')return'Held';
 if(status==='READY')return'Ready for release';
 if(booking.status==='DELIVERED'&&!booking.customerConfirmedAt)return'Awaiting customer confirmation';
 return'In progress';
};

export default async function TransporterProceeds(){
 const user=await currentUser();
 if(!user)redirect('/login?account=transporter');
 if(user.role!=='TRANSPORTER')notFound();
 const bookings=await prisma.booking.findMany({
  where:{transporterId:user.id,status:{in:[...activeStatuses]}},
  select:{
   id:true,status:true,customerConfirmedAt:true,createdAt:true,
   customer:{select:{name:true}},
   job:{select:{vehicleMake:true,vehicleModel:true,registration:true,collection:true,delivery:true,collectionDate:true}},
   payment:{select:{transporterProceedsPence:true,cancellationDeductionPence:true,payoutStatus:true,updatedAt:true,events:{where:{type:'PAYOUT_PAID'},select:{createdAt:true},orderBy:{createdAt:'desc'},take:1}}}
  },
  orderBy:{createdAt:'desc'}
 });
 const rows=bookings.filter(booking=>booking.payment);
 const total=rows.reduce((sum,booking)=>sum+(booking.payment?.transporterProceedsPence||0),0);
 const paid=rows.filter(booking=>booking.payment?.payoutStatus==='PAID').reduce((sum,booking)=>sum+(booking.payment?.transporterProceedsPence||0),0);
 const ready=rows.filter(booking=>booking.payment?.payoutStatus==='READY').reduce((sum,booking)=>sum+(booking.payment?.transporterProceedsPence||0),0);
 const held=rows.filter(booking=>booking.payment?.payoutStatus==='HELD').reduce((sum,booking)=>sum+(booking.payment?.transporterProceedsPence||0),0);
 return <main className={`shell dashboardShell ${styles.page}`}>
  <Link className="backLink" href="/transporter">← Back to transporter dashboard</Link>
  <header className={styles.hero}>
   <div><span>Transporter finances</span><h1>Booked proceeds</h1><p>See the proceeds attached to every active and completed delivery, including payout progress and any cancellation fine deductions.</p></div>
   <div className={styles.total}><small>Total booked proceeds</small><strong>{money(total)}</strong><span>{rows.length} booking{rows.length===1?'':'s'}</span></div>
  </header>
  <section className={styles.summary} aria-label="Proceeds summary">
   <div><small>Booked proceeds</small><strong>{money(total)}</strong></div>
   <div><small>Ready for release</small><strong>{money(ready)}</strong></div>
   <div><small>Held</small><strong>{money(held)}</strong></div>
   <div><small>Paid</small><strong>{money(paid)}</strong></div>
  </section>
  <div className={styles.heading}><div><h2>Proceeds breakdown</h2><p>Newest bookings first</p></div><span>{rows.length} record{rows.length===1?'':'s'}</span></div>
  {rows.length===0?<section className="dashboardCard emptyState"><div>£</div><h3>No booked proceeds yet</h3><p>Proceeds will appear here after a customer accepts and pays for a delivery.</p></section>:<section className={styles.list}>{rows.map(booking=>{const payment=booking.payment!;const fine=payment.cancellationDeductionPence||0;const net=payment.transporterProceedsPence||0;const beforeFine=net+fine;const paidAt=payment.events[0]?.createdAt;return <article className={styles.card} key={booking.id}>
   <div className={styles.cardTop}><div><div className={styles.pills}><span>{label(booking.status)}</span><span className={payment.payoutStatus==='PAID'?styles.paid:payment.payoutStatus==='HELD'?styles.held:''}>{payoutLabel(booking)}</span></div><h3>{booking.job.vehicleMake} {booking.job.vehicleModel}</h3><p>{booking.customer.name}{booking.job.registration?` · ${booking.job.registration}`:''}</p><small>Delivery reference · {reference(booking.id)}</small></div><strong>{money(net)}</strong></div>
   <div className={styles.route}><div><small>Collection</small><b>{booking.job.collection}</b></div><span>→</span><div><small>Delivery</small><b>{booking.job.delivery}</b></div></div>
   <div className={styles.breakdown}>
    {fine>0&&<><div><span>Proceeds before cancellation fine</span><b>{money(beforeFine)}</b></div><div><span>Cancellation fine deducted</span><b className={styles.deduction}>−{money(fine)}</b></div></>}
    <div><span>{fine>0?'Net proceeds':'Booked proceeds'}</span><b>{money(net)}</b></div>
    <div><span>Payout status</span><b>{payoutLabel(booking)}</b></div>
    <div><span>Collection date</span><b>{booking.job.collectionDate?new Date(booking.job.collectionDate).toLocaleDateString('en-GB'):'Not recorded'}</b></div>
    {paidAt&&<div><span>Paid on</span><b>{new Date(paidAt).toLocaleDateString('en-GB')}</b></div>}
   </div>
   {booking.status==='DELIVERED'&&<div className={styles.actions}><Link className="btn light" target="_blank" rel="noreferrer" href={`/bookings/${encodeURIComponent(booking.id)}/statement`}>View printable statement</Link></div>}
  </article>})}</section>}
 </main>;
}
