import Link from 'next/link';
import Icon from '@/app/components/ApprovedIcon';
import {paymentMoney} from '@/lib/customer-payments';
import type {FineSummary} from '@/lib/outstanding-payout-fines';
import styles from '@/app/admin/fines/fines.module.css';

export function FineOverviewCard({summary}: {summary: FineSummary[]}) {
  const pence = summary.reduce((sum, row) => sum + row.outstandingPence, 0);
  const count = summary.reduce((sum, row) => sum + row.cancellationCount + row.disputeCount, 0);
  return <Link className={styles.entry} href="/admin/fines" prefetch={false}>
    <span className={styles.entryHead}><Icon name="file"/>Outstanding fines</span>
    <strong className={styles.entryValue}>{paymentMoney(pence)}</strong>
    <small>{summary.length} transporter{summary.length === 1 ? '' : 's'} · {count} open fine{count === 1 ? '' : 's'}</small>
    <span className={styles.entryFoot}>View balances <Icon name="arrow"/></span>
  </Link>;
}

export function TransporterFineCard({userId, fine}: {userId: string; fine?: FineSummary}) {
  const count = fine ? fine.cancellationCount + fine.disputeCount : 0;
  return <section className={styles.accountFine} aria-label="Outstanding fines">
    <div className={styles.accountHeadline}><h4>Outstanding fines</h4><strong>{paymentMoney(fine?.outstandingPence ?? 0)}</strong></div>
    <small>{count} open fine{count === 1 ? '' : 's'}</small>
    {fine && <>
      <dl><div className={styles.categoryRow}><dt>Cancellation fines ({fine.cancellationCount})</dt><dd>{paymentMoney(fine.cancellationPence)}</dd></div>
        <div className={styles.categoryRow}><dt>Dispute fines ({fine.disputeCount})</dt><dd>{paymentMoney(fine.disputePence)}</dd></div></dl>
      <Link className={styles.history} href={`/admin/fines?transporter=${encodeURIComponent(userId)}`} prefetch={false}>View fine history →</Link>
    </>}
  </section>;
}
