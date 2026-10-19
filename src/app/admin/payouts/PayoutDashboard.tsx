'use client';
import {useReviewClock} from '@/app/components/ReviewWindowNotice';
import {inPayoutReviewWindow,payoutWindowOpen} from '@/lib/payout-policy';
import Icon from '@/app/components/ApprovedIcon';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import PayoutRecords from './PayoutRecords';

type Category='WAITING'|'READY'|'BLOCKED'|'HELD'|'PAID';
const categories:[Category,string,string][]=[
 ['READY','Ready','£'],
 ['WAITING','24-hour hold','◷'],
 ['BLOCKED','Blocked','!'],
 ['HELD','Held','🛡️'],
 ['PAID','Paid','✓']
];
const money=(p:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(p/100);
const bookingReference=(value:any)=>{const id=String(value??'').trim();return id?`DD-${id.slice(-8).toUpperCase()}`:''};
const eventDate=(payment:any,category:Category)=>{
 const eventType=category==='PAID'?'PAYOUT_PAID':category==='READY'||category==='BLOCKED'?'PAYOUT_READY':null;
 const event=eventType?payment.events?.find((item:any)=>item.type===eventType):null;
 return new Date(event?.createdAt||payment.updatedAt||payment.createdAt||0).getTime();
};
const matchesCategory=(row:any,category:Category,now:number)=>{const b={...row.booking,payment:row};if(category==='WAITING')return inPayoutReviewWindow(b,row.events,now);if(category==='READY'||category==='BLOCKED')return row.payoutStatus==='READY'&&payoutWindowOpen(b,row.events,now)&&(category==='READY'?row.payoutDetailsComplete:!row.payoutDetailsComplete);return row.payoutStatus===category;};
const rowsForCategory=(rows:any[],category:Category,now:number)=>rows.filter(row=>matchesCategory(row,category,now));
const csvCell=(value:unknown)=>{let text=String(value??'');if(/^[=+\-@]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"'};
const searchableText=(payment:any)=>{
 const booking=payment.booking||{},job=booking.job||{},transporter=booking.transporter||{},customer=booking.customer||{};
 return [booking.id,bookingReference(booking.id),job.vehicleType,job.vehicleMake,job.vehicleModel,job.registration,job.collection,job.delivery,transporter.name,transporter.email,customer.name,customer.email].filter(Boolean).join(' ').toLowerCase();
};

export default function PayoutDashboard({rows,initialBlockedOnly=false}:{rows:any[];initialBlockedOnly?:boolean}){
 const reviewNow=useReviewClock();const router=useRouter();const previousWaiting=useRef<number|null>(null);
 const[category,setCategory]=useState<Category>(initialBlockedOnly?'BLOCKED':'READY');
 const[query,setQuery]=useState('');
 const[released,setReleased]=useState<Record<string,string>>({});
 const liveRows=useMemo(()=>rows.map(row=>{const releasedAt=released[row.id];return releasedAt?{...row,payoutStatus:'PAID',updatedAt:releasedAt,events:[{id:`released-${row.id}`,type:'PAYOUT_PAID',createdAt:releasedAt},...(row.events||[])]}:row}),[rows,released]);
 const counts=useMemo(()=>Object.fromEntries(categories.map(([key])=>[key,rowsForCategory(liveRows,key,reviewNow).length])) as Record<Category,number>,[liveRows,reviewNow]);
 useEffect(()=>{if(previousWaiting.current!==null&&counts.WAITING<previousWaiting.current)router.refresh();previousWaiting.current=counts.WAITING},[counts.WAITING,router]);
 const values=useMemo(()=>Object.fromEntries(categories.map(([key])=>[key,rowsForCategory(liveRows,key,reviewNow).reduce((total,row)=>total+(row.transporterProceedsPence||0),0)])) as Record<Category,number>,[liveRows,reviewNow]);
 const displayed=useMemo(()=>{
  const term=query.trim().toLowerCase();
  return liveRows
   .filter(row=>matchesCategory(row,category,reviewNow))
   .filter(row=>!term||searchableText(row).includes(term))
   .slice()
   .sort((a,b)=>eventDate(b,category)-eventDate(a,category));
 },[liveRows,category,query,reviewNow]);
 const exportVisible=()=>{
  if(!displayed.length)return;
  const headings=['Delivery reference','Payout status','Status date','Vehicle','Registration','Transporter','Transporter email','Customer','Customer email','Collection','Delivery','Total paid GBP','DriveDrop fee GBP','Transporter proceeds GBP'];
  const data=displayed.map(payment=>{
   const booking=payment.booking||{},job=booking.job||{},transporter=booking.transporter||{},customer=booking.customer||{},timestamp=eventDate(payment,category);
   return [bookingReference(booking.id),category,timestamp?new Date(timestamp).toISOString():'',[job.vehicleMake,job.vehicleModel].filter(Boolean).join(' '),job.registration||'',transporter.name||'',transporter.email||'',customer.name||'',customer.email||'',job.collection||'',job.delivery||'',((payment.paidPence||0)/100).toFixed(2),((payment.platformFeePence||0)/100).toFixed(2),((payment.transporterProceedsPence||0)/100).toFixed(2)];
  });
  const csv=[headings,...data].map(row=>row.map(csvCell).join(',')).join('\r\n');
  const blob=new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='drivedrop-'+category.toLowerCase()+'-payouts-'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),0);
 };
 const selectCategory=(next:Category)=>setCategory(next);
 const payoutReleased=(paymentId:string)=>{const releasedAt=new Date().toISOString();setReleased(current=>({...current,[paymentId]:releasedAt}));setCategory('PAID');setQuery('')};
 const title=category==='WAITING'?'24-hour payout holds':category==='BLOCKED'?'Blocked payouts':category==='READY'?'Ready for payout':category==='HELD'?'Held payouts':'Paid payouts';
 const eyebrow=category==='BLOCKED'?'Details required':category==='READY'?'Action required':category==='HELD'?'Protected funds':'Finance history';
 const emptyLabel=query?'matching '+category.toLowerCase()+' payouts':category==='BLOCKED'?'blocked payouts':category==='READY'?'payouts ready for release':undefined;
 return <>
  <section className="payoutCategoryControls" aria-label="Payout categories">
   {categories.map(([key,name,symbol])=><button type="button" key={key} data-payout-category={key} className={`payoutCategoryButton ${key==='BLOCKED'?'isBlocked':''} ${counts[key]>0?'hasMatches':''} ${category===key?'isActive':''}`} onClick={()=>selectCategory(key)} aria-pressed={category===key}>
    <span className="payoutCategoryIcon" aria-hidden="true"><span className="adminPayoutLegacyIcon">{symbol}</span><span className="adminPayoutVectorIcon">{key==='WAITING'?<svg className="approvedIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>:key==='BLOCKED'||key==='HELD'?<svg className="approvedIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/>{key==='BLOCKED'?<path d="M12 7v6m0 3v1"/>:<path d="M9 8v8m6-8v8"/>}</svg>:<Icon name={key==='READY'?'circleCheck':'coins'}/>}</span></span>
    <span className="payoutCategoryCopy"><b>{name}</b><small>{money(values[key])}</small></span>
    <strong className="payoutCategoryCount" aria-label={`${counts[key]} ${name.toLowerCase()} payouts`}>{counts[key]}</strong>
   </button>)}
  </section>
  <div className="payoutSearchBar">
   <label htmlFor="payout-search">Search payouts</label>
   <div>
    <span aria-hidden="true">⌕</span>
    <input id="payout-search" type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Vehicle, registration, transporter, customer or route" autoComplete="off"/>
    {query&&<button type="button" onClick={()=>setQuery('')} aria-label="Clear payout search">Clear</button>}
   </div>
  </div>
  <div className="dashboardSectionHeading payoutResultsHeading">
   <div><span className="dashboardEyebrow dark">{eyebrow}</span><h2>{title}</h2></div>
   <div className="payoutResultsActions"><span>{displayed.length} shown · newest first</span><button type="button" className="btn light payoutExportButton" onClick={exportVisible} disabled={!displayed.length}>↓ Export visible CSV</button></div>
  </div>
  <PayoutRecords rows={displayed} kind={category==='BLOCKED'?'READY':category} emptyLabel={emptyLabel} onPayoutReleased={payoutReleased}/>
 </>;
}
