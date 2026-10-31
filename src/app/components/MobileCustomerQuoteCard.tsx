'use client';

import {useId, useRef, useState} from 'react';
import Link from 'next/link';
import Icon from './ApprovedIcon';
import {MobileVehiclePhoto, mobileDate} from './MobileTransportDesign';
import VehiclePhotoField from './VehiclePhotoField';
import CustomerRequestActions from './CustomerRequestActions';
import CustomerCollectionDateActions from './CustomerCollectionDateActions';
import {offeredCollection, sortCustomerQuotes} from '@/lib/customer-quote-display';
import {selectionStatusLabel, type ConfirmationSelection} from '@/lib/quote-selection-state';
import {vehicleTypeDisplay} from '@/lib/vehicle-types';
import {transportTypeDisplay} from '@/lib/transport-types';
import '../mobile-customer-quotes.css';

type DateUpdate = Parameters<typeof CustomerCollectionDateActions>[0]['onUpdated'] extends (update: infer T) => void ? T : never;
type Quote = {
  id: string; status: string; pricePence: number; message?: string | null; expiresAt?: string | null;
  dateNegotiationStatus?: string; proposedCollectionDate?: string | null;
  proposedCollectionFrom?: string | null; proposedCollectionUntil?: string | null;
  transporter: {id: string; name: string; businessName?: string | null; personName?: string | null;
    profileImageUrl?: string | null; verificationStatus?: string; transporterVerification?: {status: string} | null;
    averageRating?: number | null; reviewCount?: number};
};
type Job = {
  id: string; status: string; vehicleMake: string; vehicleModel: string; registration?: string;
  vehicleType?: string; transportType?: string; running?: boolean; vehiclePhotoPath?: string | null;
  collection: string; delivery: string; collectionDate: string; collectionFrom?: string; collectionUntil?: string;
  booking?: unknown; quotes: Quote[];
};
type Props = {
  job: Job; now: number; busyQuoteId: string | null; selectionRequest?: ConfirmationSelection;
  notice: {quoteId: string; type: 'error' | 'success'; text: string} | null;
  onSelect: (quoteId: string) => void; onDateUpdated: (quoteId: string, update: DateUpdate) => void;
  onRemoved: (action: 'CANCEL' | 'DELETE') => void;
};
const money = (pence: number) => (pence / 100).toLocaleString('en-GB', {style: 'currency', currency: 'GBP'});
const statusLabel = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
const expired = (quote: Quote, now: number) => !!quote.expiresAt && Date.parse(quote.expiresAt) <= now;

function TransporterAvatar({name, url}: {name: string; url?: string | null}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return <span className="ddQuoteAvatar">{url && failedUrl !== url ? <img src={url} alt="" loading="lazy" onError={() => setFailedUrl(url)}/> : initials(name)}</span>;
}

export default function MobileCustomerQuoteCard({job, now, busyQuoteId, selectionRequest, notice, onSelect, onDateUpdated, onRemoved}: Props) {
  const [open, setOpen] = useState(false);
  const card = useRef<HTMLElement>(null), toggle = useRef<HTMLButtonElement>(null);
  const panelId = useId(), titleId = useId();
  const title = `${job.vehicleMake} ${job.vehicleModel}`;
  const count = job.quotes.length;
  const available = job.quotes.filter(quote => quote.status === 'PENDING' && !expired(quote, now));
  const lowest = available.length ? Math.min(...available.map(quote => quote.pricePence)) : null;
  const locked = !!job.booking || ['CANCELLED', 'COMPLETED', 'BOOKED'].includes(job.status);
  const facts = [
    ['Transport type', transportTypeDisplay(job.transportType).replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '').trim()],
    ['Vehicle type', vehicleTypeDisplay(job.vehicleType)], ['Make', job.vehicleMake], ['Model', job.vehicleModel],
    ['Registration', job.registration || 'Not provided'], ['Running condition', job.running ? 'Runs & drives' : 'Non-running'],
    ['Collection date', mobileDate(job.collectionDate)], ['Collection window (UK)', job.collectionFrom && job.collectionUntil ? `${job.collectionFrom}–${job.collectionUntil}` : 'Time to be arranged'],
    ['Collection', job.collection], ['Delivery', job.delivery],
  ];
  function close() {
    setOpen(false);
    requestAnimationFrame(() => {
      toggle.current?.focus({preventScroll: true});
      const top = card.current?.getBoundingClientRect().top;
      if (top !== undefined && top < 80) window.scrollTo({top: Math.max(0, window.scrollY + top - 84), behavior: 'instant'});
    });
  }
  return <article ref={card} className="ddMobileQuoteCard" data-has-quotes={count > 0} data-job-id={job.id} aria-labelledby={titleId}>
    <div className="ddQuoteImage"><MobileVehiclePhoto job={job}/>
      <div className="ddQuoteBadges"><span>{locked ? statusLabel(job.status) : count ? `${count} quote${count === 1 ? '' : 's'} received` : 'Awaiting quotes'}</span><small>Job ref. DD-{job.id.slice(-8).toUpperCase()}</small></div>
      <div className="ddQuoteIdentity"><h2 id={titleId}>{title}</h2>{job.registration && <p>{job.registration}</p>}</div>
    </div>
    <div className="ddQuoteBody">
      <div className="ddQuoteRoute">{[['Collection', job.collection], ['Delivery', job.delivery]].map(([label, address]) => <div key={label}><Icon name="location"/><span><small>{label}</small><strong>{address}</strong></span></div>)}</div>
      <div className="ddQuoteSchedule"><Icon name="calendar"/><span><small>Requested collection</small><strong>{mobileDate(job.collectionDate)}{job.collectionFrom && job.collectionUntil ? ` · ${job.collectionFrom}–${job.collectionUntil}` : ''}</strong></span></div>
      <div className="ddQuoteCompact" hidden={open}>
        <div className="ddQuotePriceSummary">{lowest !== null ? <><div><small>Lowest quote</small><strong>{money(lowest)}</strong></div><p>{count} quote{count === 1 ? '' : 's'}<br/>to compare</p></> : <p>{count ? 'No available quotes at the moment.' : 'Your request is open for transporter quotes.'}</p>}</div>
        <button ref={toggle} type="button" className="ddPrimary ddQuoteCompare" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(true)}>{count ? `Compare ${count} quote${count === 1 ? '' : 's'}` : 'View request details'}<Icon name="arrow"/></button>
      </div>
      <div id={panelId} className="ddQuoteExpanded" hidden={!open}>
        <details className="ddQuoteDetails"><summary><Icon name="file"/><span>Vehicle &amp; request details</span><Icon name="chevronDown"/></summary><div className="ddQuoteDetailsBody"><dl>{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Not provided'}</dd></div>)}</dl><VehiclePhotoField job={job} compactCopy/></div></details>
        <section className="ddQuoteOffers" aria-label={`Transporter quotes for ${title}`}><header><h3>Transporter quotes</h3><span>{count} received</span></header>
          {selectionRequest && <p className="ddQuoteNotice" role="status">A confirmation request is already in progress for this vehicle. <a href="#availability-requests">View your request</a> to check its status or continue an unfinished payment.</p>}
          {!count && <p className="ddQuoteNotice">No quotes yet. Quotes from transporters will appear here.</p>}
          {sortCustomerQuotes(job.quotes, job, 'date').map(quote => {
            const transporter = quote.transporter, name = transporter.businessName || transporter.personName || transporter.name;
            const schedule = quote.dateNegotiationStatus === 'COUNTERED' && quote.proposedCollectionDate ? {date: quote.proposedCollectionDate, from: quote.proposedCollectionFrom, until: quote.proposedCollectionUntil} : offeredCollection(quote, job);
            const isExpired = expired(quote, now);
            const verified = transporter.verificationStatus === 'APPROVED' || transporter.transporterVerification?.status === 'APPROVED';
            const rating = Number(transporter.averageRating), reviews = Number(transporter.reviewCount) || 0;
            const rated = transporter.averageRating != null && Number.isFinite(rating) && reviews > 0;
            const proposed = quote.dateNegotiationStatus === 'PROPOSED', countered = quote.dateNegotiationStatus === 'COUNTERED';
            const disabled = locked || !!selectionRequest || busyQuoteId !== null || quote.status !== 'PENDING' || isExpired || proposed || countered;
            return <article className="ddQuoteOffer" data-quote-id={quote.id} key={quote.id}>
              <div className="ddQuoteTransporter"><TransporterAvatar name={name} url={transporter.profileImageUrl}/><div><h4>{name}</h4><div className="ddQuoteTrust"><span className={verified ? 'isVerified' : ''}>{verified && <Icon name="circleCheck"/>}{verified ? 'Verified' : 'Verification pending'}</span><span><Icon name="star"/>{rated ? `${rating.toFixed(1)} (${reviews} review${reviews === 1 ? '' : 's'})` : 'New transporter'}</span></div></div></div>
              <div className="ddQuoteOfferedDate"><Icon name="calendar"/><span><small>{proposed ? 'Proposed collection' : countered ? 'Awaiting date agreement' : 'Collection'}</small><strong>{mobileDate(schedule.date)}{schedule.from && schedule.until ? ` · ${schedule.from}–${schedule.until}` : ''}</strong>{(!schedule.from || !schedule.until) && <small>Time to be arranged</small>}</span></div>
              {quote.message?.trim() && <p className="ddQuoteMessage">{quote.message}</p>}
              {proposed && quote.proposedCollectionDate && quote.status === 'PENDING' && !isExpired && !locked && !selectionRequest && <CustomerCollectionDateActions quoteId={quote.id} proposedDate={quote.proposedCollectionDate} onUpdated={update => onDateUpdated(quote.id, update)}/>}
              {countered && <p className="ddQuoteNotice">Awaiting the transporter’s response to your proposed date.</p>}
              <div className="ddQuoteOfferFooter"><div className="ddQuoteTotal"><small>Total price</small><strong>{money(quote.pricePence)}</strong></div><Link className="ddQuoteProfile" href={`/transporter/profile/${encodeURIComponent(transporter.id)}`}>View profile</Link><button type="button" className="ddQuoteSelect" disabled={disabled} aria-busy={busyQuoteId === quote.id} onClick={() => onSelect(quote.id)}>{selectionRequest ? selectionStatusLabel(selectionRequest, quote.id) : busyQuoteId === quote.id ? 'Checking…' : isExpired ? 'Expired' : quote.status !== 'PENDING' ? statusLabel(quote.status) : 'Select quote'}</button></div>
              {quote.expiresAt && <small className="ddQuoteExpiry">{isExpired ? 'This quote expired' : 'Valid until'} {new Date(quote.expiresAt).toLocaleString('en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London'})} UK time</small>}
              {notice?.quoteId === quote.id && <p className={`ddQuoteNotice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.text}</p>}
            </article>;
          })}
        </section>
        <CustomerRequestActions jobId={job.id} vehicle={title} status={job.status} hasBooking={!!job.booking} quoteCount={count} onRemoved={onRemoved}/>
        <button type="button" className="ddQuoteClose" aria-expanded={open} aria-controls={panelId} onClick={close}>Close quote details<Icon name="chevronDown"/></button>
      </div>
    </div>
  </article>;
}
