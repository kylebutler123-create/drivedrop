'use client';

import {useState} from 'react';
import Link from 'next/link';
import Icon from '../components/ApprovedIcon';
import {vehiclePhotoUrl} from '@/lib/vehicle-photo';
import {type CustomerPayment, bookingPaymentHref, paymentLabel, paymentMoney} from '@/lib/customer-payments';
import styles from './payments.module.css';

const dateFormat = new Intl.DateTimeFormat('en-GB', {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London'});
const date = (value: string | null) => value ? dateFormat.format(new Date(value)) : 'Not recorded';
const receipt = (row: CustomerPayment) => `/api/customer/payments/download?bookingId=${encodeURIComponent(row.bookingId)}&format=pdf`;

function DownloadIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></svg>;
}

function RoutePin() {
  return <svg viewBox="0 0 24 30" aria-hidden="true"><path fill="#ff7114" d="M12 0A12 12 0 0 0 0 12c0 7 12 18 12 18s12-11 12-18A12 12 0 0 0 12 0Z"/><circle cx="12" cy="11.5" r="7.5" fill="white"/><circle cx="12" cy="11.5" r="5.5" fill="#071c43"/></svg>;
}

function PaymentVehicle({row}: {row: CustomerPayment}) {
  const url = vehiclePhotoUrl(row.job);
  const [failed, setFailed] = useState<string | null>(null);
  return <span className={styles.mobileVehicle}>{url && failed !== url
    ? <img src={url} alt="Customer's vehicle" loading="lazy" ref={image => {if (image?.complete && !image.naturalWidth) setFailed(url)}} onError={() => setFailed(url)}/>
    : <Icon name={/van|transit|sprinter|motorhome/i.test(row.vehicle) ? 'truck' : 'car'}/>}</span>;
}

export default function MobilePaymentCards({payments}: {payments: CustomerPayment[]}) {
  return <div className={styles.mobileCards}>{payments.map(row => <article className={styles.paymentCard} key={row.id} aria-label={`Payment ${row.reference}`}>
    <div className={styles.paymentCardHeader}>
      <PaymentVehicle row={row}/>
      <div className={styles.paymentIdentity}><h3>{row.vehicle}</h3><span>{row.reference}</span></div>
      <strong className={styles.paymentAmount}>{paymentMoney(row.paidPence, row.currency)}</strong>
      <span className={styles.paymentDate}>{date(row.paidAt)}</span>
      <span className={`${styles.status} ${styles.paymentStatus} ${row.status === 'PAID' ? styles.paid : row.status.includes('REFUND') ? styles.refunded : styles.pending}`}>{paymentLabel(row.status)}</span>
      {row.refundedPence > 0 && <small className={styles.paymentRefund}>Refunded {paymentMoney(row.refundedPence, row.currency)}</small>}
      {row.test && <small className={`${styles.testBadge} ${styles.mobileTestBadge}`}>Test payment</small>}
    </div>
    <details className={styles.paymentDetails}>
      <summary aria-label={`Payment details for ${row.reference}`}>
        <span className={styles.closedLabel}>View payment details</span><span className={styles.openLabel}>Payment details</span><Icon name="chevronDown"/>
      </summary>
      <div className={styles.paymentDetailBody}>
        <div className={styles.mobileJourney}>
          <div><RoutePin/><div><small>Collection</small><strong>{row.collection}</strong></div></div>
          <div><RoutePin/><div><small>Delivery</small><strong>{row.delivery}</strong></div></div>
        </div>
        <h4>Payment breakdown</h4>
        <dl className={styles.mobileAmounts}>
          <div><dt>Agreed booking total</dt><dd>{paymentMoney(row.totalPence, row.currency)}</dd></div>
          <div><dt>Total paid</dt><dd>{paymentMoney(row.paidPence, row.currency)}</dd></div>
          <div><dt>Refunds</dt><dd>{paymentMoney(row.refundedPence, row.currency)}</dd></div>
          {row.refundedPence > 0 && <div><dt>Net paid</dt><dd>{paymentMoney(row.paidPence - row.refundedPence, row.currency)}</dd></div>}
        </dl>
        <dl className={styles.mobilePaidOn}><div><dt>Paid on</dt><dd>{date(row.paidAt)}</dd></div></dl>
        {row.paidPence > 0
          ? <a className={styles.mobileReceipt} href={receipt(row)}><DownloadIcon/>Download receipt (PDF)</a>
          : <p className={styles.receiptHelp}>A receipt becomes available when a payment is recorded.</p>}
        <Link className={styles.mobileViewBooking} href={bookingPaymentHref(row)}>View booking <Icon name="chevronRight"/></Link>
      </div>
    </details>
    {row.paidPence > 0 && <a className={styles.quickReceipt} href={receipt(row)} aria-label={`Download receipt for ${row.reference}`}><DownloadIcon/></a>}
  </article>)}</div>;
}
