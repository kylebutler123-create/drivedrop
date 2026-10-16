const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const swc = require('next/dist/build/swc');
const root = path.resolve(__dirname, '..');
const modules = new Map();
function load(relative) {
  const file = path.join(root, relative);
  if (modules.has(file)) return modules.get(file);
  const exports = {};
  modules.set(file, exports);
  const source = fs.readFileSync(file, 'utf8');
  const {code} = swc.transformSync(source, {filename: file, jsc: {parser: {syntax: 'typescript', tsx: file.endsWith('tsx')}, target: 'es2022', transform: {react: {runtime: 'automatic'}}}, module: {type: 'commonjs'}});
  vm.runInNewContext(code, {exports, Date, console, require: name => {
    if (name.endsWith('.css')) return {};
    if (name.startsWith('@/')) {
      const base = `src/${name.slice(2)}`;
      return load(fs.existsSync(path.join(root, base + '.tsx')) ? base + '.tsx' : base + '.ts');
    }
    return require(name);
  }});
  return exports;
}
const helpers = load('src/lib/verification-document-review.ts');
const Component = load('src/components/VerificationDesktopReview.tsx').default;
const doc = (id, type, status, createdAt) => ({id, type, status, createdAt, expiresAt: type === 'INSURANCE' ? '2099-09-30' : null, documentUrl: `private/account/${id}.pdf`, uploaderId: 'transporter'});
const documents = [
  doc('old-insurance', 'INSURANCE', 'APPROVED', '2025-11-01T10:15:00Z'),
  doc('new-insurance', 'INSURANCE', 'PENDING', '2026-10-16T13:32:00Z'),
  doc('old-licence', 'DRIVING_LICENCE', 'APPROVED', '2025-11-01T10:18:00Z'),
  doc('new-licence', 'DRIVING_LICENCE', 'PENDING', '2026-10-16T13:35:00Z'),
];
const base = {id: 'verification', status: 'PENDING', businessName: 'Example transport', companyNumber: '12345678', phone: '07700900123', documents, transporter: {id: 'transporter', name: 'Example person', email: 'example@example.com', accountStatus: 'ACTIVE'}};
const calls = [];
const props = {filter: 'VERIFY', filters: [{value: 'VERIFY', label: 'Verify accounts'}, {value: 'REPLACEMENT', label: 'Replacement insurance required'}], counts: {VERIFY: 1, REPLACEMENT: 0}, rows: [base], query: '', setQuery: value => calls.push(['search', value]), onFilter: value => calls.push(['filter', value]), expanded: 'verification', onExpand: value => calls.push(['expand', value]), message: '', busy: null, reviewingDocument: null, onReview: (...args) => calls.push(['review', ...args]), onDocumentReview: (...args) => calls.push(['document', ...args]), onMessage: row => calls.push(['message', row.id]), onAccountAction: (row, action) => calls.push(['account', row.id, action])};
function expand(element) {
  if (!React.isValidElement(element)) return element;
  if (typeof element.type === 'function') return expand(element.type(element.props));
  return React.cloneElement(element, {}, React.Children.map(element.props.children, expand));
}
function find(element, predicate, result = []) {
  if (!React.isValidElement(element)) return result;
  if (predicate(element)) result.push(element);
  React.Children.forEach(element.props.children, child => find(child, predicate, result));
  return result;
}
const grouped = helpers.documentReviewGroups(documents);
assert.equal(grouped[0].current[0].id, 'new-insurance');
assert.equal(grouped[0].history[0].id, 'old-insurance');
assert.equal(documents[0].id, 'old-insurance', 'sorting must not mutate API data');
assert.equal(helpers.documentStoredFilename({...documents[0], documentUrl: '/secure/a%20file.pdf?token=secret'}), 'a file.pdf');
assert.equal(helpers.documentStoredFilename({...documents[0], documentUrl: null}), 'Document old-insurance');
assert.match(helpers.uploadDateLabel('2026-10-16T13:32:00Z'), /14:32/);
assert.match(helpers.uploadDateLabel('2026-10-26T13:32:00Z'), /13:32/);
const tree = expand(React.createElement(Component, props));
const html = renderToStaticMarkup(tree);
assert.equal((html.match(/NEW UPLOAD/g) || []).length, 2);
assert(html.includes('16 October 2026 at 14:32'));
assert(html.includes('4 · 2 new uploads'));
assert(html.includes('Previous insurance'));
assert(html.includes('Previous driving licence'));
assert(html.includes('old-insurance.pdf'));
assert(!html.includes('private/account/'), 'do not expose private storage paths');
const docCards = find(tree, n => n.type === 'section' && n.props['data-document-id']);
assert.equal(docCards.length, 2);
for (const card of docCards) {
  const id = card.props['data-document-id'];
  const buttons = find(card, n => n.type === 'button');
  assert.equal(buttons.length, 2, 'history must not have review controls');
  buttons[0].props.onClick();
  assert.deepEqual(calls.pop(), ['document', id, 'APPROVED']);
  buttons[1].props.onClick();
  assert.deepEqual(calls.pop(), ['document', id, 'REJECTED']);
  assert(find(card, n => n.type === 'a').some(a => a.props.href === '/api/verification-documents/' + id));
}
find(tree, n => n.type === 'button' && n.props.className === 'vr-filter')[1].props.onClick();
assert.deepEqual(calls.pop(), ['filter', 'REPLACEMENT']);
find(tree, n => n.type === 'button' && n.props['data-filter'] === 'VERIFY')[0].props.onClick();
assert.deepEqual(calls.pop(), ['filter', 'ALL']);
const allTree = expand(React.createElement(Component, {...props, filter: 'ALL'}));
assert(find(allTree, n => n.type === 'button' && n.props.className === 'vr-filter').every(n => n.props['aria-pressed'] === false));
find(allTree, n => n.type === 'button' && n.props['data-filter'] === 'VERIFY')[0].props.onClick();
assert.deepEqual(calls.pop(), ['filter', 'VERIFY']);
find(tree, n => n.type === 'input')[0].props.onChange({target: {value: 'policy'}});
assert.deepEqual(calls.pop(), ['search', 'policy']);
find(tree, n => n.type === 'button' && n.props.className === 'vr-summary')[0].props.onClick();
assert.deepEqual(calls.pop(), ['expand', null]);
const multi = [...documents, doc('earlier-pending', 'INSURANCE', 'PENDING', '2026-10-14T11:00:00Z'), doc('identity', 'IDENTITY', 'PENDING', '2026-10-16T15:00:00Z')];
const allIds = helpers.documentReviewGroups(multi).flatMap(g => [...g.current, ...g.history].map(d => d.id));
assert.equal(allIds.length, multi.length);
assert.equal(new Set(allIds).size, multi.length);
const multiHtml = renderToStaticMarkup(React.createElement(Component, {...props, rows: [{...base, documents: multi}]}));
assert(multiHtml.includes('EARLIER UPLOAD'));
assert(multiHtml.includes('Open NEW identity'));
const approvedHtml = renderToStaticMarkup(React.createElement(Component, {...props, rows: [{...base, status: 'APPROVED', documents: documents.map(d => ({...d, status: 'APPROVED'}))}]}));
assert(!approvedHtml.includes('NEW UPLOAD'));
assert(!approvedHtml.includes('Approve this upload'));
const missingHtml = renderToStaticMarkup(React.createElement(Component, {...props, rows: [{...base, status: 'NOT_STARTED', documents: []}]}));
assert(missingHtml.includes('Not uploaded'));
assert(missingHtml.includes('Verification not started'));
assert(missingHtml.includes('data-status="NOT_STARTED"'));
assert(approvedHtml.includes('data-status="APPROVED"'));
const expiredTree = expand(React.createElement(Component, {...props, rows: [{...base, documents: [{...documents[1], expiresAt: '2020-01-01'}]}]}));
assert(find(expiredTree, n => n.type === 'button' && n.props.title?.startsWith('Insurance must'))[0].props.disabled);
const source = fs.readFileSync(path.join(root, 'src/components/VerificationAdmin.tsx'), 'utf8');
assert(source.includes('onDocumentReview={reviewDocument}'));
assert(source.includes('JSON.stringify({documentId,documentStatus,reviewNote})'));
const css = fs.readFileSync(path.join(root, 'src/app/admin-verification-review.css'), 'utf8');
assert(css.replace(/\s/g, '').startsWith('/*Thelegacyviewremainsunchangedbelow1024px.*/.verificationDesktopReview{display:none;}.verificationLegacyView{display:contents;}@media(min-width:1024px)'));
console.log('PASS: newest vs previous versions, all pending uploads, reviewed/missing/expired states, exact document action IDs, private links, UK times, filters, search and desktop-only styling.');
