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
    event.preventDefault(); setMessage('');
    const form = new FormData(event.currentTarget);
    const data: any = Object.fromEntries(form);
    if (data.yearsOperating) data.yearsOperating = Number(data.yearsOperating);
    const response = await fetch('/api/transporter/verification', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    setMessage(response.ok ? 'Business details saved' : (await response.json()).error); load();
  }

  async function addDocument(event: any) {
    event.preventDefault(); setMessage('');
    const form = new FormData(event.currentTarget); const file = form.get('file');
    if (!(file instanceof File) || !file.size) return setMessage('Choose a document to upload');
    if (!ALLOWED_TYPES.includes(file.type)) return setMessage('Only PDF, JPG/JPEG and PNG files are allowed');
    if (file.size > MAX_FILE_SIZE) return setMessage('File must be 4 MB or smaller');
    setUploading(true);
    try {
      const response = await fetch('/api/transporter/verification/documents', { method: 'POST', body: form });
      const body = await response.json().catch(() => ({}));
      setMessage(response.ok ? 'Document uploaded securely' : body.error || 'Unable to upload document');
      if (response.ok) event.currentTarget.reset(); await load();
    } finally { setUploading(false); }
  }

  async function submit() {
    setMessage(''); const response = await fetch('/api/transporter/verification', { method: 'POST' });
    setMessage(response.ok ? 'Verification submitted for DriveDrop review' : (await response.json()).error); load();
  }

  const docs = verification?.documents || [];
  return <main className="shell dashboardShell verificationShell">
    <Link className="backLink" href="/transporter">← Back to transporter dashboard</Link>
    <header className="dashboardHero verificationHero"><div><span className="dashboardEyebrow">Trust & compliance</span><h1>DriveDrop Verification</h1><p>Build customer confidence by keeping your business, insurance and verification documents up to date.</p></div><div className="verificationStatusCard"><span>Verification status</span><strong>{verification ? label(verification.status) : 'Loading…'}</strong><small>{docs.length} document{docs.length===1?'':'s'} uploaded</small></div></header>
    {verification?.reviewNote && <div className="reviewNote"><b>DriveDrop review note</b><span>{verification.reviewNote}</span></div>}
    {message && <div className="formNotice successNotice">{message}</div>}
    <section className="dashboardCard verificationSection"><div className="verificationHeading"><div className="panelIcon">1</div><div><h2>Business details</h2><p>Tell customers who they are booking their vehicle transport with.</p></div></div><form onSubmit={save}><div className="grid"><div className="field"><label>BUSINESS NAME</label><input name="businessName" defaultValue={verification?.businessName || ''} required /></div><div className="field"><label>COMPANY NUMBER</label><input name="companyNumber" defaultValue={verification?.companyNumber || ''} /></div><div className="field"><label>PHONE</label><input name="phone" defaultValue={verification?.phone || ''} required /></div><div className="field"><label>YEARS OPERATING</label><input name="yearsOperating" type="number" min="0" defaultValue={verification?.yearsOperating ?? ''} /></div><div className="field"><label>WEBSITE</label><input name="website" type="url" defaultValue={verification?.website || ''} /></div></div><div className="field"><label>BUSINESS ADDRESS</label><textarea name="businessAddress" rows={3} defaultValue={verification?.businessAddress || ''} required /></div><button className="btn orange">Save business details</button></form></section>
    <section className="dashboardCard verificationSection"><div className="verificationHeading"><div className="panelIcon">2</div><div><h2>Verification documents</h2><p>Upload supporting documents securely. PDF, JPG/JPEG or PNG, maximum 4 MB each.</p></div></div><form className="documentUploadForm" onSubmit={addDocument}><div className="grid"><div className="field"><label>DOCUMENT TYPE</label><select name="type"><option value="INSURANCE">Insurance</option><option value="COMPANY_REGISTRATION">Company registration</option><option value="IDENTITY">Identity</option><option value="OPERATOR_LICENCE">Operator licence</option><option value="OTHER">Other</option></select></div><div className="field fileField"><label>UPLOAD DOCUMENT</label><input name="file" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" required /></div><div className="field"><label>INSURER</label><input name="insurer" /></div><div className="field"><label>POLICY / REFERENCE</label><input name="policyNumber" /></div><div className="field"><label>EXPIRY DATE</label><input name="expiresAt" type="date" /></div></div><button className="btn orange" disabled={uploading}>{uploading ? 'Uploading securely…' : 'Upload secure document'}</button></form>
    <div className="documentList">{docs.length===0?<div className="emptyDocuments"><span>📄</span><div><b>No verification documents yet</b><p>Upload your first document above.</p></div></div>:docs.map((document:any)=><a className="documentRow" key={document.id} href={`/api/verification-documents/${document.id}`} target="_blank" rel="noreferrer"><div className="documentIcon">📄</div><div><b>{label(document.type)}</b><span>{document.insurer || document.policyNumber || 'Secure verification document'}</span>{document.expiresAt&&<small>Expires {new Date(document.expiresAt).toLocaleDateString('en-GB')}</small>}</div><span className="statusPill">{label(document.status)}</span><strong>View →</strong></a>)}</div>
    {docs.length>0 && verification.status!=='APPROVED' && <div className="submitReviewPanel"><div><b>Ready for review?</b><p>When your details and documents are complete, submit them to DriveDrop.</p></div><button className="btn orange" onClick={submit} disabled={uploading}>Submit for DriveDrop review</button></div>}</section>
  </main>;
}
