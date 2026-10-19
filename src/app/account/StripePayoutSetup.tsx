'use client';
import {useCallback, useEffect, useState} from 'react';
import AccountIcon from '@/app/components/TransporterAccountIcon';

type Status = {enabled: boolean; status?: string; ready?: boolean; connected?: boolean; requirementsDue?: boolean; bankPayoutStatus?: string | null};
export default function StripePayoutSetup() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/account/stripe-connect', {cache: 'no-store'});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to check payout setup.');
      setStatus(data); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to check payout setup.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function open(action: 'onboard' | 'dashboard') {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/account/stripe-connect', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action})});
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || 'Unable to open Stripe.');
      window.location.assign(data.url);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to open Stripe.'); setBusy(false); }
  }
  const needsReview = status?.status === 'REVIEW';
  return <section id="stripe-payouts" className="dashboardCard accountCard payoutDetailsCard">
    <div className="payoutDetailsHead"><div className="payoutIcon"><AccountIcon name="bank"/></div>
      <div><span className="payoutEyebrow">TRANSPORTER PAYOUTS</span><h2>Stripe payout account <span className="accountPreviewBadge">Sandbox</span></h2><p>Set up your payout account securely with Stripe.</p></div>
      {status?.ready && <span className="payoutReadyBadge">✓ Connected</span>}
    </div>
    <div className="payoutBankPanel"><div className="payoutBankTop"><div><small>PAYOUT ACCOUNT</small><strong>{!status ? 'Checking Stripe status…' : needsReview ? 'Setup needs review' : status.ready ? 'Ready to receive sandbox transfers' : status.connected ? 'Complete your Stripe setup' : 'Connect your payout account'}</strong></div><span className="payoutShield"><AccountIcon name="shield"/></span></div></div>
    {status?.requirementsDue && status.connected && <div className="formNotice" role="status">Stripe needs more information. Continue setup to keep your payout account ready.</div>}
    {status?.bankPayoutStatus && <div className={`formNotice ${status.bankPayoutStatus === 'failed' ? 'errorNotice' : ''}`} role="status"><strong>Latest bank payout: {status.bankPayoutStatus.replaceAll('_', ' ')}</strong><p>{status.bankPayoutStatus === 'failed' ? 'Open Stripe to check and update the payout bank account. A failed bank payout does not create another booking payment.' : 'This is your account’s latest bank payout and may include several deliveries. View the breakdown in Stripe.'}</p></div>}
    <div className="payoutSecurityNote"><span>✓</span><div><strong>Your details stay with Stripe</strong><p>DriveDrop controls release after delivery, customer confirmation and the review window. Stripe handles identity checks, bank details and onward bank payouts.</p></div></div>
    <div className="accountTestWarning"><AccountIcon name="warning"/>Sandbox testing only. Use Stripe test details; no real money moves.</div>
    {error && <div className="formNotice errorNotice" role="alert">{error}</div>}
    {needsReview && <p>Contact DriveDrop support to reconcile the earlier setup attempt.</p>}
    <div className="payoutFormActions">
      <button className="btn orange" disabled={busy || !status?.enabled || needsReview} onClick={() => void open(status?.ready ? 'dashboard' : 'onboard')}>{busy ? 'Opening Stripe…' : status?.ready ? 'Open Stripe dashboard' : status?.connected ? 'Continue Stripe setup' : 'Set up payouts'}</button>
      {status?.ready && <button className="btn light" disabled={busy} onClick={() => void open('onboard')}>Update payout details</button>}
      <button className="btn light" disabled={busy} onClick={() => void load()}>Refresh status</button>
    </div>
  </section>;
}
