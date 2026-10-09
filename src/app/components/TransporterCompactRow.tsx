'use client';
import {useState} from 'react';
import Link from 'next/link';
import Icon,{vehicleTypeIcon} from './DeliveryDesignIcon';
import '../transporter-compact-cards.css';
import '../transporter-expanded-cards.css';

export const compactDate=(value:unknown)=>{
 const date=value?new Date(String(value)):null;
 return date&&Number.isFinite(date.getTime())?date.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'}):'Not specified';
};
export default function TransporterCompactRow({job,date,dateLabel='Collection',status,count,price,kind,open=false}:{job:any;date:unknown;dateLabel?:string;status?:string;count?:number;price?:number;kind:'jobs'|'quotes'|'active'|'completed'|'cancelled';open?:boolean}){
 return <span className={`tdCompactRow tdCompact-${kind}`}>
  <span className="tdCompactVehicle"><Icon name={vehicleTypeIcon(job.vehicleType)}/></span>
  <span className="tdCompactIdentity"><strong>{job.vehicleMake} {job.vehicleModel}</strong><span className="tdCompactAddresses"><span className="tdCompactAddress"><Icon name="pin"/><span><b>Collection:</b> {job.collection}</span></span><span className="tdCompactAddress"><Icon name="pin"/><span><b>Delivery:</b> {job.delivery}</span></span></span></span>
  <span className="tdCompactDate"><small>{dateLabel}</small><span>{compactDate(date)}</span>{kind==='jobs'&&job.collectionFrom&&job.collectionUntil&&<span className="tdCompactCollectionWindow"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span>{job.collectionFrom} – {job.collectionUntil} <small>UK time</small></span></span>}</span>
  <span className="tdCompactMeta">{typeof count==='number'&&<span>{count} quote{count===1?'':'s'}</span>}{typeof price==='number'&&<span className="tdCompactPrice"><small>Your quote</small><strong>{new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:2}).format(price/100)}</strong></span>}</span>
  <span className="tdCompactStatusSlot">{status&&<span className="tdCompactStatus">{status}</span>}</span>
  <span className={'tdCompactChevron'+(open?' isOpen':'')}><Icon name="down"/></span>
 </span>;
}

export function ActiveCompactRow({booking}:{booking:any}){
 const[open,setOpen]=useState(false);
 return <div className="tdActiveHeader"><button type="button" className="tdCompactToggle" aria-expanded={open} aria-label={`View delivery details for ${booking.job.vehicleMake} ${booking.job.vehicleModel}`} onClick={event=>{
  const card=event.currentTarget.closest('.transporterBooking');
  card?.querySelector<HTMLButtonElement>(':scope > .transporterCardToggle')?.click();
  setOpen(!card?.classList.contains('isCollapsed'));
 }}><TransporterCompactRow kind="active" job={booking.job} date={booking.agreedCollectionDate||booking.job.collectionDate} status={booking.status.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,(c:string)=>c.toUpperCase())} open={open}/></button>
 <span className="tdCompactContacts"><Link href={`/messages?bookingId=${encodeURIComponent(booking.id)}`} aria-label="Message customer"><Icon name="chat"/></Link>{booking.customer.phone&&<a href={`tel:${String(booking.customer.phone).replace(/[^\d+]/g,'')}`} aria-label="Call customer"><Icon name="phone"/></a>}</span></div>;
}
