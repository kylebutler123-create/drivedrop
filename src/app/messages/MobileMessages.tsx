'use client';

import Icon from '../components/ApprovedIcon';
import {MobileVehiclePhoto} from '../components/MobileTransportDesign';

export type MobileBooking = {id: string; status: string; job: {id?: string; mobileVehiclePhotoPath?: string | null; vehicleMake: string; vehicleModel: string; collection: string; delivery: string}};
const label = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
export function messageDay(value: string) {
  const date = new Date(value);
  const day = (d: Date) => d.toLocaleDateString('en-GB', {timeZone: 'Europe/London'});
  if (day(date) === day(new Date())) return 'Today';
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (day(date) === day(yesterday)) return 'Yesterday';
  return date.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London'});
}
export function messageTime(value: string) {return new Date(value).toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London'})}
function previewTime(value?: string) {return value ? messageDay(value) === 'Today' ? messageTime(value) : messageDay(value) : ''}
function Photo({booking}: {booking: MobileBooking}) {return booking.status === 'SUPPORT' ? <span className="ddSupportAvatar"><Icon name="location"/></span> : <MobileVehiclePhoto job={booking.job}/>}

export function MobileInbox({query, onSearch, view, onView, count, unread}: {query: string; onSearch: (value: string) => void; view: 'ALL' | 'UNREAD'; onView: (view: 'ALL' | 'UNREAD') => void; count: number; unread: number}) {
  return <header className="ddMobileOnly ddInboxIntro"><h1>Messages</h1><p>Keep every delivery connected.</p><div className="ddInboxSearch"><Icon name="search"/><input type="search" aria-label="Search mobile conversations" placeholder="Search conversations" value={query} onChange={e => onSearch(e.target.value)}/></div><div className="ddInboxTabs" aria-label="Conversation filters"><button type="button" aria-pressed={view === 'ALL'} onClick={() => onView('ALL')}>Conversations <span>{count}</span></button><button type="button" aria-pressed={view === 'UNREAD'} onClick={() => onView('UNREAD')}>Unread <span>{unread}</span></button></div></header>;
}

export function MobileConversationCard({booking, person, unread, latest}: {booking: MobileBooking; person: string; unread: number; latest?: {body: string; createdAt: string}}) {
  const support = booking.status === 'SUPPORT';
  return <div className="ddMobileOnly ddConversationCard"><Photo booking={booking}/><span className="ddConversationCopy"><strong>{support ? 'DriveDrop Support' : `${booking.job.vehicleMake} ${booking.job.vehicleModel}`}</strong>{!support && <span className="ddConversationPerson">{person}</span>}<span className="ddConversationPreview">{latest?.body === 'Photo' ? 'Picture message' : latest?.body || 'No messages yet'}</span><span className="ddConversationTags">{support ? <small>Private support</small> : <><small>DD-{booking.id.slice(-8).toUpperCase()}</small><small className="ddConversationStatus" data-status={booking.status}>{label(booking.status)}</small></>}</span></span><span className="ddConversationAside"><time dateTime={latest?.createdAt}>{previewTime(latest?.createdAt)}</time>{unread > 0 ? <b aria-label={`${unread} unread messages`}>{unread}</b> : <Icon name="arrow"/>}</span></div>;
}

export function MobileConversationHeader({booking, person, busy, onBack, onDelete}: {booking: MobileBooking; person: string; busy: boolean; onBack: () => void; onDelete: () => void}) {
  const support = booking.status === 'SUPPORT';
  return <div className="ddMobileOnly ddConversationHeading"><header><button type="button" disabled={busy} onClick={onBack} aria-label="Back to conversations"><Icon name="arrow"/></button><div><strong>{person}</strong><small>{support ? 'Private support conversation' : `${booking.job.vehicleMake} ${booking.job.vehicleModel} · DD-${booking.id.slice(-8).toUpperCase()}`}</small></div>{!support ? <details className="ddConversationMenu"><summary aria-label="Conversation options"><Icon name="more"/></summary><div><button type="button" disabled={busy} onClick={onDelete}><Icon name="trash"/>Delete conversation</button></div></details> : <span/>}</header>{!support && <div className="ddConversationContext"><Photo booking={booking}/><div><strong><span>{booking.job.collection}</span><Icon name="arrow"/><span>{booking.job.delivery}</span></strong><small className="ddConversationStatus" data-status={booking.status}>{label(booking.status)}</small></div></div>}</div>;
}
