'use client';

import Link from 'next/link';
import Icon from '../../components/ApprovedIcon';
import {currentVerificationDocuments, verificationDocumentStatus, type UploadType, type VerificationDocument} from './mobile-verification';

type Verification = {status: string; documents?: VerificationDocument[]};
const label = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const documentLabel = (type: string) => type === 'INSURANCE' ? 'Insurance certificate' : type === 'DRIVING_LICENCE' ? 'Driving licence' : label(type);

function VerificationDetailIcon({name}: {name: 'licence' | 'open' | 'upload'}) {
  const paths = {licence: 'M3 4h18v16H3Z M10 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M5 16c0-4 6-4 6 0M14 9h4m-4 4h4', open: 'M14 3h7v7M21 3 10 14M10 4H4v16h16v-6', upload: 'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6'};
  return <svg className="approvedIcon ddVerificationDetailIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}

function DocumentBadge({status}: {status: string}) {
  return <span className="ddVerificationBadge" data-status={status}>{status === 'PENDING' && <Icon name="clock"/>}{label(status)}</span>;
}

/** The current document replaces its upload form; replacement is an explicit action. */
export default function MobileVerificationOverview({verification, loading, error, replacingType, uploading, onRetry, onUpload}: {verification: Verification | null; loading: boolean; error: string; replacingType: UploadType | null; uploading: boolean; onRetry: () => void; onUpload: (type: UploadType) => void}) {
  const documents = verification?.documents || [];
  const current = currentVerificationDocuments(documents);
  const previous = documents.filter(document => !current.some(item => item.id === document.id));
  const status = verification?.status;
  const needsReplacement = current.some(document => ['REJECTED', 'EXPIRED'].includes(verificationDocumentStatus(document)));
  const title = loading && !verification ? 'Checking verification…' : error && !verification ? 'Your verification'
    : status === 'APPROVED' ? 'Verification approved' : status === 'PENDING' ? 'Pending review' : status === 'REJECTED' ? 'Verification rejected'
    : needsReplacement ? 'Replacement required' : current.length === 2 ? 'Ready to submit' : current.length === 1 ? 'One document remaining' : 'Upload your documents';
  return <>
    <div className="ddMobileOnly ddVerificationTop"><div className="ddAccountSubheading"><Link href="/account" aria-label="Back to account"><Icon name="arrow"/></Link><h1>Verification &amp; insurance</h1></div><div className="ddAccountSectionHero ddVerificationIdentity"><span className="ddSectionAvatar"><Icon name="business"/></span><div><strong>{title}</strong><span>{loading && !verification ? 'Loading your documents' : error && !verification ? 'Try again to check your documents' : `${current.length} of 2 uploaded`}</span></div>{status && ['APPROVED', 'PENDING', 'REJECTED'].includes(status) && <small className="ddVerificationBadge" data-status={status}>{label(status)}</small>}</div></div>
    <div className="ddMobileOnly ddVerificationDocuments" aria-busy={loading}>
      {loading && !verification && <div className="ddVerificationLoading" role="status"><span className="ddVerificationLoadingLabel">Loading verification details…</span>{[0, 1].map(index => <div className="ddVerificationPlaceholder" key={index} aria-hidden="true"><i/><div><b/><span/><span/></div><small/></div>)}</div>}
      {error && <div className="ddVerificationLoadError" role="alert"><p>{error}</p><button type="button" disabled={loading} onClick={onRetry}>Try again</button></div>}
      {current.map(document => <article className="ddVerificationDocument" data-document-type={document.type} key={document.id} tabIndex={-1}>
        <span className="ddDocumentIcon">{document.type === 'INSURANCE' ? <Icon name="shield"/> : <VerificationDetailIcon name="licence"/>}</span>
        <div className="ddDocumentCopy"><div><h2>{documentLabel(document.type)}</h2><DocumentBadge status={verificationDocumentStatus(document)}/></div><p>{document.insurer || document.policyNumber || 'Secure verification document'}</p></div>
        {document.expiresAt && <p className="ddDocumentExpiry"><Icon name="calendar"/>Expires {new Date(document.expiresAt).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'})}</p>}
        <div className="ddDocumentActions"><a href={`/api/verification-documents/${encodeURIComponent(document.id)}`} target="_blank" rel="noreferrer"><VerificationDetailIcon name="open"/>View document</a><button type="button" disabled={uploading} aria-expanded={replacingType === document.type} aria-controls={`verification-upload-${document.type}`} onClick={() => onUpload(document.type as UploadType)}><VerificationDetailIcon name="upload"/>Upload replacement</button></div>
      </article>)}
    </div>
    {previous.length > 0 && <details className="ddMobileOnly ddVerificationHistory"><summary>Previous documents <span>{previous.length}</span><Icon name="chevronDown"/></summary><div>{previous.map(document => <a key={document.id} href={`/api/verification-documents/${encodeURIComponent(document.id)}`} target="_blank" rel="noreferrer"><span>{documentLabel(document.type)}{document.createdAt && <small>{new Date(document.createdAt).toLocaleDateString('en-GB', {timeZone: 'UTC'})}</small>}</span><DocumentBadge status={verificationDocumentStatus(document)}/><span>View</span></a>)}</div></details>}
  </>;
}
