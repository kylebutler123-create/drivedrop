const assert = require('node:assert/strict');
const fs = require('node:fs');
const postcss = require('postcss');
const css = fs.readFileSync('src/app/admin-operations-desktop.css', 'utf8');
const sheet = postcss.parse(css);
for (const node of sheet.nodes) {
  if (node.type === 'comment') continue;
  if (node.type === 'atrule') {
    assert.equal(node.name, 'media');
    assert.match(node.params, /min-width:\s*1024px/);
  } else {
    assert(['.operationsDesktopOnly', '.adminOperationsSection'].includes(node.selector));
    assert.equal(node.nodes.length, 1);
    assert.equal(node.nodes[0].prop, 'display');
    assert(['none', 'contents'].includes(node.nodes[0].value));
  }
}
const review = fs.readFileSync('src/app/admin/review-disputes/page.tsx', 'utf8');
assert.match(review, /resolve\(i.id,'KEEP'\)/);
assert.match(review, /resolve\(i.id,'HIDE'\)/);
assert.match(review, /resolve\(i.id,'REJECT'\)/);
assert(review.includes('if(!note?.trim())return'));
assert(review.includes('aria-expanded={open}'));
assert(review.includes('No review disputes awaiting moderation'));
assert(review.includes('Loading review disputes'));
const bookings = fs.readFileSync('src/components/AdminBookingRecords.tsx', 'utf8');
assert(bookings.includes('payoutWindowOpen(b,b.payment.events,reviewNow)'));
assert(bookings.includes('inPayoutReviewWindow(b,b.payment.events,reviewNow)'));
assert(bookings.includes('aria-expanded={open}'));
assert(bookings.includes('PayoutButton paymentId={b.payment.id}'));
console.log('PASS: desktop CSS isolation, empty/loading states, card expansion and unchanged review/payout safeguards.');
