'use client';
import QuoteDatePicker from './QuoteDatePicker';
import '../collection-date-window-field.css';

type Props={id:string;required?:boolean;disabled?:boolean;initialValue?:string;initialFrom?:string;initialUntil?:string;onChange?:(selection:{value:string;from:string;until:string})=>void};
export default function CollectionDateWindowField({id,required=false,disabled=false,initialValue='',initialFrom='',initialUntil='',onChange}:Props){
 return <div className="field collectionDateWindowField">
  <label htmlFor={id}>Collection date &amp; time window</label>
  <QuoteDatePicker id={id} name="collectionDate" label="Collection date & time window" withWindow required={required} disabled={disabled} initialValue={initialValue} initialFrom={initialFrom} initialUntil={initialUntil} fromName="collectionFrom" untilName="collectionUntil" describedBy={id+'-hint'} onChange={onChange}/>
  <small id={id+'-hint'}>UK time · Date and time window required.</small>
 </div>;
}
