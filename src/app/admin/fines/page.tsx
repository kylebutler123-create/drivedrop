import Link from 'next/link';
import {currentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {adminFineBalances, outstandingPayoutFines} from '@/lib/outstanding-payout-fines';
import {payoutFinePreview} from '@/lib/payout-fine-preview';
import {capturedPayment, payoutWindowOpen} from '@/lib/payout-policy';
import {paymentMoney} from '@/lib/customer-payments';
import FineDirectory from './FineDirectory';
import styles from './fines.module.css';

export const dynamic = 'force-dynamic';

export default async function AdminFines({searchParams}: {searchParams: Promise<{transporter?: string}>}) {
  const admin = await currentUser();
  if (!admin || admin.role !== 'ADMIN' || admin.accountStatus !== 'ACTIVE') {
    return <main className="shell dashboardShell"><section className="dashboardCard adminAccess">
      <h1>Admin access</h1><p>Sign in as an administrator to view fine balances.</p>
      <Link className="btn orange" href="/login">Sign in as administrator</Link>
    </section></main>;
  }
  const {transporter} = await searchParams;
  // The directory total and selected ledger should agree even during a release.
  const {accounts, selectedId, fines, estimates} = await prisma.$transaction(async tx => {
    const accounts = await adminFineBalances(tx);
    const selected = transporter === undefined && accounts.length === 1
      ? accounts[0] : accounts.find(account => account.transporterId === transporter);
    if (!selected) return {accounts, selectedId: null, fines: [], estimates: []};
    const selectedId = selected.transporterId;
    const fines = await outstandingPayoutFines([selectedId], tx);
    const payments = await tx.bookingPayment.findMany({
      where: {booking: {transporterId: selectedId, status: 'DELIVERED'}, payoutStatus: {in: ['READY', 'HELD', 'PROCESSING', 'FAILED']}},
      select: {
        id: true, bookingId: true, payoutStatus: true, status: true, transporterProceedsPence: true,
        stripePayout: {select: {id: true}}, stripeRefunds: {where: {activePaymentId: {not: null}}, take: 1, select: {id: true}},
        events: {where: {type: 'PAYOUT_READY'}, select: {note: true}},
        booking: {select: {
          transporterId: true, status: true, customerConfirmedAt: true, job: {select: {vehicleMake: true, vehicleModel: true}},
          disputes: {select: {id: true, status: true, resolution: true}},
          trackingEvents: {where: {status: 'DELIVERED'}, orderBy: {createdAt: 'desc'}, take: 1, select: {createdAt: true}},
        }},
      },
      orderBy: [{booking: {createdAt: 'desc'}}, {id: 'asc'}],
    });
    const estimates = payments.flatMap(p => {
      if (p.payoutStatus !== 'READY' || p.stripePayout || p.stripeRefunds.length ||
          !capturedPayment(p.status) || !payoutWindowOpen(p.booking, p.events)) return [];
      const preview = payoutFinePreview(p, payments, fines);
      if (!preview) return [];
      const {vehicleMake, vehicleModel} = p.booking.job;
      return [{...preview, bookingId: p.bookingId, vehicle: [vehicleMake.trim(), vehicleModel.trim()].filter(Boolean).join(' '), proceeds: p.transporterProceedsPence}];
    });
    return {accounts, selectedId, fines: fines.map(fine => ({...fine, createdAt: fine.createdAt.toISOString()})), estimates};
  }, {isolationLevel: 'RepeatableRead'});
  const total = accounts.reduce((n, account) => n + account.outstandingPence, 0);
  const count = accounts.reduce((n, account) => n + account.cancellationCount + account.disputeCount, 0);
  return <main className={`shell dashboardShell adminShell ${styles.page}`}>
    <nav className={styles.crumb} aria-label="Breadcrumb"><Link href="/admin">Control Centre</Link><span aria-hidden="true">›</span>Outstanding fines</nav>
    <header className={styles.hero}>
      <div><span className={styles.eyebrow}>Finance operations</span><h1>Outstanding fines</h1>
        <p>{accounts.length} transporter{accounts.length === 1 ? '' : 's'} · {count} open fine{count === 1 ? '' : 's'}</p></div>
      <div className={styles.heroTotal}><small>Total still owed</small><strong>{paymentMoney(total)}</strong></div>
    </header>
    <FineDirectory accounts={accounts} selectedId={selectedId} fines={fines} estimates={estimates}/>
  </main>;
}
