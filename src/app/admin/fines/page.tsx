import Link from 'next/link';
import {currentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {adminFineBalances, outstandingPayoutFines} from '@/lib/outstanding-payout-fines';
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
  const {accounts, selectedId, fines} = await prisma.$transaction(async tx => {
    const accounts = await adminFineBalances(tx);
    const selected = accounts.find(account => account.transporterId === transporter);
    if (!selected) return {accounts, selectedId: null, fines: []};
    const selectedId = selected.transporterId;
    const fines = await outstandingPayoutFines([selectedId], tx);
    return {accounts, selectedId, fines: fines.map(fine => ({...fine, createdAt: fine.createdAt.toISOString()}))};
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
    <FineDirectory accounts={accounts} selectedId={selectedId} fines={fines}/>
  </main>;
}
