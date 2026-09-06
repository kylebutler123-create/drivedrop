'use client';
import {useMemo,useState} from 'react';
import PayoutRecords from './PayoutRecords';

type Category='READY'|'HELD'|'PAID';
const categories:[Category,string,string][]=[
 ['READY','Ready','£'],
 ['HELD','Held','🛡️'],
 ['PAID','Paid','✓']
];
const money=(p:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(p/100);
const bookingReference=(value:any)=>{const id=String(value??'').trim();return id?`DD-${id.slice(-8).toUpperCase()}`:''};
const eventDate=(payment:any,category:Category)=>{
 const eventType=category==='PAID'?'PAYOUT_PAID':category==='READY'?'PAYOUT_READY':null;
 const event=eventType?payment.events?.find((item:any)=>item.type===eventType):null;
 return new Date(event?.createdAt||payment.updatedAt||payment.createdAt||0).getTime();
};
const searchableText=(payment:any)=>{
 const booking=payment.booking||{},job=booking.job||{},transporter=booking.transporter||{},customer=booking.customer||{};
 return [booking.id,bookingReference(booking.id),job.vehicleType,job.vehicleMake,job.vehicleModel,job.registration,job.collection,job.delivery,transporter.name,transporter.email,customer.name,customer.email].filter(Boolean).join(' ').toLowerCase();
};

export default function PayoutDashboard({rows,initialBlockedOnly=false}:{rows:any[];initialBlockedOnly?:boolean}){
 const[category,setCategory]=useState<Category>('READY');
 const[blockedOnly,setBlockedOnly]=useState(initialBlockedOnly);
 const[query,setQuery]=useState('');
 const[released,setReleased]=useState<Record<string,string>>({});
 const liveRows=useMemo(()=>rows.map(row=>{const releasedAt=released[row.id];return releasedAt?{...row,payoutStatus:'PAID',updatedAt:releasedAt,events:[{id:`released-${row.id}`,type:'PAYOUT_PAID',createdAt:releasedAt},...(row.events||[])]}:row}),[rows,released]);
 const counts=useMemo(()=>Object.fromEntries(categories.map(([key])=>[key,liveRows.filter(row=>row.payoutStatus===key).length])) as Record<Category,number>,[liveRows]);
 const values=useMemo(()=>Object.fromEntries(categories.map(([key])=>[key,liveRows.filter(row=>row.payoutStatus===key).reduce((total,row)=>total+(row.transporterProceedsPence||0),0)])) as Record<Category,number>,[liveRows]);
 const displayed=useMemo(()=>{
  const term=query.trim().toLowerCase();
  return liveRows
   .filter(row=>row.payoutStatus===category)
   .filter(row=>!blockedOnly||category!=='READY'||!row.payoutDetailsComplete)
   .filter(row=>!term||searchableText(row).includes(term))
   .slice()
   .sort((a,b)=>eventDate(b,category)-eventDate(a,category));
 },[liveRows,category,blockedOnly,query]);
 const selectCategory=(next:Category)=>{setCategory(next);setBlockedOnly(false)};
 const payoutReleased=(paymentId:string)=>{const releasedAt=new Date().toISOString();setReleased(current=>({...current,[paymentId]:releasedAt}));setCategory('PAID');setBlockedOnly(false);setQuery('')};
 const title=blockedOnly&&category==='READY'?'Blocked payouts':category==='READY'?'Ready for payout':category==='HELD'?'Held payouts':'Paid payouts';
 const eyebrow=category==='READY'?'Action required':category==='HELD'?'Protected funds':'Finance history';
 const emptyLabel=query?'matching '+category.toLowerCase()+' payouts':blockedOnly?'blocked payouts':category==='READY'?'payouts ready for release':undefined;
 return <>
  <section className="payoutCategoryControls" aria-label="Payout categories">
   {categories.map(([key,name,symbol])=><button type="button" key={key} className={`payoutCategoryButton ${category===key&&!blockedOnly?'isActive':''}`} onClick={()=>selectCategory(key)} aria-pressed={category===key&&!blockedOnly}>
    <span className="payoutCategoryIcon" aria-hidden="true">{symbol}</span>
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
   {blockedOnly&&<button type="button" className="payoutBlockedFilter" onClick={()=>setBlockedOnly(false)}>Blocked only · Show all ready</button>}
  </div>
  <div className="dashboardSectionHeading payoutResultsHeading">
   <div><span className="dashboardEyebrow dark">{eyebrow}</span><h2>{title}</h2></div>
   <span>{displayed.length} shown · newest first</span>
  </div>
  <PayoutRecords rows={displayed} kind={category} emptyLabel={emptyLabel} onPayoutReleased={payoutReleased}/>
 </>;
}
