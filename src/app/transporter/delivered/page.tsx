'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';

const label=(s:string)=>s.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());

export default function DeliveredDeliveries(){
 const[bookings,setBookings]=useState<any[]>([]);
 const[loading,setLoading]=useState(true);
 async function load(){
  try{
   const response=await fetch('/api/transporter/delivered',{cache:'no-store'});
   if(response.ok)setBookings(await response.json());
  }finally{setLoading(false)}
 }
 useEffect(()=>{load()},[]);
 return <main className="shell dashboardShell">
  <div className="dashboardSectionHeading"><div><span className="dashboardEyebrow dark">Delivery history</span><h1>Delivered</h1></div><Link className="btn light" href="/transporter">Back to dashboard</Link></div>
  {loading&&<div className="dashboardCard"><p className="muted">Loading delivered jobs…</p></div>}
  {!loading&&bookings.length===0&&<div className="dashboardCard emptyState"><div>✓</div><h3>No delivered jobs yet</h3><p>Completed deliveries will appear here.</p></div>}
  {bookings.map(b=>{
   const deliveredAt=b.trackingEvents?.[0]?.createdAt||b.customerConfirmedAt;
   return <article className="dashboardCard bookingCard" key={b.id}>
    <div className="bookingTop"><div><span className="statusPill successPill">Delivered</span><h2>{b.job.vehicleMake} {b.job.vehicleModel}</h2><p className="bookingPartner">Customer · <b>{b.customer.name}</b></p></div>{b.payment&&<div className="paymentMini"><span>Your proceeds</span><strong>£{(b.payment.transporterProceedsPence/100).toFixed(2)}</strong><small>Payout · {label(b.payment.payoutStatus)}</small></div>}</div>
    <div className="routeVisual compactRoute"><div><i>●</i><span><small>Collection</small><b>{b.job.collection}</b></span></div><div className="routeLine"/><div><i>●</i><span><small>Delivery</small><b>{b.job.delivery}</b></span></div></div>
    <div className="infoPanel"><div className="infoRow"><span>Registration</span><b>{b.job.registration||'—'}</b></div><div className="infoRow"><span>Agreed price</span><b>£{(b.agreedPricePence/100).toFixed(2)}</b></div><div className="infoRow"><span>Delivered</span><b>{deliveredAt?new Date(deliveredAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'Completed'}</b></div></div>
   </article>
  })}
 </main>
}
