'use client';

import { useEffect, useState } from 'react';

const label = (s: string) => s.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

export default function VerificationAdmin() {
  const [verifications, setVerifications] = useState<any[]>([]);

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
      {verifications.map(verification => (
        <div className="card" key={verification.id}>
          <span className="badge">{label(verification.status)}</span>
          <h3>{verification.businessName}</h3>
          <p>{verification.transporter.name} · {verification.transporter.email}</p>
          <div className="route">
            {verification.businessAddress}<br />
            {verification.phone}{verification.companyNumber && <> · Company #{verification.companyNumber}</>}
          </div>
          <h4>Documents</h4>
          {verification.documents.map((document: any) => (
            <div className="route" key={document.id}>
              <b>{label(document.type)}</b> · <a href={`/api/verification-documents/${document.id}`} target="_blank" rel="noreferrer">Review document</a>
              {document.insurer && <> · {document.insurer}</>}
              {document.expiresAt && <> · expires {new Date(document.expiresAt).toLocaleDateString('en-GB')}</>}
            </div>
          ))}
          {verification.status === 'PENDING' && <>
            <button className="btn orange" onClick={() => review(verification.id, 'APPROVED')}>Approve & Verify</button>{' '}
            <button className="btn light" onClick={() => review(verification.id, 'REJECTED')}>Reject</button>
          </>}
          {verification.status === 'APPROVED' && <button className="btn light" onClick={() => review(verification.id, 'SUSPENDED')}>Suspend verification</button>}
          {verification.reviewNote && <p className="muted">Admin note: {verification.reviewNote}</p>}
        </div>
      ))}
    </>
  );
}
