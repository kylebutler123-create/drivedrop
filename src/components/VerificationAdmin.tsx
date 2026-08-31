'use client';

import { useEffect, useState } from 'react';

const label = (s: string) => s.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

export default function VerificationAdmin() {
  const [verifications, setVerifications] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    const response = await fetch('/api/admin/verifications');
    if (response.ok) setVerifications(await response.json());
  }

  useEffect(() => { load(); }, []);

  async function review(id: string, status: string) {
    const reviewNote = prompt(`Reason / admin note for ${label(status)}:`) || undefined;
    const response = await fetch('/api/admin/verifications', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ verificationId: id, status, reviewNote }),
    });
    if (response.ok) load();
    else alert((await response.json()).error);
  }

  return (
    <>
      <h2>Transporter Verification</h2>
      {!verifications.length && <div className="card muted">No transporter verification applications yet.</div>}
      <div className="adminVerificationList">
        {verifications.map(verification => {
          const open = expanded === verification.id;
          const now = Date.now();
          const expiryDates = (verification.documents || []).map((d:any)=>d.expiresAt ? new Date(d.expiresAt).getTime() : null).filter((x:any)=>Number.isFinite(x));
          const expired = expiryDates.filter((x:number)=>x < now).length;
          const expiringSoon = expiryDates.filter((x:number)=>x >= now && x <= now + 30*24*60*60*1000).length;
          const expiryText = expired ? `${expired} expired` : expiringSoon ? `${expiringSoon} expiring soon` : 'No expiry warnings';
          return (
            <article className={`adminVerificationCard ${open ? 'isExpanded' : ''}`} key={verification.id}>
              <button type="button" className="adminVerificationSummary" onClick={()=>setExpanded(open?null:verification.id)} aria-expanded={open}>
                <div className="adminVerificationIdentity">
                  <div className="statusGroup"><span className="statusPill">{label(verification.status)}</span></div>
                  <strong>{verification.businessName}</strong>
                  <small>{verification.transporter.name} · {verification.transporter.email}</small>
                </div>
                <div className="adminVerificationQuick">
                  <span><small>Documents</small><b>{verification.documents.length}</b></span>
                  <span><small>Expiry</small><b>{expiryText}</b></span>
                  <span><small>Company</small><b>{verification.companyNumber || 'Not provided'}</b></span>
                </div>
                <span className="adminUserChevron" aria-hidden="true">{open ? '−' : '+'}</span>
              </button>
              {open && <div className="adminVerificationExpanded">
                <div className="adminVerificationBusiness infoPanel">
                  <div className="infoRow"><span>Business address</span><b>{verification.businessAddress || 'Not provided'}</b></div>
                  <div className="infoRow"><span>Phone</span><b>{verification.phone || 'Not provided'}</b></div>
                  <div className="infoRow"><span>Company number</span><b>{verification.companyNumber || 'Not provided'}</b></div>
                </div>
                <h4>Documents</h4>
                <div className="adminVerificationDocuments">
                  {verification.documents.length===0 ? <p className="muted">No verification documents uploaded.</p> : verification.documents.map((document: any) => (
                    <div className="adminVerificationDocument" key={document.id}>
                      <div><b>{label(document.type)}</b><small>{document.insurer || 'Secure verification document'}</small></div>
                      <div>{document.expiresAt && <small>Expires {new Date(document.expiresAt).toLocaleDateString('en-GB')}</small>}<a href={`/api/verification-documents/${document.id}`} target="_blank" rel="noreferrer">Review document →</a></div>
                    </div>
                  ))}
                </div>
                <div className="actionButtons adminVerificationActions">
                  {verification.status === 'PENDING' && <><button className="btn orange" onClick={() => review(verification.id, 'APPROVED')}>Approve & Verify</button><button className="btn light" onClick={() => review(verification.id, 'REJECTED')}>Reject</button></>}
                  {verification.status === 'APPROVED' && <button className="btn light" onClick={() => review(verification.id, 'SUSPENDED')}>Suspend verification</button>}
                </div>
                {verification.reviewNote && <div className="formNotice"><strong>Admin note</strong><div style={{marginTop:4}}>{verification.reviewNote}</div></div>}
              </div>}
            </article>
          );
        })}
      </div>
    </>
  );
}
