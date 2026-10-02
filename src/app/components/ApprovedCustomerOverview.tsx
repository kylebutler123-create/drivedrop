import Icon from './ApprovedIcon';
import DeliveryDesignIcon, {vehicleTypeIcon} from './DeliveryDesignIcon';

const statusLabel=(status:string)=>status.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
function deliveryDate(booking:any){
 const completed=booking.status==='DELIVERED'||!!booking.customerConfirmedAt;
 const raw=completed?(booking.proofOfDelivery?.submittedAt||[...(booking.trackingEvents||[])].reverse().find((event:any)=>event.status==='DELIVERED')?.createdAt||booking.customerConfirmedAt):booking.job?.collectionDate;
 if(!raw)return {label:completed?'Delivered':'Collection',text:'To be confirmed'};
 const date=new Date(raw);
 return {label:completed?'Delivered':'Collection',text:Number.isNaN(date.getTime())?'To be confirmed':date.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'})};
}
export function OverviewSummaryIcon({name}:{name:string}){
 const shapes={
  file:<><path d="M14 2.5H6a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-11Z"/><path d="M14 2.5v6h6M8 11.5h8M8 15h8M8 18.5h6"/></>,
  truck:<><path d="M3 5.5h11v12H8M3 5.5v12h1M14 9h4l3 4v4.5h-1M14 17.5h2M18 9v4h3"/><circle cx="6" cy="17.5" r="2"/><circle cx="18" cy="17.5" r="2"/></>,
  circleCheck:<><circle cx="12" cy="12" r="9.5"/><path d="m7.5 12 3 3 6-6"/></>,
  cancel:<><circle cx="12" cy="12" r="9.5"/><path d="m8.5 8.5 7 7m0-7-7 7"/></>
 };
 return <span className="overviewSummaryDecoration" aria-hidden="true"><svg className="approvedIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{shapes[name as keyof typeof shapes]||shapes.file}</svg><svg className="overviewSummaryChevron" viewBox="0 0 12 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3 5 6 7-6 7"/></svg></span>;
}
export default function ApprovedCustomerOverview({bookings,loaded}:{bookings:any[];loaded:boolean}){
 const recent=[...bookings].sort((a,b)=>new Date(b.customerConfirmedAt||b.updatedAt||b.createdAt).getTime()-new Date(a.customerConfirmedAt||a.updatedAt||a.createdAt).getTime()).slice(0,4);
 return <div className="approvedCustomerOverview"><section className="approvedRecentDeliveries"><div className="approvedSectionTitle"><h2>Recent deliveries</h2><a href="/customer?view=bookings">View all <Icon name="arrow"/></a></div>
 {!loaded?<p role="status">Loading your deliveries…</p>:recent.length===0?<div className="approvedOverviewEmpty"><DeliveryDesignIcon name="car"/><h3>Your next journey starts here.</h3><p>Choose Get a Quote in the top navigation to arrange your first vehicle delivery.</p></div>:recent.map(b=>{
 const date=deliveryDate(b);
 return <a key={b.id} className={`approvedRecentRow deliveryRow-${b.status==='CANCELLED'?'cancelled':b.customerConfirmedAt?'completed':'active'}`} href={`/customer?view=${b.status==='CANCELLED'?'cancelled':b.customerConfirmedAt?'completed':'bookings'}`}>
 <span className="approvedVehicleSymbol"><DeliveryDesignIcon name={vehicleTypeIcon(b.job?.vehicleType)}/></span><span className="overviewVehicleCopy"><strong>{b.job?.vehicleMake} {b.job?.vehicleModel}</strong><small>{b.job?.collection} → {b.job?.delivery}</small></span>
 <span className="overviewDeliveryDate"><small>{date.label}</small><span>{date.text}</span></span>
 <span className={`approvedLiveStatus status-${b.customerConfirmedAt?'completed':String(b.status).toLowerCase()}`}>{b.customerConfirmedAt?'Completed':statusLabel(b.status)}</span><DeliveryDesignIcon name="chevron"/></a>;
 })}</section></div>;
}
