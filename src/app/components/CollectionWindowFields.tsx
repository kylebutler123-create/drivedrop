'use client';
import {ukParts} from '@/lib/availability-time';
export default function CollectionWindowFields({date,from='',until='',required=false}:{date:string;from?:string|null;until?:string|null;required?:boolean}){
 const sameDay=date.slice(0,10)===ukParts().date;
 return <fieldset className="availabilityWindow"><legend>Collection time window {sameDay||required?'(required)':'(optional)'}</legend><div className="availabilityFields"><label>Available from<input type="time" name="collectionFrom" defaultValue={from||''} required={sameDay||required} aria-label="Available from, UK time"/></label><label>Collect by<input type="time" name="collectionUntil" defaultValue={until||''} required={sameDay||required} aria-label="Collect by, UK time"/></label></div><small>UK time · {sameDay?'Both times are required for same-day collection.':'You can leave both times blank and arrange a window later.'}</small></fieldset>;
}
