'use client';

import {useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import Icon from './ApprovedIcon';
import AddressAutocomplete from './AddressAutocomplete';
import {vehiclePhotoUrl} from '@/lib/vehicle-photo';
import {vehicleTypeDisplay} from '@/lib/vehicle-types';
import {transportTypeDisplay} from '@/lib/transport-types';
import {BookingCustomerPhoto,PhotoOrInitials} from './MobileCustomerPhoto';

type Vehicle = {id?: string; vehiclePhotoPath?: string | null; mobileVehiclePhotoPath?: string | null; vehicleMake?: string; vehicleModel?: string; vehicleType?: string; collection?: string; delivery?: string; collectionDate?: string; collectionFrom?: string; collectionUntil?: string; transportType?: string; running?: boolean};
type Booking = {id: string; job: Vehicle; status: string; agreedCollectionDate?: string; customerConfirmedAt?: string | null; transporter?: {id?: string; name?: string; phone?: string; profileImageUrl?: string; transporterPhotoUrl?: string|null; averageRating?: number; reviewCount?: number}; customer?: {name?: string; phone?: string}; proofOfCollection?: {submittedAt?: string}; trackingEvents?: {status: string}[]};
const statusLabel = (status: string) => status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
export function mobileDate(value?: string) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.toLocaleDateString('en-GB', {weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/London'}) : 'Date to be arranged';
}
function windowLabel(job: Vehicle) {return job.collectionFrom && job.collectionUntil ? ` · ${job.collectionFrom}–${job.collectionUntil}` : ''}

export function MobileVehiclePhoto({job}: {job: Vehicle}) {
  const [failed, setFailed] = useState<string | null>(null);
  const [override, setOverride] = useState<{id: string; url: string | null} | null>(null);
  useEffect(() => {
    const changed = (event: Event) => {const data = (event as CustomEvent).detail; if (data?.jobId === job.id) setOverride({id: data.jobId, url: data.url})};
    window.addEventListener('drivedrop-vehicle-photo-updated', changed);
    return () => window.removeEventListener('drivedrop-vehicle-photo-updated', changed);
  }, [job.id]);
  const url = override?.id === job.id ? override?.url : vehiclePhotoUrl({...job,vehiclePhotoPath:job.mobileVehiclePhotoPath ?? job.vehiclePhotoPath});
  return <div className={`ddVehiclePhoto${url && failed !== url ? '' : ' ddNoPhoto'}`}>
    {url && failed !== url ? <img src={url} alt={`${job.vehicleMake || ''} ${job.vehicleModel || ''}`.trim() || 'Customer’s vehicle'} loading="lazy" onError={() => setFailed(url)}/>
      : <><Icon name={job.vehicleType?.toLowerCase().includes('van') ? 'truck' : 'car'}/><span>Vehicle photo not supplied</span></>}
  </div>;
}

export function MobileRoute({job}: {job: Vehicle}) {
  return <div className="ddRouteLine"><span><Icon name="location"/>{job.collection}</span><Icon name="arrow"/><span><Icon name="location"/>{job.delivery}</span></div>;
}

export function MobileCustomerHome({name, jobs, bookings, jobsLoaded, bookingsLoaded, onRequest, onView, quoteActivity, deliveryActivity}: {
  name?: string; jobs: unknown[]; bookings: Booking[]; jobsLoaded: boolean; bookingsLoaded: boolean;
  onRequest: (route: {collection: string; delivery: string}) => void; onView: (view: 'QUOTES' | 'BOOKINGS') => void; quoteActivity: number; deliveryActivity: number;
}) {
  const upcoming = [...bookings].sort((a,b) => Date.parse(a.agreedCollectionDate || a.job.collectionDate || '9999-12-31') - Date.parse(b.agreedCollectionDate || b.job.collectionDate || '9999-12-31')).slice(0, 2);
  return <section className="ddMobileOnly ddCustomerHome" aria-label="Your DriveDrop overview">
    <div className="ddCustomerHero"><img src="/mobile-app/transport-hero.webp" alt="" fetchPriority="high"/><div><p>Welcome back{name ? `, ${name.trim().split(/\s+/)[0]}` : ''}</p><h1>Your next move,<br/>simplified.</h1></div></div>
    <form className="ddRouteCard" noValidate onSubmit={event => {event.preventDefault(); const data = new FormData(event.currentTarget); onRequest({collection: String(data.get('collection') || ''), delivery: String(data.get('delivery') || '')})}}>
      <div className="ddRouteFields"><AddressAutocomplete name="collection" label="Collect from"/><AddressAutocomplete name="delivery" label="Deliver to"/></div>
      <button className="ddPrimary" type="submit">Get quotes <Icon name="arrow"/></button>
    </form>
    <div className="ddHomeContent"><h2>Your activity</h2><div className="ddActivityGrid">
      <button type="button" onClick={() => onView('QUOTES')}><Icon name="file"/><span><strong>{jobsLoaded ? jobs.length : '—'}</strong><small>Quote requests</small></span>{quoteActivity > 0 && <i aria-label="New quote activity"/>}<span aria-hidden="true">›</span></button>
      <button type="button" onClick={() => onView('BOOKINGS')}><Icon name="truck"/><span><strong>{bookingsLoaded ? bookings.length : '—'}</strong><small>Active {bookings.length === 1 ? 'delivery' : 'deliveries'}</small></span>{deliveryActivity > 0 && <i aria-label="New delivery activity"/>}<span aria-hidden="true">›</span></button>
    </div><div className="ddSectionTitle"><h2>Upcoming delivery</h2><Link href="/customer?view=bookings">See all</Link></div>
    {!bookingsLoaded ? <p className="ddQuietState" role="status">Loading your deliveries…</p> : upcoming.length ? upcoming.map(booking => <Link key={booking.id} className="ddUpcomingCard" href={`/customer?view=bookings&bookingId=${encodeURIComponent(booking.id)}`}>
      <MobileVehiclePhoto job={booking.job}/><div><div className="ddUpcomingTitle"><strong>{booking.job.vehicleMake} {booking.job.vehicleModel}</strong><span className="ddStatus">{statusLabel(booking.status)}</span></div><MobileRoute job={booking.job}/><small><Icon name="calendar"/>{mobileDate(booking.agreedCollectionDate || booking.job.collectionDate)}{windowLabel(booking.job)}</small></div><span aria-hidden="true">›</span>
    </Link>) : <div className="ddQuietState"><Icon name="truck"/><strong>Your next journey starts here.</strong><p>Get quotes to arrange your first vehicle delivery.</p></div>}
    </div>
  </section>;
}

export function MobileJobsIntro({view}: {view: string}) {
  return <div className={`ddMobileOnly ddJobsIntro${['DELIVERIES','COMPLETED','CANCELLED'].includes(view)?' ddDeliveriesIntro':''}`}><p>Ready for your next move?</p><h1>{view === 'JOBS' || view === 'ALL' ? 'Available jobs' : ['DELIVERIES','COMPLETED','CANCELLED'].includes(view) ? 'Your deliveries' : view === 'QUOTES' ? 'My quotes' : view === 'CANCELLED' ? 'Cancelled deliveries' : 'Completed deliveries'}</h1>{view==='QUOTES'&&<Link className="ddQuoteHistoryLink" href="/transporter/quotes">View all quote history <Icon name="arrow"/></Link>}</div>;
}

export function MobileJobCard({job, open, ownQuote, quoteCard=false, onToggle}: {job: Vehicle; open: boolean; ownQuote?: {pricePence?: number; dateNegotiationStatus?: string; status?: string}; quoteCard?: boolean; onToggle: () => void}) {
  return <div className="ddMobileOnly ddJobPreview"><div className="ddJobImage"><MobileVehiclePhoto job={job}/><span className="ddVehicleType">{vehicleTypeDisplay(job.vehicleType)}</span></div><div className="ddJobCopy"><h2>{job.vehicleMake} {job.vehicleModel}</h2><MobileRoute job={job}/><div className="ddJobFacts"><span><Icon name="calendar"/>{mobileDate(job.collectionDate)}{windowLabel(job)}</span><span><Icon name="car"/>{job.running ? 'Running' : 'Non-running'}</span><span>{transportTypeDisplay(job.transportType).replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '').trim()}</span></div>{ownQuote && (quoteCard ? <div className="ddMyQuotePrice"><div><small>Your quote</small><strong>£{((ownQuote.pricePence || 0) / 100).toFixed(2)}</strong></div><span>{ownQuote.dateNegotiationStatus === 'COUNTERED' ? 'Action needed' : ownQuote.status === 'PENDING' ? 'Awaiting response' : (ownQuote.status || '').replaceAll('_', ' ').toLowerCase().replace(/^./, c => c.toUpperCase())}</span></div> : <p className="ddQuoteStatus">{ownQuote.dateNegotiationStatus === 'COUNTERED' ? 'Action needed · Customer proposed a new date' : `Your quote · £${((ownQuote.pricePence || 0) / 100).toFixed(2)}`}</p>)}<button type="button" className="ddPrimary" aria-expanded={open} onClick={onToggle}>{quoteCard ? (open ? 'Close quote details' : 'View quote details') : open ? 'Close job details' : ownQuote ? 'View job & your quote' : 'View job & quote'}<Icon name={open ? 'chevronDown' : 'arrow'}/></button></div></div>;
}

export function MobileDeliverySummary({booking, role = 'CUSTOMER'}: {booking: Booking; role?: 'CUSTOMER' | 'TRANSPORTER'}) {
  const host = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const transporter = role === 'TRANSPORTER';
  const contact = transporter ? booking.customer : booking.transporter;
  const cancelled = booking.status === 'CANCELLED';
  const progress = cancelled ? -1 : booking.status === 'DELIVERED' || booking.customerConfirmedAt ? 3 : ['IN_TRANSIT','ARRIVING_SOON'].includes(booking.status) ? 2 : booking.status === 'COLLECTED' || booking.proofOfCollection?.submittedAt ? 1 : 0;
  useEffect(() => {
    const card = host.current?.closest('article');
    if (!card) return;
    const sync = () => setOpen(!card.classList.contains('isCollapsed'));
    const observer = new MutationObserver(sync);
    observer.observe(card, {attributes: true, attributeFilter: ['class']});
    sync(); return () => observer.disconnect();
  }, []);
  function toggle() {
    host.current?.closest('article')?.querySelector<HTMLButtonElement>(transporter ? ':scope > .transporterCardToggle' : ':scope > .customerCardToggle')?.click();
  }
  return <div ref={host} className="ddMobileOnly ddDeliveryPreview">
    <div className="ddDeliveryImage"><MobileVehiclePhoto job={booking.job}/><div className="ddDeliveryLabels"><span className={`ddStatus${cancelled ? ' ddCancelled' : ''}`}><Icon name={cancelled ? 'ban' : 'circleCheck'}/>{booking.customerConfirmedAt ? 'Completed' : statusLabel(booking.status)}</span><small>Job ref. DD–{booking.id.slice(-8).toUpperCase()}</small></div><div className="ddDeliveryIdentity"><h2>{booking.job.vehicleMake} {booking.job.vehicleModel}</h2><MobileRoute job={booking.job}/><p><Icon name="calendar"/>{mobileDate(booking.agreedCollectionDate || booking.job.collectionDate)}{windowLabel(booking.job)}</p></div></div>
    <div className="ddJourneyOverview" aria-label="Collection and delivery route overview"><span className="ddJourneyLabel">Route overview</span><svg viewBox="0 0 400 140" preserveAspectRatio="none" aria-hidden="true"><path className="ddJourneyRoad" d="M0 30 100 65 180 10 270 50 400 15M0 110 110 95 190 140M110 0 90 140M230 0 260 140M320 0 300 140M0 65 400 105"/><path className="ddJourneyPath" d="M70 48C160 48 135 100 230 100S270 115 330 115"/></svg><div className="ddJourneyFrom"><Icon name="location"/><span>{booking.job.collection}</span></div><div className="ddJourneyTo"><Icon name="location"/><span>{booking.job.delivery}</span></div></div>
    <div className="ddDeliveryBody"><div className="ddSchedule"><Icon name="calendar"/><span><small>{cancelled ? 'Original collection date' : 'Collection scheduled'}</small><strong>{mobileDate(booking.agreedCollectionDate || booking.job.collectionDate)}{windowLabel(booking.job)}</strong></span></div>
      {!cancelled && <ol className="ddProgress" aria-label="Delivery progress">{['Confirmed','Collected','In transit','Delivered'].map((step, index) => <li key={step} className={index <= progress ? 'isReached' : ''} aria-current={index === progress ? 'step' : undefined}><span>{index < progress ? <Icon name="check"/> : null}</span>{step}</li>)}</ol>}
      <div className="ddDeliveryContact"><span className="ddContactAvatar">{transporter?<BookingCustomerPhoto bookingId={booking.id} name={contact?.name || 'Customer'} active={['CONFIRMED','COLLECTION_SCHEDULED','COLLECTED','IN_TRANSIT','ARRIVING_SOON'].includes(booking.status)}/>:<PhotoOrInitials url={booking.transporter?.transporterPhotoUrl||null} name={contact?.name||'Transporter'}/>}</span><div><strong>{contact?.name || (transporter ? 'Customer' : 'Transporter')}</strong>{!transporter && booking.transporter?.id ? <a href={`/transporter/profile/${encodeURIComponent(booking.transporter.id)}`}>View transporter profile</a> : <small>Customer</small>}</div><a className="ddContactAction" href={`/messages?bookingId=${encodeURIComponent(booking.id)}`}><span><Icon name="chat"/></span>Message</a>{contact?.phone && /\d/.test(contact.phone) && <a className="ddContactAction" href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}><span><Icon name="phone"/></span>Call</a>}</div>
      <button type="button" className="ddPrimary" aria-expanded={open} onClick={toggle}>{open ? 'Close delivery details' : booking.status === 'DELIVERED' && !booking.customerConfirmedAt && !transporter ? 'Review & confirm delivery' : 'View delivery details'}<Icon name="arrow"/></button>
    </div>
  </div>;
}
