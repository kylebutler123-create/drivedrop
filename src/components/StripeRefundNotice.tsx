'use client';
import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';

const money = (pence: number) => new Intl.NumberFormat('en-GB', {style: 'currency', currency: 'GBP'}).format(pence / 100);
export default function StripeRefundNotice({payment, onRefresh}: {payment: any; onRefresh?: () => void}) {
  const router = useRouter(), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const row = payment?.stripeRefunds?.[0];
  const pending = row && (['PENDING', 'RETRY', 'PENDING_STRIPE'].includes(row.status) || row.status === 'SUCCEEDED' && ['PENDING', 'RETRY'].includes(row.recoveryStatus));
  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => {router.refresh(); onRefresh?.();}, 8000);
    return () => window.clearInterval(timer);
  }, [pending, router, onRefresh]);
  if (!row) return null;
  const review = ['FAILED', 'REVIEW'].includes(row.status) || row.recoveryStatus === 'REVIEW';
  async function refresh() {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/admin/payments/refund', {method: 'PATCH', headers: {'content-type': 'application/json'}, body: JSON.stringify({refundId: row.id})});
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'Unable to check refund');
      setMessage('Status check queued. Refresh shortly for the confirmed result.'); router.refresh(); onRefresh?.();
    } catch (error) {setMessage(error instanceof Error ? error.message : 'Unable to check refund');}
    finally {setBusy(false);}
  }
  return <div className={`formNotice ${review ? 'errorNotice' : ''}`} role="status">
    <strong>{row.status === 'SUCCEEDED' ? `Customer refund confirmed · ${money(row.amountPence)}` : row.status === 'FAILED' ? 'Customer refund failed' : review ? 'Customer refund needs review' : `Customer refund pending · ${money(row.amountPence)}`}</strong>
    <p>{row.status === 'SUCCEEDED' ? 'The payment breakdown includes this confirmed refund.' : row.status === 'FAILED' ? 'Stripe did not complete this refund. The confirmed refunded balance has not changed. Review this instruction before starting another refund.' : 'The dispute stays under review until Stripe confirms the refund. Repeated requests reuse this refund record.'}</p>
    {row.status === 'SUCCEEDED' && row.recoveryStatus !== 'NOT_REQUIRED' && <p>{row.recoveryStatus === 'RECOVERED' ? `Transporter funds recovered · ${money(row.recoveryAmountPence)}.` : row.recoveryFailureCode === 'INSUFFICIENT_BALANCE' ? `Recovery of ${money(row.recoveryAmountPence)} needs review: the transporter’s Stripe balance is insufficient. The customer refund remains confirmed.` : `Transfer recovery ${row.recoveryStatus === 'REVIEW' ? 'needs review' : 'is pending'} · ${money(row.recoveryAmountPence)}. The customer will not be refunded again when recovery is retried.`}</p>}
    {row.activePaymentId && payment.stripeRefundsEnabled && row.status !== 'FAILED' && <button type="button" className="btn light" disabled={busy} onClick={refresh}>{busy ? 'Checking…' : 'Check refund / recovery status'}</button>}
    {message && <p>{message}</p>}
  </div>;
}
