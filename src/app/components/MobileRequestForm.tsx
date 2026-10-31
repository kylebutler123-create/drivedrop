'use client';

import {useRef,useState} from 'react';
import type {RequestFormProps} from './CustomerQuoteRequest';
import AddressAutocomplete from './AddressAutocomplete';
import CollectionDateWindowField from './CollectionDateWindowField';
import VehiclePhotoField from './VehiclePhotoField';
import {vehicleTypes} from '@/lib/vehicle-types';
import {transportTypes} from '@/lib/transport-types';
import '../mobile-request-form.css';

export default function MobileRequestForm(props:RequestFormProps){
 const [manual,setManual]=useState(false),[transport,setTransport]=useState(''),[running,setRunning]=useState('');
 const form=useRef<HTMLFormElement>(null);
 function toggleManual(){
  setManual(value=>!value);
  const inputs=Array.from(form.current?.querySelectorAll<HTMLInputElement>('.addressField input')||[]);
  (inputs.find(input=>!input.value.trim())||inputs[0])?.focus();
 }
 return <section className="customerQuoteRequest mobileRequestForm" hidden={props.hidden}>
  <header className="mobileRequestIntro"><h1>Request vehicle transport</h1><p>Tell us what needs moving and receive quotes from verified transporters.</p></header>
  <form ref={form} onSubmit={props.onSubmit} onReset={()=>{setTransport('');setRunning('');setManual(false)}}>
   <section className="mobileRequestSection" aria-labelledby="request-journey-title">
    <h2 id="request-journey-title"><span aria-hidden="true">1</span>Journey details</h2>
    <AddressAutocomplete key={`collection-${props.initialRoute?.collection||'draft'}`} initialValue={props.initialRoute?.collection} name="collection" label="Collection" placeholder="Address or postcode" compact manualEntry={manual}/>
    <AddressAutocomplete key={`delivery-${props.initialRoute?.delivery||'draft'}`} initialValue={props.initialRoute?.delivery} name="delivery" label="Delivery" placeholder="Address or postcode" compact manualEntry={manual}/>
    <p className="mobileAddressHelp">{manual?'Enter both full addresses. ':'Can’t find an address? '}<button type="button" aria-pressed={manual} onPointerDown={event=>event.preventDefault()} onClick={toggleManual}>{manual?'Use address search.':'Enter it manually.'}</button></p>
    <CollectionDateWindowField id="request-collection-window" required disabled={props.submitting} hourlyWindow placeholder="Choose date and availability" hint="All times are UK time."/>
   </section>
   <section className="mobileRequestSection" aria-labelledby="request-vehicle-title">
    <h2 id="request-vehicle-title"><span aria-hidden="true">2</span>Vehicle details</h2>
    <div className="field"><label htmlFor="request-vehicle-type">Vehicle type</label><select id="request-vehicle-type" name="vehicleType" required value={props.selectedVehicleType} onChange={e=>props.onVehicleTypeChange(e.target.value)}><option value="" disabled>Select vehicle type</option>{vehicleTypes.map(type=><option key={type} value={type}>{type}</option>)}</select></div>
    <div className="mobileMakeModel">
     <div className="field"><label htmlFor="request-vehicle-make">Make</label><input id="request-vehicle-make" name="vehicleMake" required placeholder="e.g. BMW"/></div>
     <div className="field"><label htmlFor="request-vehicle-model">Model</label><input id="request-vehicle-model" name="vehicleModel" required placeholder="e.g. 3 Series"/></div>
    </div>
    <div className="field"><label htmlFor="request-registration">Registration <small>(optional)</small></label><input id="request-registration" name="registration" maxLength={20} placeholder="e.g. AB12 CDE" autoCapitalize="characters"/></div>
    <div className="field"><label htmlFor="request-running">Running condition</label><select id="request-running" name="running" required defaultValue="" onChange={e=>setRunning(e.target.value)}><option value="" disabled>Select running condition</option><option value="true">Runs and drives</option><option value="false" disabled={['ANY','DRIVEN'].includes(transport)}>Non-running</option></select></div>
    <div className="field"><label htmlFor="request-transport-type">Transport type</label><select id="request-transport-type" name="transportType" required defaultValue="" onChange={e=>setTransport(e.target.value)}><option value="" disabled>Select transport type</option>{transportTypes.map(type=><option key={type.value} value={type.value} disabled={['ANY','DRIVEN'].includes(type.value)&&running==='false'}>{type.label}</option>)}</select></div>
    {(transport==='DRIVEN'||running==='false')&&<p className="mobileRequestNotice">Driven transport requires a vehicle that runs and drives. Non-running vehicles must be carried.</p>}
    <VehiclePhotoField disabled={props.submitting} compactCopy/>
    {props.message&&<div className={props.message.type==='success'?'formNotice successNotice':'formNotice errorNotice'} role={props.message.type==='success'?'status':'alert'}>{props.message.text}</div>}
    <button className="btn orange mobileRequestSubmit" type="submit" disabled={props.submitting} aria-busy={props.submitting}>{props.submitting?'Submitting request…':'Request quotes'}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg></button>
    <p className="mobileRequestCompare">Compare quotes before choosing a transporter.</p>
   </section>
  </form>
 </section>;
}
