import Link from 'next/link';
import {MobileVehiclePhoto} from '@/app/components/MobileTransportDesign';
import ProceedsDesktop from './ProceedsDesktop';
import {notFound,redirect} from 'next/navigation';
import {currentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import styles from './proceeds.module.css';
import {loadProceeds,proceedsPeriod,inProceedsPeriod,periodQuery,periodDescription,londonDate,type PeriodParams} from '@/lib/transporter-proceeds';

export const dynamic='force-dynamic';
export const revalidate=0;

function ProceedsIcon({name}:{name:'booked'|'progress'|'ready'|'held'|'paid'|'adjustments'|'car'|'van'|'pin'|'folder'|'download'|'calendar'|'wallet'|'arrow'|'chevron'|'print'|'csv'}) {
 const paths={
  wallet:'M3 7h16v14H3ZM3 7V4l13-3 2 6M15 12h7v5h-7ZM18 14.5h.01',
  arrow:'M19 12H5m6-6-6 6 6 6',
  chevron:'m9 5 7 7-7 7',
  print:'M6 9V2h12v7M6 18H2V9h20v9h-4M6 14h12v8H6ZM17 12h1',
  csv:'M5 2h9l5 5v15H5ZM14 2v6h5M8 12h8M8 16h8M8 19h8',
  folder:'M2 7V4h7l3 3h10v3M2 7h19l-4 13H2ZM2 7v13',
  download:'M12 2v13m-5-5 5 5 5-5M3 16v5h18v-5',
  calendar:'M4 4h16v18H4ZM8 2v5m8-5v5M4 10h16',
  booked:'M21 5c0 2-4 3-9 3S3 7 3 5s4-3 9-3 9 1 9 3ZM3 5v14c0 2 4 3 9 3s9-1 9-3V5M3 10c0 2 4 3 9 3s9-1 9-3M3 15c0 2 4 3 9 3s9-1 9-3',
  progress:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M12 6v6l4 3',
  ready:'M5 2h14v20H5ZM8 7h1m3 0h4M8 12h1m3 0h4M8 17h1m3 0h4',
  held:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M9 7v10m6-10v10',
  paid:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0m-15-1 3 3 7-7',
  adjustments:'M12 2 1 22h22ZM12 8v6m0 4h.01',
  car:'M3 15v-4l3-1 3-5h7l4 5 3 1v4h-3m-4 0H8M8 10h11M8 15a2 2 0 1 1-4 0 2 2 0 0 1 4 0m13 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
  van:'M2 17V4h13l7 7v6h-3M6 17h9M15 4v7h7M7 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0m12 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
  pin:'M19 9c0 6-7 13-7 13S5 15 5 9a7 7 0 0 1 14 0ZM15 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
 };
 return <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}
const displayDate=(value:Date|string)=>new Date(value).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
const money=(pence:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format((pence||0)/100);
const label=(value:string)=>value.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,character=>character.toUpperCase());
const reference=(id:string)=>'DD-'+id.slice(-8).toUpperCase();
type ProceedsFilter='BOOKED'|'IN_PROGRESS'|'READY'|'HELD'|'PAID'|'FINES';
type AdjustmentFilter='ALL'|'FINES'|'REFUNDS';
const payoutLabel=(booking:any)=>{
 const status=booking.payment?.payoutStatus;
 if(status==='PAID')return booking.payment?.provider==='STRIPE'?'Released to Stripe':'Paid';
 if(status==='PROCESSING')return'Payout processing';
 if(status==='FAILED')return'Payout needs attention';
 if(status==='HELD')return'Held';
 if(status==='WAITING')return'24-hour hold';
 if(status==='READY')return'Ready for release';
 if(status==='CANCELLED')return'Payout cancelled';
 if(booking.status==='DELIVERED'&&!booking.customerConfirmedAt)return'Awaiting customer confirmation';
 return'In progress';
};
const inProgress=(booking:any)=>!['READY','HELD','PAID','CANCELLED'].includes(booking.payment?.payoutStatus);
const proceedsBeforeFine=(booking:any)=>(booking.payment?.transporterProceedsPence||0)+(booking.payment?.cancellationDeductionPence||0);

export default async function TransporterProceeds({searchParams}:{searchParams:Promise<PeriodParams & {filter?:string;adjustment?:string}>}){
 const[user,params]=await Promise.all([currentUser(),searchParams]);
 if(!user)redirect('/login?account=transporter');
 if(user.role!=='TRANSPORTER')notFound();
 const requested=String(params.filter||'').toUpperCase();
 const filter:ProceedsFilter=requested==='IN_PROGRESS'||requested==='READY'||requested==='HELD'||requested==='PAID'||requested==='FINES'?requested:'BOOKED';
 const requestedAdjustment=String(params.adjustment||'').toUpperCase();
 const adjustmentFilter:AdjustmentFilter=requestedAdjustment==='FINES'||requestedAdjustment==='REFUNDS'?requestedAdjustment:'ALL';
 let period;let periodError='';
 try{period=proceedsPeriod(params)}catch(error){period=proceedsPeriod({});periodError=(error as Error).message}
 const allBookings=await loadProceeds(user.id);
 const years=[...new Set([period.currentYear,...allBookings.filter(b=>b.payment).map(b=>Number(londonDate(b.createdAt).slice(0,4)))])].sort((a,b)=>b-a);
 const bookings=allBookings.filter(b=>inProceedsPeriod(b,period));
 const href=(filter?:string,adjustment?:string)=>{
  const query=periodQuery(period);if(filter)query.set('filter',filter);if(adjustment)query.set('adjustment',adjustment);
  return '/transporter/proceeds?'+query.toString();
 };
 const exportHref=(format:string)=>'/api/transporter/proceeds/export?'+periodQuery(period).toString()+'&format='+format;
 // Vehicle type is stored as an extension column, outside the generated Prisma model.
 // Match the existing jobs/deliveries lookup, scoped to this transporter's booking IDs.
 const jobIds=[...new Set(bookings.map(booking=>booking.job.id))];
 let vehicleTypeRows:Array<{id:string;vehicleType:string|null}>=[];
 if(jobIds.length){
  try{vehicleTypeRows=await prisma.$queryRawUnsafe<Array<{id:string;vehicleType:string|null}>>(`SELECT "id", "vehicleType" FROM "TransportJob" WHERE "id" IN (${jobIds.map((_,i)=>`$${i+1}`).join(',')})`,...jobIds)}
  catch{console.warn('Proceeds vehicle icons unavailable; showing default icons')}
 }
 const vehicleTypeById=new Map(vehicleTypeRows.map(row=>[row.id,row.vehicleType]));
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
 return <><ProceedsDesktop bookings={JSON.parse(JSON.stringify(allBookings))} initial={params}/><main className={`shell dashboardShell ${styles.page}`} data-mobile-proceeds>
  <div className={styles.pageHeading}><Link href="/account" aria-label="Back to account"><ProceedsIcon name="arrow"/></Link><h1>Booked proceeds</h1></div>
  <header className={styles.hero}>
   <div><small>Total booked proceeds before fines</small><strong>{money(total)}</strong><span>{rows.length} booking{rows.length===1?'':'s'} · {period.title}</span><Link href={href()} aria-current={filter==='BOOKED'?'page':undefined}>All proceeds</Link></div>
   <ProceedsIcon name="wallet"/>
  </header>
  <nav className={styles.summary} aria-label="Filter proceeds">
   <Link href={href("in_progress")} aria-current={filter==='IN_PROGRESS'?'page':undefined}><span className={styles.metricIcon}><ProceedsIcon name="van"/></span><span><small>In progress</small><strong>{money(inProgressTotal)}</strong></span><ProceedsIcon name="chevron"/></Link>
   <Link href={href("ready")} aria-current={filter==='READY'?'page':undefined}><span className={styles.metricIcon}><ProceedsIcon name="progress"/></span><span><small>Ready for release</small><strong>{money(ready)}</strong></span><ProceedsIcon name="chevron"/></Link>
   <Link href={href("held")} aria-current={filter==='HELD'?'page':undefined}><span className={`${styles.metricIcon} ${styles.heldIcon}`}><ProceedsIcon name="held"/></span><span><small>Held</small><strong>{money(held)}</strong></span><ProceedsIcon name="chevron"/></Link>
   <Link href={href("paid")} aria-current={filter==='PAID'?'page':undefined}><span className={`${styles.metricIcon} ${styles.paidIcon}`}><ProceedsIcon name="paid"/></span><span><small>Paid</small><strong>{money(paid)}</strong></span><ProceedsIcon name="chevron"/></Link>
   <Link href={href("fines")} className={styles.adjustments} aria-current={filter==='FINES'?'page':undefined}>
    <span className={`${styles.metricIcon} ${styles.fineIcon}`}><ProceedsIcon name="adjustments"/></span><span className={styles.adjustmentsBody}><b>Fines / Refunds</b><span className={styles.adjustmentsTotals}><span><small>Fines</small><strong>−{money(fines)}</strong></span><span><small>Refunds</small><strong>−{money(refunds)}</strong></span></span><small className={styles.totalsNote}>Proceeds totals shown before fines.</small></span><ProceedsIcon name="chevron"/>
   </Link>
  </nav>
  <section className={styles.yearSection} aria-label="Yearly statements">
   <h2>Yearly statements</h2>
   <div className={styles.statementCard}>
    <details key={`${period.start}:${period.end}`} className={styles.yearPicker}>
     <summary><span className={styles.metricIcon}><ProceedsIcon name="folder"/></span><span className={styles.yearIdentity}><strong>{period.year||'Custom date range'}</strong>{period.year&&<span className={period.year===period.currentYear?styles.currentYear:styles.archivedYear}>{period.year===period.currentYear?'Current year':'Archived'}</span>}<small>{periodDescription(period)}</small></span><ProceedsIcon name="chevron"/></summary>
     <nav aria-label="Select proceeds year">{years.map(year=><Link key={year} href={'/transporter/proceeds?year='+year} aria-current={year===period.year?'page':undefined}><span><b>{year}</b><small>{year===period.currentYear?'Current year':'Archived'}</small></span><span>{allBookings.filter(b=>b.payment&&Number(londonDate(b.createdAt).slice(0,4))===year).length} bookings</span><ProceedsIcon name="chevron"/></Link>)}</nav>
    </details>
    <details key={`${period.start}:${period.end}`} className={styles.dateRange}>
     <summary><span className={styles.metricIcon}><ProceedsIcon name="calendar"/></span><b>Custom date range</b><ProceedsIcon name="chevron"/></summary>
     <form action="/transporter/proceeds" method="get"><label>Start date<input type="date" name="start" defaultValue={period.start} required/></label><label>End date<input type="date" name="end" defaultValue={period.end} required/></label><button type="submit">Apply date range</button></form>
    </details>
    {periodError&&<p className={styles.periodError} role="alert">{periodError}</p>}
    <div className={styles.downloadBar}><p>Showing {period.title} · {allRows.length} booking{allRows.length===1?'':'s'}</p><div className={styles.downloadActions}><a href={exportHref('pdf')}><ProceedsIcon name="download"/>Download PDF</a><a href={exportHref('csv')}><ProceedsIcon name="csv"/>Export CSV</a></div></div>
   </div>
   <p className={styles.archiveNote}>Previous years stay available to view and download.</p>
  </section>
  {filter==='FINES'&&<div className={styles.adjustmentControls}>
   <span>Filter Fines / Refunds records</span>
   <details key={adjustmentFilter}>
    <summary>{adjustmentFilter==='FINES'?'Fines only · −'+money(fines):adjustmentFilter==='REFUNDS'?'Refunds only · −'+money(refunds):'All fines and refunds · '+adjustmentRows.length}<ProceedsIcon name="chevron"/></summary>
    <nav aria-label="Filter adjustments">
     <Link aria-current={adjustmentFilter==='ALL'?'page':undefined} href={href("fines")}>All fines and refunds <b>{adjustmentRows.length}</b></Link>
     <Link aria-current={adjustmentFilter==='FINES'?'page':undefined} href={href("fines","fines")}>Fines <b>−{money(fines)}</b></Link>
     <Link aria-current={adjustmentFilter==='REFUNDS'?'page':undefined} href={href("fines","refunds")}>Refunds <b>−{money(refunds)}</b></Link>
    </nav>
   </details>
  </div>}
  <div className={styles.heading}><div><h2>{breakdownTitle}</h2><p>Newest bookings first</p></div><span>{visibleRows.length} record{visibleRows.length===1?'':'s'}</span></div>
  {visibleRows.length===0?<section className={styles.emptyState}><ProceedsIcon name="wallet"/><h3>No {breakdownTitle.toLowerCase()}</h3><p>{filter==='BOOKED'?'Proceeds will appear here after a customer accepts and pays for a delivery.':'No proceeds currently match this status.'}</p></section>:<section className={styles.list} aria-label="Delivery proceeds">{visibleRows.map(booking=>{const payment=booking.payment!;const fine=payment.cancellationDeductionPence||0;const refund=payment.refundedPence||0;const net=payment.payoutStatus==='CANCELLED'?0:payment.transporterProceedsPence||0;const beforeFine=net+fine;const paidAt=payment.events[0]?.createdAt;return <article className={styles.card} key={booking.id}>
   <div className={styles.pills}><span data-delivery-status={booking.status}>{label(booking.status)}</span><span data-payout-status={payment.payoutStatus}>{payoutLabel(booking)}</span></div>
   <div className={styles.identity}><div className={styles.vehiclePhoto}><MobileVehiclePhoto job={{id:booking.job.id,vehiclePhotoPath:booking.job.vehiclePhotoPath,vehicleMake:booking.job.vehicleMake,vehicleModel:booking.job.vehicleModel,vehicleType:vehicleTypeById.get(booking.job.id)||undefined}}/></div><div><h3>{booking.job.vehicleMake} {booking.job.vehicleModel}</h3><p>{booking.customer.name}{booking.job.registration?` · ${booking.job.registration}`:''}</p><small aria-label="Delivery reference">{reference(booking.id)}</small></div></div>
   <div className={styles.route}><div><ProceedsIcon name="pin"/><small>Collection</small><b>{booking.job.collection}</b></div><div><ProceedsIcon name="pin"/><small>Delivery</small><b>{booking.job.delivery}</b></div></div>
   <dl className={styles.breakdown}>
    {fine>0&&<><div><dt>Proceeds before fine</dt><dd>{money(beforeFine)}</dd></div><div><dt>Fine deducted</dt><dd className={styles.deduction}>−{money(fine)}</dd></div></>}
    {refund>0&&<div><dt>Refund adjustment</dt><dd className={styles.deduction}>−{money(refund)}</dd></div>}
    <div className={styles.netAmount}><dt>{fine>0?'Net proceeds':payment.payoutStatus==='CANCELLED'?'Net payout':'Booked proceeds'}</dt><dd>{money(net)}</dd></div>
    <div><dt>Collection date</dt><dd>{booking.job.collectionDate?displayDate(booking.job.collectionDate):'Not recorded'}</dd></div>
    {paidAt&&<div><dt>Paid on</dt><dd>{displayDate(paidAt)}</dd></div>}
   </dl>
   {booking.status==='DELIVERED'&&<Link className={styles.statementLink} target="_blank" rel="noreferrer" href={`/bookings/${encodeURIComponent(booking.id)}/statement`}><ProceedsIcon name="print"/>View printable statement</Link>}
  </article>})}</section>}
 </main></>;
}
