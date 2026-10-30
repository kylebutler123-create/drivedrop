'use client';

import Link from 'next/link';
import Icon from '../../components/ApprovedIcon';

export type UploadType = 'DRIVING_LICENCE' | 'INSURANCE';
type Document = {id: string; type: string; status: string; expiresAt?: string | null; insurer?: string | null; policyNumber?: string | null};
type Verification = {status: string; documents?: Document[]};
const label = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

/** Opens the existing upload forms; statuses and document access are unchanged. */
export default function MobileVerificationOverview({verification, loading, error, onRetry, onUpload}: {verification: Verification | null; loading: boolean; error: string; onRetry: () => void; onUpload: (type: UploadType) => void}) {
  const documents = verification?.documents || [];
  const status = verification?.status;
  const title = !verification ? loading ? 'Checking verification…' : 'Your verification' : status === 'APPROVED' ? 'Verification approved' : status === 'PENDING' ? 'Pending review' : status === 'REJECTED' ? 'Verification rejected' : 'Verification · ' + label(status || 'Not started');
  return <>
    <div className="ddMobileOnly ddVerificationTop"><div className="ddAccountSubheading"><Link href="/account" aria-label="Back to account"><Icon name="arrow"/></Link><h1>Verification &amp; insurance</h1></div><div className="ddAccountSectionHero ddVerificationIdentity"><span className="ddSectionAvatar"><Icon name="shield"/></span><div><strong>{title}</strong><span>{loading && !verification ? 'Loading your documents' : !verification ? 'Check your documents below' : `${documents.length} document${documents.length === 1 ? '' : 's'} on file`}</span></div>{status && <small className="ddVerificationBadge" data-status={status}>{label(status)}</small>}</div></div>
    <div className="ddMobileOnly ddVerificationDocuments" aria-busy={loading}>{loading && !verification && <div className="ddVerificationLoading" role="status"><span className="ddVerificationLoadingLabel">Loading verification details…</span>{[0, 1].map(index => <div className="ddVerificationPlaceholder" key={index} aria-hidden="true"><i/><div><b/><span/><span/></div><small/></div>)}</div>}{error && <div className="ddVerificationLoadError" role="alert"><p>{error}</p><button type="button" onClick={onRetry}>Try again</button></div>}{documents.map(document => {
      const documentStatus = document.expiresAt && new Date(document.expiresAt) < new Date() ? 'EXPIRED' : document.status;
      const insurance = document.type === 'INSURANCE';
      return <article className="ddVerificationDocument" key={document.id}><span className="ddDocumentIcon"><Icon name={insurance ? 'shield' : 'card'}/></span><div className="ddDocumentCopy"><div><h2>{insurance ? 'Insurance certificate' : label(document.type)}</h2><span className="ddVerificationBadge" data-status={documentStatus}>{label(documentStatus)}</span></div>{document.expiresAt && <p className="ddDocumentExpiry"><Icon name="calendar"/>Expires {new Date(document.expiresAt).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'})}</p>}<p>{document.insurer || document.policyNumber || 'Secure verification document'}</p></div><div className="ddDocumentActions"><a href={`/api/verification-documents/${encodeURIComponent(document.id)}`} target="_blank" rel="noreferrer"><Icon name="file"/>View document</a>{['DRIVING_LICENCE', 'INSURANCE'].includes(document.type) && <button type="button" onClick={() => onUpload(document.type as UploadType)}><Icon name="arrow"/>Upload replacement</button>}</div></article>;
    })}</div>
  </>;
}
