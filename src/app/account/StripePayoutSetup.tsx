'use client';
import {useCallback, useEffect, useState} from 'react';
import AccountIcon from '@/app/components/TransporterAccountIcon';

function PayoutActionIcon({name}: {name: 'open' | 'edit' | 'refresh'}) {
  const paths = {open: 'M14 3h7v7M21 3 10 14M10 4H4v16h16v-6', edit: 'm15 4 5 5M4 16 16 4a2 2 0 0 1 4 4L8 20l-5 1Z', refresh: 'M20 8a9 9 0 0 0-16-1M4 3v5h5M4 16a9 9 0 0 0 16 1m0 4v-5h-5'};
  return <svg className="ddMobileOnly" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}

type Status = {enabled: boolean; creationEnabled?: boolean; status?: string; ready?: boolean; connected?: boolean; requirementsDue?: boolean; bankPayoutStatus?: string | null};
export default function StripePayoutSetup({live=false}:{live?:boolean}) {
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
  const statusTitle = !status ? 'Checking Stripe status…' : needsReview ? 'Setup needs review' : status.ready ? live ? 'Ready to receive transfers' : 'Ready to receive sandbox transfers' : status.connected ? 'Complete your Stripe setup' : 'Connect your payout account';
  return <section id="stripe-payouts" className="dashboardCard accountCard payoutDetailsCard ddStripePayoutCard">
    <div className="ddMobileOnly ddPayoutIdentity"><span className="ddSectionAvatar"><AccountIcon name="bank"/></span><div><div className="ddPayoutIdentityLabel">Stripe payout account {!live&&<small>Sandbox</small>}</div><strong>{statusTitle}</strong>{status?.ready&&<span className="ddPayoutConnected">✓ Connected</span>}</div></div>
    <div className="payoutDetailsHead"><div className="payoutIcon"><AccountIcon name="bank"/></div>
      <div><span className="payoutEyebrow">TRANSPORTER PAYOUTS</span><h2>Stripe payout account {!live&&<span className="accountPreviewBadge">Sandbox</span>}</h2><p>Set up your payout account securely with Stripe.</p></div>
      {status?.ready && <span className="payoutReadyBadge">✓ Connected</span>}
    </div>
    <div className="payoutBankPanel"><div className="payoutBankTop"><div><small>PAYOUT ACCOUNT</small><strong>{!status ? 'Checking Stripe status…' : needsReview ? 'Setup needs review' : status.ready ? live ? 'Ready to receive transfers' : 'Ready to receive sandbox transfers' : status.connected ? 'Complete your Stripe setup' : 'Connect your payout account'}</strong></div><span className="payoutShield"><AccountIcon name="shield"/></span></div></div>
    {status?.requirementsDue && status.connected && <div className="formNotice" role="status">Stripe needs more information. Continue setup to keep your payout account ready.</div>}
    {status?.bankPayoutStatus && <div className={`formNotice ${status.bankPayoutStatus === 'failed' ? 'errorNotice' : ''}`} role="status"><strong>Latest bank payout: {status.bankPayoutStatus.replaceAll('_', ' ')}</strong><p>{status.bankPayoutStatus === 'failed' ? 'Open Stripe to check and update the payout bank account. A failed bank payout does not create another booking payment.' : 'This is your account’s latest bank payout and may include several deliveries. View the breakdown in Stripe.'}</p></div>}
    <div className="ddMobileOnly ddPayoutSecurity"><span><AccountIcon name="shield"/></span><div><strong>Your details stay with Stripe</strong><p>Stripe manages identity checks and bank details.</p></div><p>DriveDrop releases payments after delivery, customer confirmation and the review window. Stripe handles onward bank payouts.</p></div>
    <div className="payoutSecurityNote"><span>✓</span><div><strong>Your details stay with Stripe</strong><p>DriveDrop controls release after delivery, customer confirmation and the review window. Stripe handles identity checks, bank details and onward bank payouts.</p></div></div>
    {!live&&<div className="accountTestWarning"><AccountIcon name="warning"/><span className="ddPayoutLegacyCopy">Sandbox testing only. Use Stripe test details; no real money moves.</span><span className="ddMobileOnly"><strong>Sandbox testing only</strong><small>Use Stripe test details. No real money moves.</small></span></div>}
    {status?.creationEnabled===false&&<p>New payout setup is temporarily paused. You can still view your connected Stripe dashboard.</p>}
    {error && <div className="formNotice errorNotice" role="alert">{error}</div>}
    {needsReview && <p>Contact DriveDrop support to reconcile the earlier setup attempt.</p>}
    <div className="payoutFormActions">
      <button className="btn orange" disabled={busy || !status?.enabled || needsReview || (!status?.ready && status?.creationEnabled===false)} onClick={() => void open(status?.ready ? 'dashboard' : 'onboard')}><PayoutActionIcon name="open"/>{busy ? 'Opening Stripe…' : status?.ready ? 'Open Stripe dashboard' : status?.connected ? 'Continue Stripe setup' : 'Set up payouts'}</button>
      {status?.ready && <button className="btn light" disabled={busy || status?.creationEnabled===false} onClick={() => void open('onboard')}><PayoutActionIcon name="edit"/>Update payout details</button>}
      <button className="btn light" disabled={busy} onClick={() => void load()}><PayoutActionIcon name="refresh"/>Refresh status</button>
    </div>
  </section>;
}
