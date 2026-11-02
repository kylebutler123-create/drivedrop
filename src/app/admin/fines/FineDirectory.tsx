'use client';

import Link from 'next/link';
import {useState} from 'react';
import Icon from '@/app/components/ApprovedIcon';
import {paymentMoney} from '@/lib/customer-payments';
import type {FineBalance, OpenFine} from '@/lib/outstanding-payout-fines';
import styles from './fines.module.css';

type Fine = Omit<OpenFine, 'createdAt'> & {createdAt: string};
type Estimate = {
  bookingId: string;
  vehicle: string;
  proceeds: number;
  eligiblePence: number;
  expectedDeductionPence: number;
  netPayoutPence: number;
  outstandingPence: number;
};

const bookingRef = (id: string) => 'DD-' + id.slice(-8).toUpperCase();
const fineDate = new Intl.DateTimeFormat('en-GB', {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London'});
const countLabel = (n: number, kind: string) => `${n} ${kind} fine${n === 1 ? '' : 's'}`;

function PayoutEstimate({estimates}: {estimates: Estimate[]}) {
  const [bookingId, setBookingId] = useState('');
  const payout = estimates.find(item => item.bookingId === bookingId) ?? estimates[0];
  return <aside className={styles.estimate} aria-label="Payout estimate">
    <span className={styles.kicker}><Icon name="wallet"/>Payout estimate</span>
    {payout ? <>
      {estimates.length > 1 && <label className={styles.picker}>Booking
        <select value={payout.bookingId} onChange={e => setBookingId(e.target.value)}>
          {estimates.map(item => <option key={item.bookingId} value={item.bookingId}>{item.vehicle} · {bookingRef(item.bookingId)}</option>)}
        </select></label>}
      <h3>{payout.vehicle}</h3><small>{bookingRef(payout.bookingId)}</small>
      <dl><div><dt>Transporter proceeds</dt><dd>{paymentMoney(payout.proceeds)}</dd></div>
        <div><dt>Expected deduction</dt><dd>{payout.expectedDeductionPence > 0 ? '−' : ''}{paymentMoney(payout.expectedDeductionPence)}</dd></div>
        <div className={styles.net}><dt>Estimated transfer</dt><dd>{paymentMoney(payout.netPayoutPence)}</dd></div>
      </dl>
      <p>Eligible fines total {paymentMoney(payout.eligiblePence)}. This payout would cover {paymentMoney(payout.expectedDeductionPence)}.</p>
      <div className={styles.after}><span>Balance if released</span><strong>{paymentMoney(payout.outstandingPence - payout.expectedDeductionPence)}</strong></div>
    </> : <p>No payout is available to estimate for this transporter.</p>}
  </aside>;
}

export default function FineDirectory({accounts, selectedId, fines, estimates}: {
  accounts: FineBalance[]; selectedId: string | null; fines: Fine[]; estimates: Estimate[];
}) {
  const [search, setSearch] = useState('');
  const term = search.trim().toLowerCase();
  const shown = accounts.filter(account => account.name.toLowerCase().includes(term) ||
    account.references.some(reference => reference.toLowerCase().includes(term)));
  return <section className={styles.directory}>
    <div className={styles.toolbar}>
      <div><h2>Transporter balances</h2><small>Highest balance first</small></div>
      <label className={styles.search}><Icon name="search"/><input type="search" aria-label="Search by transporter name or fine booking" placeholder="Name or fine booking" value={search} onChange={e => setSearch(e.target.value)}/></label>
    </div>
    {shown.map(account => {
      const open = selectedId === account.transporterId;
      const userId = encodeURIComponent(account.transporterId);
      return <article key={account.transporterId}>
        <Link className={styles.owner} href={`/admin/fines?transporter=${open ? '' : userId}`} scroll={false} prefetch={false} aria-expanded={open}>
          <span className={styles.avatar} aria-hidden="true">{account.name.trim().slice(0, 1).toUpperCase() || 'T'}</span>
          <span className={styles.identity}><strong>{account.name}</strong><small>{countLabel(account.cancellationCount, 'cancellation')} · {countLabel(account.disputeCount, 'dispute')}</small></span>
          <span className={styles.balance}><strong>{paymentMoney(account.outstandingPence)}</strong><small>Balance owed</small></span><Icon name="chevronDown"/>
        </Link>
        {open && <div className={styles.details}>
          <section className={styles.ledger}>
            <div className={styles.ledgerTitle}><h3>Open fines <span>{fines.length}</span></h3>
              <Link href={`/admin?view=users&user=${userId}#user-${userId}`} prefetch={false}>View user card ↗</Link></div>
            <table aria-label={`Open fines for ${account.name}`}><thead><tr>
              <th scope="col">Fine and booking</th><th scope="col">Original</th><th scope="col">Recovered</th><th scope="col">Still owed</th>
            </tr></thead><tbody>{fines.map(fine => <tr key={fine.kind + fine.id}>
              <th scope="row">{fine.kind} fine<small>{bookingRef(fine.bookingId)} · {fineDate.format(new Date(fine.createdAt))}</small></th>
              <td>{paymentMoney(fine.originalPence)}</td><td>{paymentMoney(fine.recoveredPence)}</td><td><strong>{paymentMoney(fine.outstandingPence)}</strong></td>
            </tr>)}</tbody></table>
          </section>
          <PayoutEstimate key={account.transporterId} estimates={estimates}/>
        </div>}
      </article>;
    })}
    {!shown.length && <p role="status" className={styles.empty}>{accounts.length ? 'No matching transporters. Try a name or a fine booking reference.' : 'No outstanding fines.'}</p>}
  </section>;
}
