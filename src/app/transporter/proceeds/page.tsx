import Link from 'next/link';
import ProceedsDesktop from './ProceedsDesktop';
import {notFound,redirect} from 'next/navigation';
import {currentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import styles from './proceeds.module.css';
import {loadProceeds,proceedsPeriod,inProceedsPeriod,periodQuery,periodDescription,londonDate,type PeriodParams} from '@/lib/transporter-proceeds';

export const dynamic='force-dynamic';
export const revalidate=0;

function ProceedsIcon({name}:{name:'booked'|'progress'|'ready'|'held'|'paid'|'adjustments'|'car'|'van'|'pin'|'folder'|'download'|'calendar'}) {
 const paths={
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
 return <svg className={styles.desktopIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}
const desktopDate=(value:Date|string)=>new Date(value).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
const money=(pence:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format((pence||0)/100);
const label=(value:string)=>value.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,character=>character.toUpperCase());
const reference=(id:string)=>'DD-'+id.slice(-8).toUpperCase();
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
 return <><ProceedsDesktop bookings={JSON.parse(JSON.stringify(allBookings))} initial={params}/><main className={`shell dashboardShell ${styles.page} ${styles.legacyLayout}`}>
  <Link className="backLink" href="/transporter">← Back to transporter dashboard</Link>
  <header className={styles.hero}>
   <div><span>Transporter finances</span><h1>Booked proceeds</h1><p>See the proceeds attached to every active and completed delivery, including payout progress and any fine deductions.</p></div>
   <div className={styles.total}><small>Total booked proceeds before fines</small><strong>{money(total)}</strong><span>{rows.length} booking{rows.length===1?'':'s'}</span></div><span className={styles.desktopBookingCount}>{rows.length} booking{rows.length===1?'':'s'}</span>
  </header>
  <section className={styles.yearSection} aria-label="Yearly statements">
   <div className={styles.yearHeading}><h2>Yearly statements</h2><details className={styles.dateRange}><summary><ProceedsIcon name="calendar"/>Custom date range <span>⌄</span></summary><form action="/transporter/proceeds" method="get"><label>Start date<input type="date" name="start" defaultValue={period.start} required/></label><label>End date<input type="date" name="end" defaultValue={period.end} required/></label><button type="submit">Apply date range</button></form></details></div>
   {periodError&&<p role="alert">{periodError}</p>}
   <nav className={styles.yearCards} aria-label="Select proceeds year">{years.map(year=><Link key={year} href={'/transporter/proceeds?year='+year} className={year===period.year?styles.selectedYear:undefined} aria-current={year===period.year?'page':undefined}><ProceedsIcon name="folder"/><div className={styles.yearIdentity}><strong>{year}</strong><span className={year===period.currentYear?styles.currentYear:styles.archivedYear}>{year===period.currentYear?'Current year':'Archived'}</span><small>1 January – 31 December {year}</small></div><small className={styles.yearCount}>{allBookings.filter(b=>b.payment&&Number(londonDate(b.createdAt).slice(0,4))===year).length} bookings</small><span className={styles.viewYear}>View year <span>→</span></span></Link>)}</nav>
   <div className={styles.downloadBar}><div><strong>Showing {period.title}</strong><span>{periodDescription(period)}</span></div><div className={styles.downloadActions}><a href={exportHref('pdf')}><ProceedsIcon name="download"/>Download PDF</a><a href={exportHref('csv')}><ProceedsIcon name="download"/>Export CSV</a></div></div>
  </section>
  <nav className={styles.summary} aria-label="Filter proceeds">
   <Link href={href()} className={filter==='BOOKED'?styles.active:undefined} aria-current={filter==='BOOKED'?'page':undefined}><ProceedsIcon name="booked"/><small>Booked proceeds</small><strong>{money(total)}</strong></Link>
   <Link href={href("in_progress")} className={filter==='IN_PROGRESS'?styles.active:undefined} aria-current={filter==='IN_PROGRESS'?'page':undefined}><ProceedsIcon name="progress"/><small>In progress</small><strong>{money(inProgressTotal)}</strong></Link>
   <Link href={href("ready")} className={filter==='READY'?styles.active:undefined} aria-current={filter==='READY'?'page':undefined}><ProceedsIcon name="ready"/><small>Ready for release</small><strong>{money(ready)}</strong></Link>
   <Link href={href("held")} className={filter==='HELD'?styles.active:undefined} aria-current={filter==='HELD'?'page':undefined}><ProceedsIcon name="held"/><small>Held</small><strong>{money(held)}</strong></Link>
   <Link href={href("paid")} className={filter==='PAID'?styles.active:undefined} aria-current={filter==='PAID'?'page':undefined}><ProceedsIcon name="paid"/><small>Paid</small><strong>{money(paid)}</strong></Link>
   <Link href={href("fines")} className={`${styles.adjustments} ${filter==='FINES'?styles.active:''}`} aria-current={filter==='FINES'?'page':undefined}><ProceedsIcon name="adjustments"/><small><span className={styles.legacyCopy}>Fines/Refunds</span><span className={styles.desktopCopy}>Fines / Refunds</span></small><strong className={styles.adjustmentsTotal}><span className="desktopAdjustmentRows"><span><span>Fines</span><b>−{money(fines)}</b></span><span><span>Refunded</span><b>−{money(refunds)}</b></span></span><span className="mobileAdjustmentTotal">−{money(fines)} fines / −{money(refunds)} refunded</span></strong></Link>
  </nav>
  <p className={styles.totalsNote}>Proceeds totals shown before fines.</p>
  {filter==='FINES'&&<div className={styles.adjustmentControls}>
   <span>Filter Fines / Refunds records</span>
   <details>
    <summary>{adjustmentFilter==='FINES'?'Fines only · −'+money(fines):adjustmentFilter==='REFUNDS'?'Refunds only · −'+money(refunds):'All fines and refunds · '+adjustmentRows.length}</summary>
    <div>
     <Link className={adjustmentFilter==='ALL'?styles.selectedAdjustment:undefined} href={href("fines")}>All fines and refunds <b>{adjustmentRows.length}</b></Link>
     <Link className={adjustmentFilter==='FINES'?styles.selectedAdjustment:undefined} href={href("fines","fines")}>Fines <b>−{money(fines)}</b></Link>
     <Link className={adjustmentFilter==='REFUNDS'?styles.selectedAdjustment:undefined} href={href("fines","refunds")}>Refunds <b>−{money(refunds)}</b></Link>
    </div>
   </details>
  </div>}
  <div className={styles.heading}><div><h2>{breakdownTitle}</h2><p>Newest bookings first</p></div><span>{visibleRows.length} record{visibleRows.length===1?'':'s'}</span></div>
  {visibleRows.length===0?<section className="dashboardCard emptyState"><div>£</div><h3>No {breakdownTitle.toLowerCase()}</h3><p>{filter==='BOOKED'?'Proceeds will appear here after a customer accepts and pays for a delivery.':'No proceeds currently match this status.'}</p></section>:<section className={styles.list}>{visibleRows.map(booking=>{const payment=booking.payment!;const fine=payment.cancellationDeductionPence||0;const refund=payment.refundedPence||0;const net=payment.payoutStatus==='CANCELLED'?0:payment.transporterProceedsPence||0;const beforeFine=net+fine;const paidAt=payment.events[0]?.createdAt;return <article className={styles.card} key={booking.id}>
   <div className={styles.cardTop}><div><div className={styles.pills}><span data-delivery-status={booking.status}>{label(booking.status)}</span><span data-payout-status={payment.payoutStatus} className={payment.payoutStatus==='PAID'?styles.paid:payment.payoutStatus==='HELD'?styles.held:''}>{payoutLabel(booking)}</span></div><div className={styles.identity}><span className={styles.vehicleIcon}><ProceedsIcon name={/van|motorhome|plant|other/i.test(vehicleTypeById.get(booking.job.id)||'')?'van':'car'}/></span><h3>{booking.job.vehicleMake} {booking.job.vehicleModel}</h3><p>{booking.customer.name}{booking.job.registration?` · ${booking.job.registration}`:''}</p><small>Delivery reference · {reference(booking.id)}</small></div></div><strong className={filter==='FINES'?styles.adjustmentAmount:undefined}>{filter==='FINES'?`−${money(fine+refund)}`:money(net)}</strong></div>
   <div className={styles.route}><div><small>Collection</small><b><ProceedsIcon name="pin"/>{booking.job.collection}</b></div><span>→</span><div><small>Delivery</small><b><ProceedsIcon name="pin"/>{booking.job.delivery}</b></div></div>
   <div className={styles.cardBottom}><div className={styles.breakdown}>
    {fine>0&&<><div><span>Proceeds before fine</span><b>{money(beforeFine)}</b></div><div><span>Fine deducted</span><b className={styles.deduction}>−{money(fine)}</b></div></>}
    {refund>0&&<div><span>Refund adjustment</span><b className={styles.deduction}>−{money(refund)}</b></div>}
    <div><span>{fine>0?'Net proceeds':payment.payoutStatus==='CANCELLED'?'Net payout':'Booked proceeds'}</span><b>{money(net)}</b></div>
    <div><span>Payout status</span><b>{payoutLabel(booking)}</b></div>
    <div><span>Collection date</span><b>{booking.job.collectionDate?<><span className={styles.legacyCopy}>{new Date(booking.job.collectionDate).toLocaleDateString('en-GB')}</span><span className={styles.desktopCopy}>{desktopDate(booking.job.collectionDate)}</span></>:'Not recorded'}</b></div>
    {paidAt&&<div><span>Paid on</span><b><span className={styles.legacyCopy}>{new Date(paidAt).toLocaleDateString('en-GB')}</span><span className={styles.desktopCopy}>{desktopDate(paidAt)}</span></b></div>}
   </div>
   {booking.status==='DELIVERED'&&<div className={styles.actions}><Link className="btn light" target="_blank" rel="noreferrer" href={`/bookings/${encodeURIComponent(booking.id)}/statement`}>View printable statement</Link></div>}</div>
  </article>})}</section>}
  <p className={styles.archiveNote}>A new year starts automatically. Previous years stay available to view and download.</p>
 </main></>;
}
