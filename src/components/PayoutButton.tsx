'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export type PayoutResult = {payoutStatus?: string; accepted?: boolean};
export default function PayoutButton({paymentId, amountPence, onReleased, compactLabel = false, retry = false}: {
  paymentId: string; amountPence: number; onReleased?: (result: PayoutResult) => void; compactLabel?: boolean; retry?: boolean;
}) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const router = useRouter();
  async function release() {
    if (!confirm(retry ? 'Recheck this sandbox payout and retry the same transfer if it is safe to do so?' : `Release this eligible sandbox payout? Displayed amount: £${(amountPence / 100).toFixed(2)}. Fine deductions are checked before release; bank arrival is tracked separately.`)) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/payments/payout', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({paymentId})});
      const data = await response.json().catch(() => null);
      if (!response.ok) { setError(data?.error || 'Unable to release payout'); return; }
      onReleased?.(data); router.refresh();
    } catch { setError('The request was interrupted. Refresh the payout status before retrying.'); }
    finally { setBusy(false); }
  }
  return <><button className="btn orange" disabled={busy} onClick={release}>{busy ? 'Checking payout…' : retry ? 'Check / retry payout' : compactLabel ? 'Release test payout' : `Release £${(amountPence / 100).toFixed(2)} test payout`}</button>{error && <p className="formNotice errorNotice" role="alert">{error}</p>}</>;
}
