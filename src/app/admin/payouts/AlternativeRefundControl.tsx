'use client';
import {useEffect, useId, useRef, useState, type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import StripeRefundNotice from '@/components/StripeRefundNotice';
import styles from './AlternativeRefundControl.module.css';

const money = (value: number) => new Intl.NumberFormat('en-GB', {style: 'currency', currency: 'GBP'}).format(value / 100);
const methods: Record<string, string> = {BANK_TRANSFER: 'Bank transfer', CHEQUE: 'Cleared cheque', OTHER: 'Other completed repayment'};
type RecordSummary = {id: string; amountPence: number; stripeRefundedPence: number; method: string; settledOn: string};
type Payment = {id: string; paidPence: number; refundedPence: number; alternativeRefundAvailable?: boolean;
  alternativeRefund?: RecordSummary | null; stripeRefunds?: {id: string}[]};

export default function AlternativeRefundControl({payment}: {payment: Payment}) {
  const router = useRouter(), prefix = useId(), busyRef = useRef(false), headingRef = useRef<HTMLHeadingElement>(null);
  const [checking, setChecking] = useState(false), [preflightOK, setPreflightOK] = useState(false);
  const [open, setOpen] = useState(false), [review, setReview] = useState(false), [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState(''), [method, setMethod] = useState('BANK_TRANSFER');
  const [settledOn, setSettledOn] = useState(''), [reference, setReference] = useState(''), [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null), [confirmed, setConfirmed] = useState(false), [error, setError] = useState('');
  const [saved, setSaved] = useState<RecordSummary | null>(null);
  const amount = payment.paidPence - payment.refundedPence, record = saved || payment.alternativeRefund;
  const valid = Boolean(preflightOK && amount > 0 && reference.trim().length >= 3 && /^[A-Za-z0-9 ._/-]+$/.test(reference.trim()) && settledOn && file && confirmed);
  useEffect(() => {if (open) headingRef.current?.focus();}, [open, review]);
  async function start() {
    setRequestId(crypto.randomUUID()); setSettledOn(new Date().toISOString().slice(0,10));
    setMethod('BANK_TRANSFER'); setReference(''); setNote(''); setFile(null); setConfirmed(false); setError(''); setReview(false); setOpen(true);
    setChecking(true); setPreflightOK(false);
    try {
      const params = new URLSearchParams({paymentId: payment.id, failedRefundId: payment.stripeRefunds?.[0]?.id || '', amountPence: String(amount), expectedRefundedPence: String(payment.refundedPence)});
      const response = await fetch(`/api/admin/payments/alternative-refund/review?${params}`, {cache: 'no-store'});
      const result = await response.json();
      if (!response.ok || result.eligible !== true) throw new Error(result.error || 'The repayment status could not be checked.');
      setPreflightOK(true);
    } catch (failure) {setError(failure instanceof Error ? failure.message : 'The repayment status could not be checked. Cancel and try again.');}
    finally {setChecking(false);}
  }
  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!valid || busyRef.current) return;
    setError(''); setReview(true);
  }
  async function save() {
    if (!valid || !review || busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    const form = new FormData();
    form.set('details', JSON.stringify({id: requestId, paymentId: payment.id, failedRefundId: payment.stripeRefunds?.[0]?.id,
      amountPence: amount, expectedRefundedPence: payment.refundedPence, method, reference: reference.trim(), settledOn, note: note.trim(), confirmed: true}));
    form.set('evidence', file!);
    try {
      const response = await fetch('/api/admin/payments/alternative-refund', {method: 'POST', body: form});
      const result = await response.json();
      if (!response.ok || !result.record) throw new Error(result.error || 'Unable to confirm the repayment record.');
      setSaved(result.record); setOpen(false); setFile(null); router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The response was interrupted. Retry this same submission or refresh to check whether it was saved.');
    } finally {busyRef.current = false; setBusy(false);}
  }
  return <div className={styles.wrapper}>
    <StripeRefundNotice payment={{...payment, ...(saved ? {payoutStatus: 'CANCELLED'} : {}), alternativeRefund: record}}/>
    {record ? <a className={styles.evidenceLink} href={`/api/admin/payments/alternative-refund/${record.id}/evidence`}>Download private repayment evidence</a> :
      payment.alternativeRefundAvailable && !open && <button type="button" className={styles.primary} onClick={start}>Record alternative refund</button>}
    {open && !record && <section className={styles.panel} aria-labelledby={`${prefix}-title`}>
      <header><div><h3 id={`${prefix}-title`} ref={headingRef} tabIndex={-1}>{review ? 'Review completed repayment' : 'Record alternative refund'}</h3><p>1. Repayment details <span aria-hidden="true">→</span> 2. Review & record</p></div><span className={styles.badge}>Sandbox</span></header>
      <p className={styles.info}>Only record this after the customer has received the money by another method. This form does not send money or retry Stripe. The failed Stripe refund stays in the history.</p>
      <p className={styles.check} role="status">{checking ? 'Checking the latest Stripe refund and transfer history…' : preflightOK ? 'Stripe checked: refund failed, £0 refunded, no transporter transfer. Checked again before saving.' : 'Repayment recording is unavailable until the Stripe check succeeds. Cancel and reopen to retry.'}</p>
      <form onSubmit={prepare}>
        <div hidden={review}>
          <div className={styles.grid}>
            <label htmlFor={`${prefix}-amount`}>Amount to record<input id={`${prefix}-amount`} value={money(amount)} readOnly/><small>Full outstanding customer balance</small></label>
            <label htmlFor={`${prefix}-method`}>Repayment method<select id={`${prefix}-method`} value={method} onChange={e => setMethod(e.target.value)}>{Object.entries(methods).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label htmlFor={`${prefix}-date`}>Settlement date<input id={`${prefix}-date`} type="date" required max={new Date().toISOString().slice(0,10)} value={settledOn} onChange={e => setSettledOn(e.target.value)}/></label>
          </div>
          <label htmlFor={`${prefix}-reference`}>Repayment reference<input id={`${prefix}-reference`} value={reference} onChange={e => setReference(e.target.value)} minLength={3} maxLength={120} required placeholder="Unique bank or repayment reference" autoComplete="off"/><small>Use letters, numbers, spaces, dots, underscores, slashes or hyphens. Use a unique reference, not an account number or other banking credentials.</small></label>
          <label htmlFor={`${prefix}-evidence`}>Evidence of completed repayment<input id={`${prefix}-evidence`} type="file" required accept="application/pdf,image/jpeg,image/png" onChange={e => {
            const selected = e.target.files?.[0] || null; setError('');
            if (selected && (!['application/pdf','image/jpeg','image/png'].includes(selected.type) || selected.size <= 0 || selected.size > 3 * 1024 * 1024)) {
              e.target.value = ''; setFile(null); setError('Choose a non-empty PDF, JPG or PNG no larger than 3 MB.'); return;
            }
            setFile(selected);
          }}/><small>PDF, JPG or PNG · up to 3 MB · private to administrators. Remove unnecessary personal or banking information.</small></label>
          <label htmlFor={`${prefix}-note`}>Administrator note <span className={styles.optional}>(optional)</span><textarea id={`${prefix}-note`} rows={2} maxLength={1000} value={note} onChange={e => setNote(e.target.value)}/></label>
          <label className={styles.confirm}><input type="checkbox" checked={confirmed} required onChange={e => setConfirmed(e.target.checked)}/><span>I confirm the customer has already received {money(amount)} by this alternative method.</span></label>
        </div>
        {review && <div className={styles.review} aria-live="polite">
          <dl><div><dt>Completed repayment</dt><dd>{money(amount)}</dd></div><div><dt>Method</dt><dd>{methods[method]}</dd></div><div><dt>Settlement date</dt><dd>{settledOn}</dd></div><div><dt>Reference</dt><dd>{reference.trim()}</dd></div><div><dt>Private evidence</dt><dd>{file?.name}</dd></div>{note.trim() && <div><dt>Administrator note</dt><dd>{note.trim()}</dd></div>}</dl>
          <p>Recording this will mark the customer fully repaid and cancel this booking’s transporter payout. Stripe refunded: {money(0)}. Repaid by alternative method: {money(amount)}. This audit record cannot be edited or deleted.</p>
        </div>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        <footer><button type="button" className={styles.secondary} disabled={busy} onClick={() => review ? setReview(false) : setOpen(false)}>{review ? 'Back to details' : 'Cancel'}</button>
          {review ? <button type="button" className={styles.primary} disabled={busy || !valid} onClick={save}>{busy ? 'Checking & recording…' : `Record completed repayment ${money(amount)}`}</button> : <button className={styles.primary} type="submit" disabled={!valid}>Review repayment</button>}
        </footer>
      </form>
    </section>}
  </div>;
}
