'use client';

import QuoteDatePicker from './QuoteDatePicker';
import {useRef,useState} from 'react';

type Quote={
  id:string;
  pricePence:number;
  status:string;
  expiresAt?:string|null;
  message?:string|null;
  proposedCollectionDate?:string|null;
  proposedCollectionFrom?:string|null;
  proposedCollectionUntil?:string|null;
};
type Draft={price:string;message:string;date:string;expiresAt:string;from:string;until:string};
type WithdrawResult={quote:Quote;jobStatus:string;noCancellationFine:true};
type Props={showActionIcons?:boolean;jobId:string;quote:Quote;onUpdated:(quote:Quote)=>void;onCancelled:(result:WithdrawResult)=>void};

function quoteDraft(quote:Quote):Draft{
  return {
    price:(quote.pricePence/100).toFixed(2),
    message:quote.message||'',
    date:quote.proposedCollectionDate?.slice(0,10)||'',from:quote.proposedCollectionFrom||'',until:quote.proposedCollectionUntil||'',expiresAt:quote.expiresAt?new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/London',dateStyle:'short',timeStyle:'short'}).format(new Date(quote.expiresAt)).replace(' ','T'):''
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
      proposedCollectionDate:draft.date,proposedCollectionFrom:draft.from,proposedCollectionUntil:draft.until,expiresAt:draft.expiresAt
    })
  });
  const result=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(result?.error||'Unable to update your quote. Please try again.');
  if(result?.id!==quoteId||typeof result.pricePence!=='number'){
    throw new Error('We could not confirm the update. Check your quote before trying again.');
  }
  return result;
}

async function cancelQuote(quoteId:string):Promise<WithdrawResult>{
  const response=await fetch('/api/quotes',{
    method:'DELETE',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({quoteId})
  });
  const result=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(result?.error||'Unable to cancel your quote. Please try again.');
  if(result?.quote?.id!==quoteId||result.quote.status!=='WITHDRAWN'||result.noCancellationFine!==true){
    throw new Error('We could not verify the cancellation. Refresh and check your quote before trying again.');
  }
  return result;
}

export default function TransporterRequoteEnhancer({jobId,quote,onUpdated,onCancelled,showActionIcons=false}:Props){
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState<Draft>(()=>quoteDraft(quote));
  const [saving,setSaving]=useState(false);
  const [withdrawing,setWithdrawing]=useState(false);
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
      window.dispatchEvent(new Event('drivedrop-quotes-updated'));
      setEditing(false);
      setNotice({type:'success',text:'Quote updated successfully — the customer can now review your revised offer.'});
    }catch(error){
      setNotice({type:'error',text:error instanceof Error?error.message:'Unable to update your quote. Check your connection and try again.'});
    }finally{
      submitting.current=false;
      setSaving(false);
    }
  }

  async function withdraw(){
    if(submitting.current||quote.status!=='PENDING')return;
    if(!window.confirm('Cancel this quote? The customer request will remain open and no cancellation fine will be charged.'))return;
    submitting.current=true;
    setWithdrawing(true);
    setNotice(null);
    try{
      const result=await cancelQuote(quote.id);
      onCancelled(result);
      window.dispatchEvent(new Event('drivedrop-quotes-updated'));
    }catch(error){
      setNotice({type:'error',text:error instanceof Error?error.message:'Unable to cancel your quote. Check your connection and try again.'});
    }finally{
      submitting.current=false;
      setWithdrawing(false);
    }
  }

  if(quote.status!=='PENDING')return null;
  return <div className="requoteWrap">
    {!editing?<div className="requoteActions"><button type="button" className="btn orange requoteButton" disabled={withdrawing} onClick={openEditor}>{showActionIcons&&<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m4 16 12-12 4 4L8 20H4ZM14 6l4 4"/></svg>}<span className="tdMobileOnly">Adjust quote</span><span className="tdDesktopOnly">Edit quote</span></button><button type="button" className="btn light" disabled={withdrawing} onClick={withdraw}>{showActionIcons&&<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m5 5 14 14M19 5 5 19"/></svg>}{withdrawing?'Cancelling…':'Cancel quote'}</button></div>:<form className="requoteForm" onSubmit={submit} aria-busy={saving}>
      <div className="requoteHeading"><strong>Edit your quote</strong></div>
      <div className="requoteGrid">
        <div><label htmlFor={`requote-price-${quote.id}`}>Your price (£)</label><input id={`requote-price-${quote.id}`} name="price" type="number" inputMode="decimal" min="10" max="100000" step="0.01" required value={draft.price} disabled={saving} onChange={event=>setDraft(current=>({...current,price:event.target.value}))}/></div>
        <div><label htmlFor={`requote-date-${quote.id}`}>Alternative collection date</label><QuoteDatePicker id={`requote-date-${quote.id}`} name="proposedCollectionDate" label="Alternative collection date" withWindow disabled={saving} initialValue={draft.date} initialFrom={draft.from} initialUntil={draft.until} onChange={selection=>setDraft(current=>({...current,date:selection.value,from:selection.from,until:selection.until}))}/></div>
        <div><label htmlFor={`requote-expiry-${quote.id}`}>Quote valid until · UK</label><QuoteDatePicker id={`requote-expiry-${quote.id}`} name="expiresAt" label="Quote valid until" withTime disabled={saving} initialValue={draft.expiresAt} onChange={selection=>setDraft(current=>({...current,expiresAt:selection.value}))}/></div>
        <div className="quoteMessageField"><label htmlFor={`requote-message-${quote.id}`}>Message to customer</label><textarea id={`requote-message-${quote.id}`} name="message" maxLength={1000} rows={3} value={draft.message} disabled={saving} onChange={event=>setDraft(current=>({...current,message:event.target.value}))}/></div>
        <span className="tdDesktopOnly tdQuoteFootnote">The customer authorises payment before you confirm availability.</span>
        <div className="requoteActions requoteEditActions">
          <button className="btn light" type="button" disabled={saving} onClick={cancel}>Cancel</button>
          <button className="btn orange quoteSubmitBtn" type="submit" disabled={saving}>{saving?'Updating…':'Update quote'}</button>
        </div>
      </div>
    </form>}
    {notice&&<div className={`requoteNotice ${notice.type}`} role={notice.type==='error'?'alert':'status'}>{notice.text}</div>}
  </div>;
}

