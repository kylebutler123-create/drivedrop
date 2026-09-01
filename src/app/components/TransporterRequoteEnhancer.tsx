'use client';

import {useRef,useState} from 'react';

type Quote={
  id:string;
  pricePence:number;
  status:string;
  message?:string|null;
  proposedCollectionDate?:string|null;
};
type Draft={price:string;message:string;date:string};
type Props={jobId:string;quote:Quote;onUpdated:(quote:Quote)=>void};

function quoteDraft(quote:Quote):Draft{
  return {
    price:(quote.pricePence/100).toFixed(2),
    message:quote.message||'',
    date:quote.proposedCollectionDate?.slice(0,10)||''
  };
}

async function saveQuoteRevision(jobId:string,quoteId:string,draft:Draft):Promise<Quote>{
  const pricePence=Math.round(Number(draft.price)*100);
  if(!Number.isFinite(pricePence)||pricePence<1000||pricePence>10_000_000){
    throw new Error('Enter a price between £10 and £100,000.');
  }
  const response=await fetch('/api/quotes',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({
      jobId,
      pricePence,
      message:draft.message,
      proposedCollectionDate:draft.date
    })
  });
  const result=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(result?.error||'Unable to update your quote. Please try again.');
  if(result?.id!==quoteId||typeof result.pricePence!=='number'){
    throw new Error('We could not confirm the update. Check your quote before trying again.');
  }
  return result;
}

export default function TransporterRequoteEnhancer({jobId,quote,onUpdated}:Props){
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState<Draft>(()=>quoteDraft(quote));
  const [saving,setSaving]=useState(false);
  const [notice,setNotice]=useState<{type:'success'|'error';text:string}|null>(null);
  const submitting=useRef(false);

  function openEditor(){
    setDraft(quoteDraft(quote));
    setNotice(null);
    setEditing(true);
  }
  function cancel(){
    if(submitting.current)return;
    setEditing(false);
    setNotice(null);
  }
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(submitting.current||quote.status!=='PENDING')return;
    submitting.current=true;
    setSaving(true);
    setNotice(null);
    try{
      const updated=await saveQuoteRevision(jobId,quote.id,draft);
      onUpdated(updated);
      setEditing(false);
      setNotice({type:'success',text:'Quote updated successfully — the customer can now review your revised offer.'});
    }catch(error){
      setNotice({type:'error',text:error instanceof Error?error.message:'Unable to update your quote. Check your connection and try again.'});
    }finally{
      submitting.current=false;
      setSaving(false);
    }
  }

  if(quote.status!=='PENDING')return null;
  return <div className="requoteWrap">
    {!editing?<button type="button" className="btn orange requoteButton" onClick={openEditor}>Adjust quote</button>:<form className="requoteForm" onSubmit={submit} aria-busy={saving}>
      <div className="requoteHeading"><strong>Adjust your quote</strong><small>Your updated offer replaces your current pending quote.</small></div>
      <label>NEW PRICE (£)<input name="price" type="number" min="10" max="100000" step="0.01" required value={draft.price} disabled={saving} onChange={event=>setDraft({...draft,price:event.target.value})}/></label>
      <label>ALTERNATIVE COLLECTION DATE<input name="date" type="date" value={draft.date} disabled={saving} onChange={event=>setDraft({...draft,date:event.target.value})}/></label>
      <label>MESSAGE TO CUSTOMER<textarea name="message" maxLength={1000} rows={3} value={draft.message} disabled={saving} onChange={event=>setDraft({...draft,message:event.target.value})}/></label>
      <div className="requoteActions">
        <button className="btn orange" type="submit" disabled={saving}>{saving?'Updating…':'Update quote'}</button>
        <button className="btn light" type="button" disabled={saving} onClick={cancel}>Cancel</button>
      </div>
    </form>}
    {notice&&<div className={`requoteNotice ${notice.type}`} role={notice.type==='error'?'alert':'status'}>{notice.text}</div>}
  </div>;
}
