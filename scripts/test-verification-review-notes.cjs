const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const React = require('react');
const swc = require('next/dist/build/swc');
const root = path.resolve(__dirname, '..');

function load(file, mocks, globals = {}) {
  const {code} = swc.transformSync(fs.readFileSync(path.join(root, file), 'utf8'), {
    filename: file,
    jsc: {parser: {syntax: 'typescript', tsx: file.endsWith('.tsx')}, target: 'es2022', transform: {react: {runtime: 'automatic'}}},
    module: {type: 'commonjs'},
  });
  const exports = {};
  vm.runInNewContext(code, {exports, console, Date, Request, Response, ...globals,
    require: name => name in mocks ? mocks[name] : require(name)});
  return exports;
}

let answer = null;
const requests = [];
const Client = load('src/components/VerificationAdmin.tsx', {
  react: {...React, useState: initial => [initial, () => {}], useEffect: () => {}},
  'next/navigation': {useRouter: () => ({refresh() {}})},
  './VerificationDesktopReview': {default: () => null},
}, {
  prompt: () => answer,
  alert: message => {throw new Error(message);},
  fetch: async (url, options) => {
    requests.push({url, options});
    return Response.json(options ? {} : []);
  },
}).default;
const reviewDocument = Client({}).props.children[0].props.onDocumentReview;

let actor, verification, documents, notices;
const reset = () => {
  actor = {id: 'admin', role: 'ADMIN'};
  verification = {id: 'verification', transporterId: 'transporter', businessName: 'Synthetic test', status: 'PENDING', reviewNote: null};
  documents = [
    {id: 'insurance', verificationId: 'verification', type: 'INSURANCE', status: 'APPROVED', expiresAt: new Date('2099-01-01'), reviewNote: null},
    {id: 'licence', verificationId: 'verification', type: 'DRIVING_LICENCE', status: 'PENDING', expiresAt: null, reviewNote: null},
  ];
  notices = [];
};
const db = {
  verificationDocument: {
    findUnique: async ({where}) => {
      const document = documents.find(d => d.id === where.id);
      return document ? {...document, verification} : null;
    },
    findFirst: async ({where}) => documents.find(d => d.verificationId === where.verificationId && d.type === where.type && d.status === where.status && (!where.expiresAt || d.expiresAt >= where.expiresAt.gte)) || null,
    update: async ({where, data}) => Object.assign(documents.find(d => d.id === where.id), data),
  },
  transporterVerification: {
    findUnique: async () => ({...verification}),
    update: async ({data}) => Object.assign(verification, data),
  },
  $transaction: async callback => callback(db),
};
const api = load('src/app/api/admin/verifications/route.ts', {
  '@/lib/auth': {currentUser: async () => actor},
  '@/lib/prisma': {prisma: db},
  '@/lib/notifications': {createNotificationSafely: async data => notices.push(data)},
});
const request = data => new Request('https://preview.example.test/api/admin/verifications', {
  method: 'PATCH', headers: {'content-type': 'application/json'}, body: JSON.stringify(data),
});

async function main() {
  for (const status of ['APPROVED', 'REJECTED']) {
    answer = null;
    requests.length = 0;
    await reviewDocument('licence', status);
    assert.equal(requests.length, 0, `Cancelling ${status} must not submit a review`);
  }
  const note = 'QA22 E2E synthetic sandbox test only — not real verification, identity or insurance.';
  answer = `  ${note}  `;
  await reviewDocument('licence', 'APPROVED');
  const approvedRequest = requests.find(r => r.options?.method === 'PATCH');
  const payload = JSON.parse(approvedRequest.options.body);
  assert.deepEqual(payload, {documentId: 'licence', documentStatus: 'APPROVED', reviewNote: note});
  assert.equal(approvedRequest.url, '/api/admin/verifications');

  reset();
  let response = await api.PATCH(request(payload));
  assert.equal(response.status, 200);
  assert.equal(documents[1].reviewNote, note);
  assert.equal(documents[1].reviewerId, 'admin');
  assert.equal(verification.status, 'APPROVED');
  assert.equal(verification.reviewNote, note, 'The final document note must survive automatic account approval');
  assert.equal(verification.reviewerId, 'admin');
  assert.equal(notices.length, 1);
  assert.equal(notices[0].userId, 'transporter');
  assert.equal(notices[0].title, 'Verification approved');

  reset();
  documents[0].status = 'PENDING';
  await api.PATCH(request(payload));
  assert.equal(verification.status, 'PENDING', 'A note cannot bypass required document approval');
  assert.equal(documents[1].reviewNote, note);

  for (const user of [null, {id: 'customer', role: 'CUSTOMER'}, {id: 'transporter', role: 'TRANSPORTER'}]) {
    reset(); actor = user;
    assert.equal((await api.PATCH(request(payload))).status, 403);
    assert.equal(documents[1].status, 'PENDING');
    assert.equal(notices.length, 0);
  }
  reset();
  assert.equal((await api.PATCH(request({...payload, reviewNote: 'x'.repeat(1001)}))).status, 400);
  assert.equal(documents[1].status, 'PENDING');
  documents[0].expiresAt = new Date('2020-01-01');
  assert.equal((await api.PATCH(request({...payload, documentId: 'insurance'}))).status, 400);

  reset(); answer = '   '; requests.length = 0;
  await reviewDocument('licence', 'APPROVED');
  const optional = JSON.parse(requests.find(r => r.options?.method === 'PATCH').options.body);
  assert.equal(Object.hasOwn(optional, 'reviewNote'), false);
  assert.equal((await api.PATCH(request(optional))).status, 200);
  assert.equal(verification.status, 'APPROVED');
  assert.equal(verification.reviewNote, null);
  console.log('PASS: approval notes reach document and automatic account approval; Cancel sends no review; notes remain optional; admin role, note length and required/expired-document guards remain enforced.');
}
main().catch(error => {console.error(error); process.exitCode = 1;});
