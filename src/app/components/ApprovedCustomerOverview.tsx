import Icon from './ApprovedIcon';

const statusLabel=(status:string)=>status.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
function deliveryDate(booking:any){
 const completed=booking.status==='DELIVERED'||!!booking.customerConfirmedAt;
 const raw=completed?(booking.proofOfDelivery?.submittedAt||[...(booking.trackingEvents||[])].reverse().find((event:any)=>event.status==='DELIVERED')?.createdAt||booking.customerConfirmedAt):booking.job?.collectionDate;
 if(!raw)return {label:completed?'Delivered':'Collection',text:'To be confirmed'};
 const date=new Date(raw);
 return {label:completed?'Delivered':'Collection',text:Number.isNaN(date.getTime())?'To be confirmed':date.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'})};
}
export function OverviewSummaryIcon({name}:{name:string}){
 return <span className="overviewSummaryDecoration" aria-hidden="true">{name==='cancel'?<svg className="approvedIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="m8 8 8 8m0-8-8 8"/></svg>:<Icon name={name}/>}<svg className="overviewSummaryChevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6"/></svg></span>;
}
export default function ApprovedCustomerOverview({bookings,loaded}:{bookings:any[];loaded:boolean}){
 const recent=[...bookings].sort((a,b)=>new Date(b.customerConfirmedAt||b.updatedAt||b.createdAt).getTime()-new Date(a.customerConfirmedAt||a.updatedAt||a.createdAt).getTime()).slice(0,4);
 return <div className="approvedCustomerOverview"><section className="approvedRecentDeliveries"><div className="approvedSectionTitle"><h2>Recent Deliveries</h2><a href="/customer?view=bookings">View All <Icon name="arrow"/></a></div>
 {!loaded?<p role="status">Loading your deliveries…</p>:recent.length===0?<div className="approvedOverviewEmpty"><Icon name="car"/><h3>Your next journey starts here.</h3><p>Choose Get a Quote in the top navigation to arrange your first vehicle delivery.</p></div>:recent.map(b=>{
 const date=deliveryDate(b);
 return <a key={b.id} className="approvedRecentRow" href={`/customer?view=${b.status==='CANCELLED'?'cancelled':b.customerConfirmedAt?'completed':'bookings'}`}>
 <span className="approvedVehicleSymbol"><Icon name="car"/></span><span className="overviewVehicleCopy"><strong>{b.job?.vehicleMake} {b.job?.vehicleModel}</strong><small>{b.job?.collection} → {b.job?.delivery}</small></span>
 <span className="overviewDeliveryDate"><small>{date.label}</small><span>{date.text}</span></span>
 <span className={`approvedLiveStatus status-${b.customerConfirmedAt?'completed':String(b.status).toLowerCase()}`}>{b.customerConfirmedAt?'Completed':statusLabel(b.status)}</span><Icon name="arrow"/></a>;
 })}</section></div>;
}
