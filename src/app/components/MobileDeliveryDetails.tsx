'use client';

import {useState} from 'react';
import Icon from './ApprovedIcon';
import {vehicleTypeDisplay} from '@/lib/vehicle-types';
import {transportTypeDisplay} from '@/lib/transport-types';

const money = (pence: number) => (pence / 100).toLocaleString('en-GB', {style: 'currency', currency: 'GBP'});
const label = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

export function MobileDeliveryFacts({job}: {job: {registration?: string; vehicleType?: string; transportType?: string; running?: boolean}}) {
  const facts = [
    ['Registration', job.registration || 'Not provided'],
    ['Vehicle type', vehicleTypeDisplay(job.vehicleType)],
    ['Transport type', transportTypeDisplay(job.transportType).replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '').trim()],
    ['Running condition', job.running ? 'Runs & drives' : 'Non-running'],
  ];
  return <section className="ddMobileOnly ddDeliveryFacts"><h3>Vehicle details</h3><dl>{facts.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl></section>;
}

type Payment = {status: string; depositPence: number; paidPence: number; transportValuePence: number; transporterProceedsPence: number; payoutStatus: string};

/** Presentation only: amounts and eligibility come from the existing role-scoped booking. */
export function MobileDeliveryPayment({payment, role = 'CUSTOMER', refundedPence, secured = false}: {payment?: Payment | null; role?: 'CUSTOMER' | 'TRANSPORTER'; refundedPence: number; secured?: boolean}) {
  const transporter = role === 'TRANSPORTER';
  return <section className="ddMobileOnly ddDeliveryPayment"><h3>{transporter ? 'Your proceeds' : 'Payment breakdown'}</h3>
    {payment ? <div className="ddPaymentCard"><div className="ddPaymentMain"><div><span>{transporter ? 'Your proceeds' : 'Total payment'}</span><strong>{money(transporter ? payment.transporterProceedsPence : payment.depositPence)}</strong></div>{!transporter && <span className={`ddPaymentStatus${payment.status === 'PAID' ? ' isPaid' : ''}`}>{payment.status === 'PAID' && <Icon name="circleCheck"/>}{label(payment.status)}</span>}</div>
      {transporter && <p className="ddPayoutStatus">Payout · {label(payment.payoutStatus)}</p>}
      {transporter && (secured ? <div className="ddPaymentSecured"><Icon name="circleCheck"/>Customer payment secured</div> : <p className="ddPayoutStatus">Payment · {label(payment.status)}</p>)}
      {refundedPence > 0 && <dl className="ddPaymentAdjustments"><div><dt>{transporter ? 'Refund adjustment' : 'Refunded to you'}</dt><dd>{money(refundedPence)}</dd></div>{!transporter && <div><dt>Remaining paid amount</dt><dd>{money(Math.max(0, payment.paidPence - refundedPence))}</dd></div>}</dl>}
      {transporter && (payment.transportValuePence !== payment.transporterProceedsPence || payment.paidPence !== payment.transportValuePence) && <dl className="ddPaymentAdjustments">{payment.transportValuePence !== payment.transporterProceedsPence && <div><dt>Transport value</dt><dd>{money(payment.transportValuePence)}</dd></div>}{payment.paidPence !== payment.transportValuePence && <div><dt>Payment secured</dt><dd>{money(payment.paidPence)}</dd></div>}</dl>}
    </div> : <p className="ddNoPayment">Payment details will appear here.</p>}
  </section>;
}

/** Leaves the existing section and its controls mounted, including on desktop. */
export function MobileDeliveryDisclosure({title, subtitle, icon = 'file'}: {title: string; subtitle: string; icon?: string}) {
  const [open, setOpen] = useState(false);
  return <button type="button" className="ddMobileOnly ddDisclosureToggle" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name={icon}/><span><strong>{title}</strong><small>{subtitle}</small></span><Icon name="chevronDown"/></button>;
}

type EvidenceItem = {id: string; type?: string; note?: string | null; createdAt?: string};
type Proof = {submittedAt?: string | null; photos?: EvidenceItem[]; signature?: EvidenceItem | null; releasedByName?: string | null; recipientName?: string | null; condition?: string | null; damageNotes?: string | null; notes?: string | null; deliveryLocation?: {latitude: number; longitude: number; accuracyMeters?: number | null; capturedAt?: string | null} | null};
type EvidenceBooking = {evidence?: EvidenceItem[]; proofOfCollection?: Proof; proofOfDelivery?: Proof};
const evidenceTime = (value?: string | null) => {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.toLocaleString('en-GB', {day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London'}) : 'Not recorded';
};

function EvidenceReport({booking, collection}: {booking: EvidenceBooking; collection: boolean}) {
  const title = collection ? 'collection' : 'delivery';
  const proof = (collection ? booking.proofOfCollection : booking.proofOfDelivery) || {};
  const items = (booking.evidence || []).filter(item => item.type === (collection ? 'COLLECTION' : 'DELIVERY'));
  const marker = collection ? '__POC_SIGNATURE__' : '__POD_SIGNATURE__';
  const photos = proof.photos || items.filter(item => !item.note?.includes(marker));
  const signature = proof.signature || items.find(item => item.note?.includes(marker));
  const submittedAt = proof.submittedAt || signature?.createdAt || items[0]?.createdAt;
  const person = collection ? proof.releasedByName : proof.recipientName;
  const notes = collection ? proof.damageNotes : proof.notes;
  const location = !collection ? proof.deliveryLocation : null;
  return <section className="tdFourProof"><h3>Proof of {title}</h3>{submittedAt ? <>
    <div className="tdFourProofRow"><span>{collection ? 'Collected' : 'Delivered'}</span><b>{evidenceTime(submittedAt)}</b></div>
    {person && <div className="tdFourProofRow"><span>{collection ? 'Handover contact' : 'Received by'}</span><b>{person}</b></div>}
    {collection && proof.condition && <p className="tdFourText">{proof.condition === 'EXISTING_DAMAGE' ? 'Existing damage recorded.' : 'No existing damage reported.'}</p>}
    {notes && <p className="tdFourText">{notes}</p>}
  </> : <p className="tdFourText">{collection ? 'Collection' : 'Delivery'} has not been completed yet.</p>}
  {photos.length > 0 && <details className="tdFourPhotos"><summary><Icon name="file"/><span>{collection ? 'Collection' : 'Delivery'} photos <u>View ({photos.length})</u></span></summary><div>{photos.map((photo, index) => <a className="tdFourEvidence" key={photo.id} href={`/api/evidence/${encodeURIComponent(photo.id)}`} target="_blank" rel="noreferrer"><Icon name="file"/>{collection ? 'Collection' : 'Delivery'} photo {index + 1}<u>View</u></a>)}</div></details>}
  {signature && <a className="tdFourEvidence" href={`/api/evidence/${encodeURIComponent(signature.id)}`} target="_blank" rel="noreferrer"><Icon name="file"/>Signature <u>View</u></a>}
  {location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude) && <><a className="tdFourEvidence" href={'https://www.google.com/maps?q=' + encodeURIComponent(location.latitude + ',' + location.longitude)} target="_blank" rel="noreferrer"><Icon name="location"/>Delivery location <u>View</u></a>{(location.accuracyMeters != null || location.capturedAt) && <p className="tdFourText">{location.accuracyMeters != null ? `${Math.round(location.accuracyMeters)} m accuracy` : 'Location recorded'}{location.capturedAt ? ` · Captured ${evidenceTime(location.capturedAt)}` : ''}</p>}</>}
  </section>;
}

/** Uses the same role-authorised reports and evidence URLs, without adding submission paths. */
export function MobileDeliveryEvidence({booking}: {booking: EvidenceBooking}) {
  return <div className="ddMobileOnly ddEvidenceReports"><EvidenceReport booking={booking} collection/><EvidenceReport booking={booking} collection={false}/>{(booking.evidence || []).filter(item => !['COLLECTION', 'DELIVERY'].includes(item.type || '')).map(item => <a className="evidenceRow" key={item.id} href={`/api/evidence/${encodeURIComponent(item.id)}`} target="_blank" rel="noreferrer"><Icon name="file"/><span>{item.note || label(item.type || 'Evidence')}</span><strong>View</strong></a>)}</div>;
}
