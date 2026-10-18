'use client';
import type {ReactNode} from 'react';
import Icon from './DeliveryDesignIcon';
import {openActiveProof} from './TransporterCompactRow';
import '../transporter-delivery-four-column.css';

export const deliveryTime=(value:unknown)=>{
 const date=value?new Date(String(value)):null;
 return date&&Number.isFinite(date.getTime())?date.toLocaleString('en-GB',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'}):'Not recorded';
};

/** Read-only evidence display. The existing proof form remains the only submission path. */
export function TransporterDeliveryProof({booking,type,children,active=false}:{booking:any;type:'COLLECTION'|'DELIVERY';children?:ReactNode;active?:boolean}){
 const collection=type==='COLLECTION';
 const title=collection?'collection':'delivery';
 const proof=(collection?booking.proofOfCollection:booking.proofOfDelivery)||{};
 const items=(booking.evidence||[]).filter((item:any)=>item.type===type);
 const marker=collection?'__POC_SIGNATURE__':'__POD_SIGNATURE__';
 const photos=proof.photos||items.filter((item:any)=>!item.note?.includes(marker));
 const signature=proof.signature||items.find((item:any)=>item.note?.includes(marker));
 const submittedAt=proof.submittedAt||signature?.createdAt||items[0]?.createdAt;
 const canComplete=active&&(collection?['CONFIRMED','COLLECTION_SCHEDULED'].includes(booking.status):['IN_TRANSIT','ARRIVING_SOON'].includes(booking.status));
 const latitude=proof.deliveryLocation?.latitude??booking.deliveryLatitude;
 const longitude=proof.deliveryLocation?.longitude??booking.deliveryLongitude;
 return <section className={`tdFourProof tdFour${collection?'Collection':'Delivery'}`}>
  <h3>Proof of {title}</h3>
  {submittedAt?<>
   <div className="tdFourProofRow"><span>{collection?'Collected':'Delivered'}</span><b>{deliveryTime(submittedAt)}</b></div>
   {(collection?proof.releasedByName:proof.recipientName)&&<div className="tdFourProofRow"><span>{collection?'Handover contact':'Received by'}</span><b>{collection?proof.releasedByName:proof.recipientName}</b></div>}
   {collection&&proof.condition&&<p className="tdFourText">{proof.condition==='EXISTING_DAMAGE'?'Existing damage recorded.':'No existing damage reported.'}</p>}
   {(collection?proof.damageNotes:proof.notes)&&<p className="tdFourText">{collection?proof.damageNotes:proof.notes}</p>}
  </>:<p className="tdFourText">{collection?'Collection':'Delivery'} has not been completed yet.</p>}
  {photos.length>0&&<details className="tdFourPhotos"><summary><Icon name="camera"/><span>{collection?'Collection':'Delivery'} photos <u>View ({photos.length})</u></span></summary><div>{photos.map((photo:any,i:number)=><a className="tdFourEvidence" key={photo.id} href={`/api/evidence/${encodeURIComponent(photo.id)}`} target="_blank" rel="noreferrer"><Icon name="camera"/>{collection?'Collection':'Delivery'} photo {i+1}<u>View</u></a>)}</div></details>}
  {signature&&<a className="tdFourEvidence" href={`/api/evidence/${encodeURIComponent(signature.id)}`} target="_blank" rel="noreferrer"><Icon name="signature"/>Signature <u>View</u></a>}
  {!collection&&typeof latitude==='number'&&typeof longitude==='number'&&<><a className="tdFourEvidence" href={'https://www.google.com/maps?q='+encodeURIComponent(latitude+','+longitude)} target="_blank" rel="noreferrer"><Icon name="pin"/>Delivery location <u>View</u></a>{(booking.deliveryLocationAccuracyMeters!=null||booking.deliveryLocationCapturedAt)&&<p className="tdFourText">{booking.deliveryLocationAccuracyMeters!=null?`${Math.round(booking.deliveryLocationAccuracyMeters)} m accuracy`:'Location recorded'}{booking.deliveryLocationCapturedAt?` · Captured ${deliveryTime(booking.deliveryLocationCapturedAt)}`:''}</p>}</>}
  {canComplete&&<button type="button" className="tdFourComplete" onClick={event=>{const card=event.currentTarget.closest<HTMLElement>('.transporterBooking');if(card)openActiveProof(card,collection?'collection':'delivery')}}>Complete {title}</button>}
  {children&&<div className="tdFourUploads">{children}</div>}
 </section>;
}

export function CompletedDeliveryProgress({booking}:{booking:any}){
 const events=booking.deliveryProgressEvents||booking.trackingEvents||[];
 const delivered=events.find((event:any)=>event.status==='DELIVERED')?.createdAt||booking.proofOfDelivery?.submittedAt;
 const stages=[{label:'Booking confirmed',at:events.find((event:any)=>event.status==='CONFIRMED')?.createdAt||booking.createdAt},{label:'Collected',at:booking.proofOfCollection?.submittedAt||(booking.evidence||[]).find((item:any)=>item.type==='COLLECTION')?.createdAt},{label:'Delivered',at:delivered},{label:'Customer confirmed',at:booking.customerConfirmedAt}];
 return <section className="tdFourProgress"><h3>Delivery progress</h3><div className="tdFourTimeline">{stages.map(stage=><div key={stage.label} className={`tdFourEvent${stage.at?'':' isPending'}`}><b>{stage.label}</b><small>{stage.at?deliveryTime(stage.at):stage.label==='Customer confirmed'?'Awaiting confirmation':'Not recorded'}</small></div>)}</div>{events.some((event:any)=>event.note)&&<details className="tdFourStatusNotes"><summary>Status updates</summary>{events.filter((event:any)=>event.note).map((event:any,i:number)=><p key={event.id||i}>{deliveryTime(event.createdAt)} · {event.note}</p>)}</details>}</section>;
}
