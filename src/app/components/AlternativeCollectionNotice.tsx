type Schedule={date:string;from?:string|null;until?:string|null};
export function collectionScheduleDiffers(original:Schedule,selected:Schedule){
 return original.date.slice(0,10)!==selected.date.slice(0,10)||(original.from||'')!==(selected.from||'')||(original.until||'')!==(selected.until||'');
}
const fullDate=(value:string)=>new Date(value).toLocaleDateString('en-GB',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long',year:'numeric'}).replace(',','');
export default function AlternativeCollectionNotice({original,selected}:{original:Schedule;selected:Schedule}){
 if(!collectionScheduleDiffers(original,selected))return null;
 return <section className="alternativeCollectionNotice" aria-label="Alternative collection date or time">
  <div className="alternativeCollectionHeading"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5m0 3v1"/></svg><strong>Alternative collection date or time</strong></div>
  <p>This quote differs from your original request. Please check the transporter’s proposed collection window before continuing.</p>
  <div className="alternativeCollectionOriginal"><span>Originally requested</span><strong>{fullDate(original.date)} · {original.from&&original.until?`${original.from} – ${original.until} UK time`:'Time window to be arranged'}</strong></div>
  <div className="alternativeCollectionSelected"><span>Transporter’s alternative — selected for this quote</span><strong>{fullDate(selected.date)}</strong><strong className="alternativeCollectionWindow">{selected.from&&selected.until?<>{selected.from} – {selected.until} <small>UK time</small></>:'Time window to be arranged'}</strong></div>
 </section>;
}
