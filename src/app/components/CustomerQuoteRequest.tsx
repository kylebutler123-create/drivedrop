'use client';

import type {FormEventHandler, ReactNode} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AddressAutocomplete from './AddressAutocomplete';
import {vehicleTypes} from '@/lib/vehicle-types';
import {transportTypes} from '@/lib/transport-types';

type QuoteView = 'QUOTES' | 'BOOKINGS' | 'COMPLETED' | 'CANCELLED';
type Props = {
  hidden: boolean;
  newJobId: string | null;
  selectedVehicleType: string;
  onVehicleTypeChange: (value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  submitting: boolean;
  message: {type: 'success' | 'error'; text: string} | null;
  onNavigate: (view: QuoteView) => void;
  activity: Record<QuoteView, number>;
};

export function QuoteIcon({name}: {name: 'pin'|'car'|'file'|'truck'|'check'|'cancel'|'help'|'arrow'}) {
  const paths: Record<typeof name, ReactNode> = {
    pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.6"/></>,
    car: <><path d="m5 9 2-6h10l2 6M3 10l2-1h14l2 1v9H3ZM3 19v3h3v-3m12 0v3h3v-3M6 14h2m8 0h2"/></>,
    file: <><path d="M6 2h8l5 5v15H6ZM14 2v6h5M9 12h7M9 16h7"/></>,
    truck: <><path d="M2 5h12v13H2ZM14 9h4l4 5v4h-8M18 9v5h4"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></>,
    check: <><circle cx="12" cy="12" r="10"/><path d="m7 12 3 3 7-7"/></>,
    cancel: <><circle cx="12" cy="12" r="10"/><path d="m8 8 8 8m0-8-8 8"/></>,
    help: <><circle cx="12" cy="12" r="10"/><path d="M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5M12 17h.01"/></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
  };
  return <svg className="quotePolishIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function FieldLabel({mobile, desktop}: {mobile: string; desktop: string}) {
  return <><span className="quoteMobileOnly">{mobile}</span><span className="quoteDesktopOnly">{desktop}</span></>;
}

function desktopCalendarOnly(){
  return typeof window !== 'undefined' && window.matchMedia('(min-width:1024px)').matches && document.body.classList.contains('approvedDesktop');
}
function openCollectionCalendar(input: HTMLInputElement){
  if(!desktopCalendarOnly())return;
  try{input.showPicker?.();}catch{/* The native calendar icon remains available. */}
}

export default function CustomerQuoteRequest(props: Props) {
  return <section className="dashboardCard requestPanel customerQuoteRequest" hidden={props.hidden}>
    <div className="quoteDesktopOnly quotePageIntro">
      <nav className="quoteBreadcrumb" aria-label="Breadcrumb"><Link href="/customer">Customer account</Link><span aria-hidden="true">/</span><span>Get a Quote</span></nav>
      <div className="quotePageHeading"><div><h1>Get a quote</h1><p>Tell us what needs moving and receive quotes from independent transporters.</p></div><span>UK vehicle transport</span></div>

    </div>
    <div className="quoteFormLayout">
      <div className="quoteFormCard">
        <div className="panelHeading quoteMobileOnly"><div><span className="panelIcon">＋</span><div><h2>Request vehicle transport</h2><p>Tell us what needs moving and verified transporters can send you quotes.</p></div></div></div>
        <form onSubmit={props.onSubmit}>
          <div className="grid">
            <div className="quoteDesktopOnly quoteSectionTitle quoteCollectionTitle"><span className="quoteSectionNumber">1</span><QuoteIcon name="pin"/><div><h2>Collection &amp; delivery</h2><p>Where is your vehicle going?</p></div></div>
            <AddressAutocomplete key={`collection-${props.newJobId || 'draft'}`} name="collection" label={<FieldLabel mobile="COLLECTION" desktop="Collection"/>} desktopPlaceholder="Enter collection address"/>
            <AddressAutocomplete key={`delivery-${props.newJobId || 'draft'}`} name="delivery" label={<FieldLabel mobile="DELIVERY" desktop="Delivery"/>} desktopPlaceholder="Enter delivery address"/>
            <div className="field"><label htmlFor="request-collection-date"><FieldLabel mobile="COLLECTION DATE" desktop="Collection date"/></label><input id="request-collection-date" type="date" name="collectionDate" required onClick={event=>openCollectionCalendar(event.currentTarget)} onKeyDown={event=>{
              if(!desktopCalendarOnly()||event.key==='Tab'||event.key==='Escape')return;
              event.preventDefault();
              if(event.key==='Enter'||event.key===' '||event.key==='ArrowDown')openCollectionCalendar(event.currentTarget);
            }} onBeforeInput={event=>{if(desktopCalendarOnly())event.preventDefault()}} onPaste={event=>{if(desktopCalendarOnly())event.preventDefault()}} onDrop={event=>{if(desktopCalendarOnly())event.preventDefault()}}/></div>
            <div className="field"><label htmlFor="request-transport-type"><FieldLabel mobile="TRANSPORT TYPE" desktop="Transport type"/></label><select id="request-transport-type" name="transportType" required defaultValue=""><option value="" disabled>Select transport type</option>{transportTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
            <div className="quoteDesktopOnly quoteSectionTitle quoteVehicleTitle"><span className="quoteSectionNumber">2</span><QuoteIcon name="car"/><div><h2>Vehicle details</h2><p>Help transporters provide an accurate quote.</p></div></div>
            <div className="field quoteVehicleType"><label htmlFor="request-vehicle-type"><FieldLabel mobile="VEHICLE TYPE" desktop="Vehicle type"/></label><select id="request-vehicle-type" name="vehicleType" required value={props.selectedVehicleType} onChange={event => props.onVehicleTypeChange(event.target.value)}><option value="" disabled>Select vehicle type</option>{vehicleTypes.map(type => <option key={type} value={type}>{type}</option>)}</select></div>
            <div className="field quoteExampleField"><label htmlFor="request-vehicle-make"><FieldLabel mobile="MAKE" desktop="Make"/></label><input id="request-vehicle-make" name="vehicleMake" required placeholder=" "/><span className="quoteDesktopOnly quoteExample">e.g. BMW</span></div>
            <div className="field quoteExampleField"><label htmlFor="request-vehicle-model"><FieldLabel mobile="MODEL" desktop="Model"/></label><input id="request-vehicle-model" name="vehicleModel" required placeholder=" "/><span className="quoteDesktopOnly quoteExample">e.g. 3 Series</span></div>
            <div className="field"><label htmlFor="request-registration"><FieldLabel mobile="REGISTRATION" desktop="Registration (optional)"/></label><input id="request-registration" name="registration" maxLength={20} placeholder="e.g. AB12 CDE" autoCapitalize="characters"/></div>
            <div className="field"><label htmlFor="request-running"><FieldLabel mobile="RUNNING?" desktop="Running condition"/></label><select id="request-running" name="running"><option value="true">Runs and drives</option><option value="false">Non-running</option></select></div>
          </div>
          {props.message && <div className={props.message.type === 'success' ? 'formNotice successNotice' : 'formNotice errorNotice'} role={props.message.type === 'success' ? 'status' : 'alert'}>{props.message.text}</div>}
          <div className="quoteSubmitRow"><p className="quoteDesktopOnly">Compare quotes before choosing a transporter.</p><button type="submit" className="btn orange" disabled={props.submitting} aria-busy={props.submitting}>{props.submitting ? 'Submitting request…' : 'Request quotes'}<span className="quoteDesktopOnly"><QuoteIcon name="arrow"/></span></button></div>
        </form>
      </div>
      <aside className="quoteDesktopOnly quoteGuidance" aria-label="Quote request guidance">
        <section className="quoteNextCard"><Image src="/orange-design-preview/assets/customer-quote-countryside-approved.webp" width={419} height={263} sizes="(min-width: 1400px) 407px, 30vw" unoptimized alt="Navy recovery truck carrying a silver car on a countryside road"/><div className="quoteNextContent"><h2>What happens next?</h2><ol>{[
          ['Receive quotes', 'Independent transporters quote for your request.'],
          ['Compare your options', 'Review prices, profiles and messages.'],
          ['Choose your transporter', 'Accept a quote when you are ready.'],
        ].map(([title, copy], index) => <li key={title}><span>{index + 1}</span><div><h3>{title}</h3><p>{copy}</p></div></li>)}</ol></div></section>
        <section className="quoteHelpCard"><h2><QuoteIcon name="help"/>A little help with your request</h2><p>Choose the transport type that suits your vehicle. Enclosed transport is available for cars, motorcycles and classic / prestige vehicles.</p><Link href="/help">Help &amp; support <QuoteIcon name="arrow"/></Link></section>
      </aside>
    </div>
  </section>;
}
