import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {alternativeRefundsEnabled, reviewAlternativeRefund} from '@/lib/alternative-refunds';
import {ConnectError} from '@/lib/stripe-connect-provider';

export const maxDuration = 90;
export const runtime = 'nodejs';
// Read-only: no evidence is accepted and no audit, ledger or Stripe object is written.
export async function GET(request: Request) {
  if (!alternativeRefundsEnabled()) return NextResponse.json({error: 'Alternative refund recording is disabled.'}, {status: 403});
  const user = await currentUser();
  if (!user || user.role !== 'ADMIN' || user.accountStatus !== 'ACTIVE' || request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({error: 'Active administrator access required.'}, {status: 403});
  }
  try {
    const params = new URL(request.url).searchParams;
    const result = await reviewAlternativeRefund({paymentId: params.get('paymentId'), failedRefundId: params.get('failedRefundId'),
      amountPence: Number(params.get('amountPence')), expectedRefundedPence: Number(params.get('expectedRefundedPence'))}, user.id);
    return NextResponse.json(result, {headers: {'Cache-Control': 'private, no-store'}});
  } catch (error) {
    return NextResponse.json({error: error instanceof ConnectError ? error.message : 'Stripe could not be checked. No repayment has been recorded. Please try again.'}, {status: 409, headers: {'Cache-Control': 'private, no-store'}});
  }
}
