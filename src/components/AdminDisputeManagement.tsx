'use client';

import {useEffect,useState} from 'react';

const label=(s:string)=>s.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());

export default function AdminDisputeManagement(){
  const [items,setItems]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState('');

  async function load(){
    setLoading(true);setError('');
    try{
      const r=await fetch('/api/admin/disputes',{cache:'no-store'});
      const d=await r.json().catch(()=>null);
      if(!r.ok) throw new Error(d?.error||'Unable to load disputes');
      setItems(Array.isArray(d)?d:[]);
    }catch(e:any){setError(e.message||'Unable to load disputes')}
    finally{setLoading(false)}
  }

  useEffect(()=>{load()},[]);

  async function update(disputeId:string,status:'UNDER_REVIEW'|'RESOLVED'|'CLOSED',resolution?:string){
    const resolutionNote=status==='RESOLVED'?prompt('Resolution note (optional):')||undefined:undefined;
    setBusy(disputeId);setError('');
    try{
      const r=await fetch('/api/admin/disputes',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({disputeId,status,resolution,resolutionNote})});
      const d=await r.json().catch(()=>null);
      if(!r.ok) throw new Error(d?.error||'Unable to update dispute');
      await load();
    }catch(e:any){setError(e.message||'Unable to update dispute')}
    finally{setBusy(null)}
  }

  if(loading)return <div className="dashboardCard"><p className="muted">Loading disputes…</p></div>;
  return <div className="adminDisputes">
    {error&&<div className="formNotice errorNotice">{error}</div>}
    {items.length===0&&<div className="dashboardCard emptyState"><div>🛡️</div><h3>No disputes</h3><p>Customer and transporter disputes will appear here for review.</p></div>}
    {items.map(d=>{const p=d.booking?.payment;return <article className="dashboardCard adminBooking" key={d.id}>
      <div className="bookingTop"><div><div className="statusGroup"><span className="statusPill">{label(d.status)}</span>{p&&<span className="statusPill">Payout · {label(p.payoutStatus)}</span>}</div><h2>{d.booking?.job?.vehicleMake} {d.booking?.job?.vehicleModel}</h2><p className="bookingPartner"><b>{d.booking?.customer?.name}</b> → <b>{d.booking?.transporter?.name}</b></p></div><div className="paymentMini"><span>Raised by</span><strong>{d.raisedBy?.name||'User'}</strong><small>{new Date(d.createdAt).toLocaleString('en-GB')}</small></div></div>
      <div className="bookingColumns adminColumns"><section><h3>Dispute details</h3><div className="infoPanel"><div className="infoRow"><span>Reason</span><b>{d.reason}</b></div>{d.details&&<div className="infoRow"><span>Details</span><b>{d.details}</b></div>}<div className="infoRow"><span>Raised by</span><b>{d.raisedBy?.role?label(d.raisedBy.role):'User'}</b></div>{d.evidenceUrl&&<a className="evidenceRow" href={d.evidenceUrl} target="_blank" rel="noreferrer"><span>📎</span><div><b>Dispute evidence</b><small>Open submitted evidence</small></div><strong>View →</strong></a>}</div></section><section><h3>Admin resolution</h3>{p&&<div className="infoPanel adminFinance"><div className="infoRow"><span>Payment status</span><b>{label(p.status)}</b></div><div className="infoRow"><span>Payout status</span><b>{label(p.payoutStatus)}</b></div><div className="infoRow"><span>Paid</span><b>£{(p.paidPence/100).toFixed(2)}</b></div></div>}
      {['OPEN','UNDER_REVIEW'].includes(d.status)&&<div className="actionButtons">{d.status==='OPEN'&&<button className="btn navy" disabled={busy===d.id} onClick={()=>update(d.id,'UNDER_REVIEW')}>Mark under review</button>}<button className="btn orange" disabled={busy===d.id} onClick={()=>update(d.id,'RESOLVED','RELEASE_PAYOUT')}>Resolve · release payout</button><button className="btn light" disabled={busy===d.id} onClick={()=>update(d.id,'RESOLVED','REFUND_CUSTOMER')}>Resolve · refund customer</button><button className="btn light" disabled={busy===d.id} onClick={()=>update(d.id,'RESOLVED','NO_ACTION')}>Resolve · no action</button></div>}
      {d.resolution&&<div className="formNotice successNotice">Resolution: {label(d.resolution)}{d.resolutionNote?` — ${d.resolutionNote}`:''}</div>}</section></div>
    </article>})}
  </div>
}
