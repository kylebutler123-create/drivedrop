const assert = require('node:assert/strict');
const fs = require('node:fs');
const postcss = require('postcss');
const sheet = postcss.parse(fs.readFileSync('src/app/admin-payouts-desktop.css', 'utf8'));
for (const node of sheet.nodes) {
  if (node.type === 'comment') continue;
  assert.equal(node.type, 'atrule');
  assert.equal(node.name, 'media');
  assert.match(node.params, /min-width:\s*1024px/);
  node.walkRules(rule => assert(rule.selector.startsWith('body.approvedDesktop.role-admin ')));
}
const palette = {READY:['#008346','#e6f5ed'],WAITING:['#a76600','#fff0ce'],BLOCKED:['#b32933','#ffeaed'],HELD:['#a34c16','#fff0e4'],PAID:['#0752df','#eaf1fe']};
for (const [category, colours] of Object.entries(palette)) {
  const rules = [];
  sheet.walkRules(rule => {if(rule.selector.includes(`[data-payout-category="${category}"]`))rules.push(rule);});
  assert.equal(rules.length,1);
  assert(rules[0].selector.includes('.adminShell:has('), 'Card and filter must share the same palette');
  assert.deepEqual(rules[0].nodes.map(n=>n.value),colours);
}
const dash=fs.readFileSync('src/app/admin/payouts/PayoutDashboard.tsx','utf8');
for (const text of ['data-payout-category={key}','aria-pressed={category===key}','onClick={()=>selectCategory(key)}','onClick={exportVisible}','onChange={event=>setQuery(event.target.value)}','setCategory(\'PAID\')']) assert(dash.includes(text),text);
const records=fs.readFileSync('src/app/admin/payouts/PayoutRecords.tsx','utf8');
for (const text of ['aria-expanded={open}','payoutWindowOpen({...b,payment:p},p.events,reviewNow)',"kind==='READY'&&p.payoutDetailsComplete&&!active",'capturedPayment(p.status)','disabled>Release unavailable','ReviewWindowNotice','PayoutButton paymentId={p.id}']) assert(records.includes(text),text);
console.log('PASS: desktop isolation, shared five-status palette, filter/search/export controls and payout release guards.');
