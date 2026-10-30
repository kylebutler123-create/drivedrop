'use client';

import Link from 'next/link';
import Icon from './ApprovedIcon';
import {MobileVehiclePhoto,MobileRoute} from './MobileTransportDesign';
import {TransporterDeliveryProof,deliveryTime} from './TransporterDeliveryProof';
import {MobileDeliveryFacts} from './MobileDeliveryDetails';
import type {CompletedPayoutStatus} from '@/lib/payout-policy';

type ArchiveJob={id?:string;vehiclePhotoPath?:string|null;vehicleType?:string|null;vehicleMake:string;vehicleModel:string;registration?:string|null;collection:string;delivery:string;collectionDate?:string;running?:boolean;transportType?:string};
type ArchiveBooking={id:string;job:ArchiveJob;customer:{name:string};cancelledAt?:string|null};
const date=(value?:string|null)=>{const parsed=value?new Date(value):null;return parsed&&Number.isFinite(parsed.getTime())?parsed.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/London'}):'Not recorded'};
const money=(value:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(value/100);

function ArchiveHero({booking,cancelled=false}:{booking:ArchiveBooking;cancelled?:boolean}){
 const job={...booking.job,vehicleType:booking.job.vehicleType||undefined};
 return <><div className="ddArchiveHero"><MobileVehiclePhoto job={job}/><div className="ddArchiveLabels"><span className={cancelled?'isCancelled':''}><Icon name={cancelled?'ban':'circleCheck'}/>{cancelled?'Cancelled':'Completed'}</span><small>DD-{booking.id.slice(-8).toUpperCase()}</small></div><div className="ddArchiveTitle"><h2>{booking.job.vehicleMake} {booking.job.vehicleModel}</h2><MobileRoute job={job}/></div></div><div className="ddArchiveCustomer"><span>{String(booking.customer.name||'').trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()||<Icon name="user"/>}</span><div><strong>{booking.customer.name}</strong><small>{booking.job.registration||'Registration not provided'}</small></div></div></>;
}

export function ArchivePrintIcon(){return <svg className="ddArchivePrintIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9V2h12v7M6 18H2V9h20v9h-4M6 14h12v8H6ZM17 12h1"/></svg>}

export function MobileCompletedSummary({booking,open,onToggle,payoutText,payoutStatus,completedAt}:{booking:any;open:boolean;onToggle:()=>void;payoutText:string;payoutStatus:string;completedAt?:string}){
 const collection=(booking.evidence||[]).some((item:any)=>item.type==='COLLECTION');
 const delivery=(booking.evidence||[]).some((item:any)=>item.type==='DELIVERY');
 const proof=collection&&delivery?'Collection & delivery proof saved':delivery?'Delivery proof saved':collection?'Collection proof saved':'Proof incomplete';
 return <div className="ddMobileOnly ddArchiveSummary"><ArchiveHero booking={booking}/><div className="ddArchiveSummaryBody"><div className="ddArchiveDate"><span><Icon name="calendar"/></span>Delivered {date(completedAt)}</div><div className="ddArchivePayout"><span className="ddArchiveMoneyIcon"><Icon name="pound"/></span><div><small>{booking.payment?.cancellationDeductionPence>0?'Net payout':'Your proceeds'}</small><strong>{booking.payment?money(booking.payment.transporterProceedsPence||0):'—'}</strong></div><span className="ddArchivePayoutStatus" data-state={payoutStatus}>{payoutText}</span></div><p className={`ddArchiveProofStatus${collection&&delivery?'':' isIncomplete'}`}><Icon name={collection&&delivery?'circleCheck':'file'}/>{proof}</p><button type="button" className="ddArchiveToggle" aria-expanded={open} aria-controls={`mobile-completed-details-${booking.id}`} onClick={onToggle}>{open?'Hide delivery details':'View delivery details'}<Icon name={open?'chevronDown':'arrow'}/></button></div></div>;
}

/** Read-only presentation; payout eligibility and all actions stay in the parent. */
export function MobileCompletedDetails({booking,payoutDetailsComplete,payoutStatus,adminReleaseApproved}:{booking:any;payoutDetailsComplete:boolean;payoutStatus:CompletedPayoutStatus;adminReleaseApproved:boolean}){
 const fine=booking.payment?.cancellationDeductionPence||0;
 const refund=booking.payment?.refundedPence||0;
 const net=booking.payment?.transporterProceedsPence||0;
 const paidAt=booking.payment?.events?.find((event:any)=>event.type==='PAYOUT_PAID')?.createdAt;
 const disputes=(booking.disputes||[]).filter((item:any)=>['OPEN','UNDER_REVIEW'].includes(item.status));
 return <div className="ddMobileOnly ddArchiveExpanded ddCompletedApproved" id={`mobile-completed-details-${booking.id}`}>
  <MobileDeliveryFacts job={booking.job}/>
  <section className="ddArchivePayoutDetails"><h3>Payout details</h3><dl><div><dt>Customer confirmation</dt><dd>{booking.customerConfirmedAt?deliveryTime(booking.customerConfirmedAt):'Awaiting confirmation'}</dd></div><div><dt>Payout setup</dt><dd>{payoutDetailsComplete?'Complete':'Missing'}</dd></div>{fine>0&&<><div><dt>Proceeds before fine</dt><dd>{money(net+fine)}</dd></div><div><dt>Fine deducted</dt><dd>−{money(fine)}</dd></div></>}{refund>0&&<div><dt>{booking.payment.status==='REFUNDED'?'Full refund adjustment':'Partial refund adjustment'}</dt><dd>−{money(refund)}</dd></div>}{paidAt&&<div><dt>Payout released</dt><dd>{deliveryTime(paidAt)}</dd></div>}{adminReleaseApproved&&<div><dt>Admin payout approval</dt><dd>Approved after dispute review</dd></div>}</dl>
   {payoutStatus==='HELD'&&<div className="ddArchiveHeld"><strong>{disputes.length?'Dispute under review':'Payout held for review'}</strong>{disputes.map((dispute:any)=><p key={dispute.id}>{dispute.reason?.trim()||'No dispute reason recorded.'}</p>)}<p>Payout remains held while DriveDrop reviews this delivery.</p></div>}
   {!payoutDetailsComplete&&!['PAID','CANCELLED'].includes(booking.payment?.payoutStatus)&&<div className="ddArchiveHeld"><strong>Payout details required</strong><p>Complete payout setup in Account before DriveDrop can release this payout.</p><Link href="/account">Set up payouts <Icon name="arrow"/></Link></div>}
   {booking.payment?.provider==='STRIPE'&&booking.payment?.payoutStatus==='PAID'&&<p className="ddArchiveStripeNote">Released to your Stripe balance. Bank arrival is shown separately in your Stripe dashboard.</p>}
  </section>
  <details className="ddCompletedEvidence"><summary><Icon name="file"/><span><strong>Collection &amp; delivery evidence</strong><small>Photos and signed reports</small></span><Icon name="chevronDown"/></summary><div className="ddEvidenceReports"><TransporterDeliveryProof booking={booking} type="COLLECTION"/><TransporterDeliveryProof booking={booking} type="DELIVERY"/></div></details>
 </div>;
}

export function MobileCancelledSummary({booking,open,detailsId,onToggle}:{booking:ArchiveBooking;open:boolean;detailsId:string;onToggle:()=>void}){
 return <div className="ddMobileOnly ddArchiveSummary"><ArchiveHero booking={booking} cancelled/><div className="ddArchiveSummaryBody"><div className="ddArchiveCancelledDate"><Icon name="ban"/>Cancelled {date(booking.cancelledAt)}</div><button type="button" className="ddArchiveToggle" onClick={onToggle} aria-expanded={open} aria-controls={detailsId}>{open?'Hide cancellation details':'View cancellation details'}<Icon name={open?'chevronDown':'arrow'}/></button></div></div>;
}

export function ArchiveFilterIcon(){return <svg className="ddArchiveFilterIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 4h18l-7 8v8l-4-2v-6Z"/></svg>}
