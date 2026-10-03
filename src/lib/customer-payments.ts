export type CustomerPayment = {
  id: string; bookingId: string; reference: string; vehicle: string;
  collection: string; delivery: string; bookingStatus: string; confirmed: boolean;
  currency: string; totalPence: number; paidPence: number; refundedPence: number;
  status: string; createdAt: string; paidAt: string | null; test: boolean;
};
export const paymentStatuses = ['PENDING','AUTHORIZED','PAID','PARTIALLY_REFUNDED','REFUNDED','FAILED','CANCELLED'];
export const paymentLabel = (value:string) => value.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
export const paymentMoney = (pence:number,currency='GBP') => new Intl.NumberFormat('en-GB',{style:'currency',currency}).format(pence/100);
export const paymentDate = (date:string|null) => date ? new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'}).format(new Date(date)) : 'Not recorded';
export const paymentMonth = (date:string) => new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',timeZone:'Europe/London'}).format(new Date(date));
export function filterPayments(rows:CustomerPayment[],filters:{q?:string;status?:string;month?:string}) {
  const q=(filters.q||'').trim().toLowerCase();
  return rows.filter(row=>(!q||`${row.reference} ${row.vehicle} ${row.bookingId}`.toLowerCase().includes(q))&&(!filters.status||row.status===filters.status)&&(!filters.month||!!row.paidAt&&paymentMonth(row.paidAt)===filters.month));
}
export function paymentTotals(rows:CustomerPayment[]) {
  return rows.reduce((total,row)=>({paid:total.paid+row.paidPence,refunded:total.refunded+row.refundedPence,net:total.net+row.paidPence-row.refundedPence}),{paid:0,refunded:0,net:0});
}
export function bookingPaymentHref(row:CustomerPayment) {
  const view=row.bookingStatus==='CANCELLED'?'cancelled':row.confirmed?'completed':'bookings';
  return `/customer?view=${view}#payment-booking-${encodeURIComponent(row.bookingId)}`;
}
// Quoting protects CSV structure; prefix formula-like values for spreadsheet safety.
export function paymentCsv(rows:CustomerPayment[]) {
  const cell=(value:string)=>'"'+(/^[\s]*[=+\-@\t\r]/.test(value)?"'"+value:value).replaceAll('"','""')+'"';
  const records=[['Booking','Vehicle','Payment date','Currency','Agreed booking total','Total paid','Refunded','Net paid','Status','Record type'],...rows.map(r=>[r.reference,r.vehicle,paymentDate(r.paidAt),r.currency,(r.totalPence/100).toFixed(2),(r.paidPence/100).toFixed(2),(r.refundedPence/100).toFixed(2),((r.paidPence-r.refundedPence)/100).toFixed(2),paymentLabel(r.status),r.test?'Test payment':'Payment'])];
  return '\uFEFF'+records.map(row=>row.map(cell).join(',')).join('\r\n');
}
