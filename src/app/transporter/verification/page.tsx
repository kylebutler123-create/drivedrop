'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const label = (s: string) => s.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

export default function Verification() {
  const [verification, setVerification] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submittedFeedback, setSubmittedFeedback] = useState(false);
  const submittedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    const response = await fetch('/api/transporter/verification', { cache: 'no-store' });
    if (response.ok) setVerification(await response.json());
  }
  useEffect(() => { load(); return () => { if (submittedTimer.current) clearTimeout(submittedTimer.current); }; }, []);

  async function save(event: any) {
    event.preventDefault(); setMessage('');
    const form = new FormData(event.currentTarget);
    const data: any = Object.fromEntries(form);
    if (data.yearsOperating) data.yearsOperating = Number(data.yearsOperating);
    const response = await fetch('/api/transporter/verification', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    setMessage(response.ok ? 'Business details saved' : (await response.json()).error);
    if (response.ok) setVerification(await response.json()); else await load();
  }

  async function addDocument(event: any) {
    event.preventDefault(); setMessage('');
    const formElement = event.currentTarget as HTMLFormElement;
    const form = new FormData(formElement); const file = form.get('file');
    if (!(file instanceof File) || !file.size) return setMessage('Choose a document to upload');
    if (!ALLOWED_TYPES.includes(file.type)) return setMessage('Only PDF, JPG/JPEG and PNG files are allowed');
    if (file.size > MAX_FILE_SIZE) return setMessage('File must be 4 MB or smaller');
    setUploading(true);
    try {
      const response = await fetch('/api/transporter/verification/documents', { method: 'POST', body: form });
      const body = await response.json().catch(() => ({}));
      const documentName = form.get('type') === 'DRIVING_LICENCE' ? 'Driving licence' : 'Insurance certificate';
      setMessage(response.ok ? `${documentName} uploaded securely` : body.error || `Unable to upload ${documentName.toLowerCase()}`);
      if (response.ok) {
        formElement.reset();
        setVerification((current:any)=>current?{...current,documents:[body,...(current.documents||[])]}:current);
        await load();
      }
    } finally { setUploading(false); }
  }

  async function submit() {
    if (submittingReview) return;
    setMessage('');
    setSubmittingReview(true);
    try {
      const response = await fetch('/api/transporter/verification', { method: 'POST' });
      const body = await response.json().catch(() => ({}));
      setMessage(response.ok ? 'Verification submitted for DriveDrop review' : body.error || 'Unable to submit verification');
      if (response.ok) {
        setVerification((current:any)=>current?{...current,...body,documents:current.documents}:current);
        setSubmittedFeedback(true);
        if (submittedTimer.current) clearTimeout(submittedTimer.current);
        submittedTimer.current = setTimeout(() => setSubmittedFeedback(false), 1600);
      } else await load();
    } finally {
      setSubmittingReview(false);
    }
  }

  const docs = verification?.documents || [];
  const hasInsuranceDocument = docs.some((document:any) => document.type === 'INSURANCE' && document.status !== 'REJECTED');
  const hasDrivingLicenceDocument = docs.some((document:any) => document.type === 'DRIVING_LICENCE' && document.status !== 'REJECTED');
  const requiredDocumentsReady = hasInsuranceDocument && hasDrivingLicenceDocument;
  const insuranceState = verification?.insuranceStatus?.state;
  const insuranceNeedsAttention = insuranceState === 'MISSING' || insuranceState === 'EXPIRED';
  const replacementPending = !!verification?.insuranceStatus?.replacementPending;
  const insuranceExpiry = verification?.insuranceStatus?.expiresAt ? new Date(verification.insuranceStatus.expiresAt).toLocaleDateString('en-GB', { timeZone: 'UTC' }) : null;
  return <main className="shell dashboardShell verificationShell">
    <Link className="backLink" href="/transporter">← Back to transporter dashboard</Link>
    <header className="dashboardHero verificationHero"><div><span className="dashboardEyebrow">Trust & compliance</span><h1>DriveDrop Verification</h1><p>Build customer confidence by keeping your business, insurance and verification documents up to date.</p></div><div className="verificationStatusCard"><span>Verification status</span><strong>{verification ? label(verification.status) : 'Loading…'}</strong><small>{docs.length} document{docs.length===1?'':'s'} uploaded</small></div></header>
    {insuranceNeedsAttention && <div className="formNotice errorNotice insuranceAccountWarning" role="alert"><div><strong>{insuranceState === 'EXPIRED' ? '⚠ Insurance expired — replacement insurance required' : '⚠ No valid insurance — replacement insurance required'}</strong><div>{insuranceState === 'EXPIRED' && insuranceExpiry ? `Your approved insurance expired on ${insuranceExpiry}. ` : ''}{replacementPending ? 'Your replacement document is awaiting DriveDrop approval.' : 'Upload current insurance below for DriveDrop approval.'} New quote submissions remain blocked until valid insurance is approved.</div></div></div>}
    {verification?.reviewNote && <div className="reviewNote"><b>DriveDrop review note</b><span>{verification.reviewNote}</span></div>}
    {message && <div className="formNotice successNotice">{message}</div>}
    <section className="dashboardCard verificationSection"><div className="verificationHeading"><div className="panelIcon">1</div><div><h2>Business details</h2><p>Tell customers who they are booking their vehicle transport with.</p></div></div><form className="businessDetailsForm" onSubmit={save}><div className="grid"><div className="field"><label>BUSINESS NAME</label><input name="businessName" defaultValue={verification?.businessName || ''} required /></div><div className="field"><label>COMPANY NUMBER</label><input name="companyNumber" defaultValue={verification?.companyNumber || ''} /></div><div className="field"><label>PHONE</label><input name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={verification?.phone || ''} required /></div><div className="field"><label>YEARS OPERATING</label><input name="yearsOperating" type="number" inputMode="numeric" min="0" step="1" defaultValue={verification?.yearsOperating ?? ''} /></div><div className="field"><label>WEBSITE</label><input name="website" type="url" defaultValue={verification?.website || ''} /></div></div><div className="field"><label>BUSINESS ADDRESS</label><textarea name="businessAddress" rows={3} defaultValue={verification?.businessAddress || ''} required /></div><button className="btn orange">Save business details</button></form></section>
    <section className="dashboardCard verificationSection"><div className="verificationHeading"><div className="panelIcon">2</div><div><h2>Verification documents</h2><p>Insurance and a driving licence are required. Upload PDF, JPG/JPEG or PNG files, maximum 4 MB each.</p></div></div><div className="requiredDocumentUploads"><form className="documentUploadForm requiredDocumentUploadCard" onSubmit={addDocument}><input type="hidden" name="type" value="DRIVING_LICENCE"/><div className="requiredDocumentUploadHeading"><span aria-hidden="true">🪪</span><div><h3>Upload driving licence</h3><p>Upload a clear PDF or image of the driving licence for Admin verification.</p></div></div><div className="grid"><div className="field fileField"><label>CHOOSE FILE</label><input name="file" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" required /></div></div><button className="btn orange" disabled={uploading}>{uploading ? 'Uploading securely…' : 'Upload driving licence'}</button></form><form className="documentUploadForm requiredDocumentUploadCard" onSubmit={addDocument}><input type="hidden" name="type" value="INSURANCE"/><div className="requiredDocumentUploadHeading"><span aria-hidden="true">🛡️</span><div><h3>Upload insurance certificate</h3><p>Upload the current certificate and enter its policy details.</p></div></div><div className="grid"><div className="field fileField"><label>CHOOSE FILE</label><input name="file" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" required /></div><div className="field"><label>INSURER</label><input name="insurer" required /></div><div className="field"><label>POLICY / REFERENCE</label><input name="policyNumber" required /></div><div className="field"><label>EXPIRY DATE</label><input name="expiresAt" type="date" required /></div></div><button className="btn orange" disabled={uploading}>{uploading ? 'Uploading securely…' : 'Upload insurance certificate'}</button></form></div>
    <div className="documentList">{docs.length===0?<div className="emptyDocuments"><span>📄</span><div><b>No verification documents yet</b><p>Upload your first document above.</p></div></div>:docs.map((document:any)=>{const documentStatus=document.expiresAt&&new Date(document.expiresAt)<new Date()?'EXPIRED':document.status;return <a className="documentRow" key={document.id} href={`/api/verification-documents/${document.id}`} target="_blank" rel="noreferrer"><div className="documentIcon">📄</div><div><b>{label(document.type)}</b><span>{document.insurer || document.policyNumber || 'Secure verification document'}</span>{document.expiresAt&&<small>Expires {new Date(document.expiresAt).toLocaleDateString('en-GB')}</small>}</div><span className="statusPill">{label(documentStatus)}</span><strong>View →</strong></a>})}</div>
    {verification && verification.status!=='APPROVED' && <div className="submitReviewPanel"><div><b>Required verification documents</b><p>{hasInsuranceDocument?'✓':'○'} Insurance certificate &nbsp; {hasDrivingLicenceDocument?'✓':'○'} Driving licence</p><small>Both documents must be uploaded before you can submit your account for DriveDrop review.</small></div><button type="button" className="btn orange" onClick={submit} disabled={uploading||submittingReview||!requiredDocumentsReady} title={!requiredDocumentsReady?'Upload both required documents before submitting':undefined}>{submittedFeedback?'Submitted':submittingReview?'Submitting…':'Submit documents'}</button></div>}</section>
  </main>;
}
