import PayoutButton, {type PayoutResult} from './PayoutButton';
export default function StripePayoutNotice({payment, onResult}: {payment: any; onResult?: (result: PayoutResult) => void}) {
  if (payment.provider !== 'STRIPE') return null;
  const payout = payment.stripePayout;
  const processing = payment.payoutStatus === 'PROCESSING';
  const failed = payment.payoutStatus === 'FAILED';
  const reversed = payout?.status === 'REVERSED';
  const message = payment.payoutStatus === 'CANCELLED' ? 'This payout is cancelled. See the confirmed refund record.' : reversed ? 'The Stripe transfer was reversed. Review recovery before taking further action.' :
    payout?.failureCode === 'STALE_ATTEMPT' ? 'An earlier transfer attempt needs reconciliation. No new transfer will be created automatically.' :
    payout?.failureCode === 'ACCOUNT_NOT_READY' ? 'The transporter needs to finish Stripe verification.' :
    failed ? 'Stripe confirmation needs attention. Check the existing transfer before trying again.' :
    processing ? 'Release is being checked with Stripe. Repeated requests use the same payout record.' :
    payout?.status === 'DEDUCTED' ? 'The proceeds were fully offset by fines. No transfer was required.' :
    payment.payoutStatus === 'PAID' ? 'Released to the transporter’s Stripe balance. Bank arrival is separate and is shown in their Stripe dashboard.' :
    'Stripe bank payouts start after DriveDrop releases the eligible funds.';
  return <div className={`formNotice ${failed || reversed ? 'errorNotice' : ''}`} role="status"><strong>{processing ? 'Payout processing' : failed || reversed ? 'Payout needs attention' : 'Stripe sandbox payout'}</strong><p>{message}</p>
    {!!payout?.finePence && payment.payoutStatus !== 'PAID' && !payment.stripeRefunds?.length && <p>The fine deduction is reserved on this payout and will not be deducted again on retry.</p>}
    {failed && !reversed && !payment.stripeRefunds?.some((r:any)=>r.activePaymentId) && <PayoutButton paymentId={payment.id} amountPence={payment.transporterProceedsPence} retry onReleased={onResult}/>}
  </div>;
}
