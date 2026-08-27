'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const label = (s: string) => s.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

export default function Verification() {
  const [verification, setVerification] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  async function load() {
    const response = await fetch('/api/transporter/verification');
    if (response.ok) setVerification(await response.json());
  }

  useEffect(() => { load(); }, []);

  async function save(event: any) {
    event.preventDefault();
    setMessage('');
    const form = new FormData(event.currentTarget);
    const data: any = Object.fromEntries(form);
    if (data.yearsOperating) data.yearsOperating = Number(data.yearsOperating);
    const response = await fetch('/api/transporter/verification', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
    setMessage(response.ok ? 'Business details saved' : (await response.json()).error);
    load();
  }

  async function addDocument(event: any) {
    event.preventDefault();
    setMessage('');
    const form = new FormData(event.currentTarget);
    const file = form.get('file');

    if (!(file instanceof File) || !file.size) {
      setMessage('Choose a document to upload');
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setMessage('Only PDF, JPG/JPEG and PNG files are allowed');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setMessage('File must be 4 MB or smaller');
      return;
    }

    setUploading(true);
    try {
      const response = await fetch('/api/transporter/verification/documents', {
        method: 'POST',
        body: form,
      });
      const body = await response.json().catch(() => ({}));
      setMessage(response.ok ? 'Document uploaded securely' : body.error || 'Unable to upload document');
      if (response.ok) event.currentTarget.reset();
      await load();
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setMessage('');
    const response = await fetch('/api/transporter/verification', { method: 'POST' });
    setMessage(response.ok ? 'Verification submitted for DriveDrop review' : (await response.json()).error);
    load();
  }

  return (
    <main className="shell">
      <Link href="/transporter">← Transporter dashboard</Link>
      <h1>DriveDrop Verification</h1>
      <p className="muted">Complete your business details and upload your verification documents securely.</p>
      {verification && <p className="badge">Status: {label(verification.status)}</p>}
      {verification?.reviewNote && <div className="route">DriveDrop review note: {verification.reviewNote}</div>}
      {message && <p>{message}</p>}

      <div className="card">
        <h2>Business details</h2>
        <form onSubmit={save}>
          <div className="grid">
            <div className="field"><label>BUSINESS NAME</label><input name="businessName" defaultValue={verification?.businessName || ''} required /></div>
            <div className="field"><label>COMPANY NUMBER</label><input name="companyNumber" defaultValue={verification?.companyNumber || ''} /></div>
            <div className="field"><label>PHONE</label><input name="phone" defaultValue={verification?.phone || ''} required /></div>
            <div className="field"><label>YEARS OPERATING</label><input name="yearsOperating" type="number" min="0" defaultValue={verification?.yearsOperating ?? ''} /></div>
            <div className="field"><label>WEBSITE</label><input name="website" type="url" defaultValue={verification?.website || ''} /></div>
          </div>
          <div className="field"><label>BUSINESS ADDRESS</label><textarea name="businessAddress" defaultValue={verification?.businessAddress || ''} required /></div>
          <button className="btn orange">Save details</button>
        </form>
      </div>

      <div className="card">
        <h2>Verification documents</h2>
        <p className="muted">Accepted: PDF, JPG/JPEG or PNG. Maximum file size 4 MB.</p>
        <form onSubmit={addDocument}>
          <div className="grid">
            <div className="field">
              <label>DOCUMENT TYPE</label>
              <select name="type">
                <option value="INSURANCE">Insurance</option>
                <option value="COMPANY_REGISTRATION">Company registration</option>
                <option value="IDENTITY">Identity</option>
                <option value="OPERATOR_LICENCE">Operator licence</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="field"><label>UPLOAD DOCUMENT</label><input name="file" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" required /></div>
            <div className="field"><label>INSURER</label><input name="insurer" /></div>
            <div className="field"><label>POLICY / REFERENCE</label><input name="policyNumber" /></div>
            <div className="field"><label>EXPIRY DATE</label><input name="expiresAt" type="date" /></div>
          </div>
          <button className="btn orange" disabled={uploading}>{uploading ? 'Uploading securely…' : 'Upload document'}</button>
        </form>

        {verification?.documents?.map((document: any) => (
          <div className="route" key={document.id}>
            <b>{label(document.type)}</b> · {label(document.status)} · <a href={`/api/verification-documents/${document.id}`} target="_blank" rel="noreferrer">View document</a>
            {document.expiresAt && <> · expires {new Date(document.expiresAt).toLocaleDateString('en-GB')}</>}
          </div>
        ))}
        {verification?.documents?.length > 0 && verification.status !== 'APPROVED' && (
          <button className="btn orange" onClick={submit} disabled={uploading}>Submit for DriveDrop review</button>
        )}
      </div>
    </main>
  );
}
