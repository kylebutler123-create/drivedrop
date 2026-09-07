import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {currentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import StatementPrintButton from './StatementPrintButton';
import styles from './statement.module.css';

export const dynamic='force-dynamic';
export const revalidate=0;

const money=(pence:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(pence/100);
const bookingReference=(value:string)=>'DD-'+value.slice(-8).toUpperCase();
const dateOnly=(value:Date|null|undefined)=>value?new Intl.DateTimeFormat('en-GB',{dateStyle:'long'}).format(value):'Not recorded';
const dateTime=(value:Date|null|undefined)=>value?new Intl.DateTimeFormat('en-GB',{dateStyle:'long',timeStyle:'short'}).format(value):'Not recorded';
const label=(value:string)=>value.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,character=>character.toUpperCase());

export default async function DeliveryStatement({params}:{params:Promise<{id:string}>}){
 const user=await currentUser();
 if(!user)redirect('/login');
 if(user.role!=='CUSTOMER'&&user.role!=='TRANSPORTER')notFound();
 const{id}=await params;
 const booking=await prisma.booking.findFirst({
  where:{id,status:'DELIVERED',...(user.role==='CUSTOMER'?{customerId:user.id}:{transporterId:user.id})},
  select:{
   id:true,agreedPricePence:true,customerConfirmedAt:true,createdAt:true,
   job:{select:{id:true,collection:true,delivery:true,vehicleMake:true,vehicleModel:true,registration:true,running:true,collectionDate:true}},
   customer:{select:{name:true}},
   transporter:{select:{name:true}},
   trackingEvents:{where:{status:'DELIVERED'},select:{createdAt:true},orderBy:{createdAt:'desc'},take:1},
   payment:{select:{depositPence:true,paidPence:true,refundedPence:true,status:true,payoutStatus:true,transporterProceedsPence:true,events:{where:{type:'PAYOUT_PAID'},select:{createdAt:true},orderBy:{createdAt:'desc'},take:1}}}
  }
 });
 if(!booking)notFound();
 const vehicleRows=await prisma.$queryRaw<Array<{vehicleType:string|null}>>`SELECT "vehicleType" FROM "TransportJob" WHERE "id"=${booking.job.id} LIMIT 1`;
 const vehicleType=vehicleRows[0]?.vehicleType||'Not specified';
 const deliveredAt=booking.trackingEvents[0]?.createdAt;
 const payoutReleasedAt=booking.payment?.events[0]?.createdAt;
 const customerView=user.role==='CUSTOMER';
 const totalPaid=booking.payment?.paidPence||booking.payment?.depositPence||booking.agreedPricePence;
 const refunded=booking.payment?.refundedPence||0;
 const proceeds=booking.payment?.transporterProceedsPence||0;
 const backHref=customerView?'/customer?view=completed':'/transporter?view=completed';
 return <main className={styles.page}>
  <div className={styles.toolbar}><Link className="btn light" href={backHref}>← Back to Completed</Link><StatementPrintButton/></div>
  <article className={styles.statement}>
   <header className={styles.header}>
    <div><span className={styles.brand}>DriveDrop</span><h1>{customerView?'Delivery receipt':'Transporter payment statement'}</h1><p>Completed vehicle transport record</p></div>
    <div className={styles.reference}><small>Delivery reference</small><strong>{bookingReference(booking.id)}</strong><span>Issued {dateOnly(new Date())}</span></div>
   </header>
   <section className={styles.summary}>
    <div><small>{customerView?'Customer':'Transporter'}</small><strong>{customerView?booking.customer.name:booking.transporter.name}</strong></div>
    <div><small>Vehicle</small><strong>{[booking.job.vehicleMake,booking.job.vehicleModel].filter(Boolean).join(' ')}</strong></div>
    <div><small>{customerView?'Total paid':'Transporter proceeds'}</small><strong>{money(customerView?totalPaid:proceeds)}</strong></div>
   </section>
   <section className={styles.section}><h2>Vehicle details</h2><div className={styles.grid}>
    <div><small>Vehicle type</small><strong>{vehicleType}</strong></div>
    <div><small>Make & model</small><strong>{booking.job.vehicleMake} {booking.job.vehicleModel}</strong></div>
    <div><small>Registration</small><strong>{booking.job.registration||'Not provided'}</strong></div>
    <div><small>Running condition</small><strong>{booking.job.running?'Runs and drives':'Non-running'}</strong></div>
   </div></section>
   <section className={styles.section}><h2>Journey</h2><div className={styles.route}>
    <div><small>Collection</small><strong>{booking.job.collection}</strong></div>
    <span>→</span>
    <div><small>Delivery</small><strong>{booking.job.delivery}</strong></div>
   </div></section>
   <section className={styles.section}><h2>Important dates</h2><div className={styles.grid}>
    <div><small>Booking created</small><strong>{dateOnly(booking.createdAt)}</strong></div>
    <div><small>Collection date</small><strong>{dateOnly(booking.job.collectionDate)}</strong></div>
    <div><small>Delivered</small><strong>{dateTime(deliveredAt)}</strong></div>
    <div><small>Customer confirmed</small><strong>{dateTime(booking.customerConfirmedAt)}</strong></div>
    {!customerView&&payoutReleasedAt&&<div><small>Payout released</small><strong>{dateTime(payoutReleasedAt)}</strong></div>}
   </div></section>
   <section className={styles.section}><h2>{customerView?'Payment record':'Payout record'}</h2><div className={styles.payment}>
    {customerView?<><div><span>Total paid</span><strong>{money(totalPaid)}</strong></div>{refunded>0&&<><div><span>Refunded</span><strong>{money(refunded)}</strong></div><div><span>Net paid</span><strong>{money(Math.max(0,totalPaid-refunded))}</strong></div></>}<div><span>Payment status</span><strong>{booking.payment?label(booking.payment.status):'Not recorded'}</strong></div></>:<><div><span>Transporter proceeds</span><strong>{money(proceeds)}</strong></div><div><span>Payout status</span><strong>{booking.payment?label(booking.payment.payoutStatus):'Not recorded'}</strong></div>{payoutReleasedAt&&<div><span>Paid on</span><strong>{dateTime(payoutReleasedAt)}</strong></div>}</>}
   </div></section>
   <footer className={styles.footer}>This statement records activity held by DriveDrop for delivery {bookingReference(booking.id)}.</footer>
  </article>
 </main>;
}
