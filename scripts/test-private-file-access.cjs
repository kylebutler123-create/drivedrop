// Actual route handlers and validators with synthetic identity/database/storage
// adapters. No browser session, hosted data, file upload or outgoing message.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const swc = require('next/dist/build/swc');
const root = path.resolve(__dirname, '..'), passed = [];
let user = null, reads = [], queries = 0, missing = false, storageFails = false;
const jpeg = new Uint8Array([255, 216, 255, 224, 0, 0]);
const booking = {customerId:'customer', transporterId:'transporter'};
const own = (id, role) => ({id, role, accountStatus:'ACTIVE'});
const request = new Request('https://preview.example.invalid/api/private-file');
const context = {params:Promise.resolve({id:'synthetic-file'})};
const pass = name => {passed.push(name); console.log('PASS: ' + name);};
const cache = new Map();
const overrides = {
  '@/lib/auth': {currentUser:async () => user},
  '@/lib/prisma': {prisma:{
    evidence:{findUnique:async () => {queries++; return missing ? null : {booking, imageUrl:'booking/transporter/evidence.jpg'};}},
    $queryRaw:async (strings, ...values) => {
      queries++; assert.equal(values[0], 'synthetic-file');
      assert(strings.join('?').includes('JOIN "Booking"'));
      return missing ? [] : [{...booking, storagePath:'booking/customer/message.jpg', mimeType:'image/jpeg'}];
    },
  }},
  '@/lib/supabase-storage': {
    downloadEvidenceFile: p => download('delivery-evidence', p),
    downloadMessageImage: p => download('message-attachments', p),
  },
};
async function download(bucket, objectPath) {
  reads.push({bucket, objectPath});
  return storageFails ? new Response('offline-provider-detail', {status:500}) : new Response(jpeg, {headers:{'content-type':'image/jpeg'}});
}
function load(relative, mocks = overrides) {
  const file = path.resolve(root, relative);
  if (mocks === overrides && cache.has(file)) return cache.get(file);
  const out = {};
  const code = swc.transformSync(fs.readFileSync(file, 'utf8'), {
    filename:file, jsc:{parser:{syntax:'typescript'}, target:'es2022'}, module:{type:'commonjs'},
  }).code;
  new Function('exports', 'require', code)(out, name => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('@/')) return load('src/' + name.slice(2) + '.ts', mocks);
    if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name + '.ts'), mocks);
    return require(name);
  });
  if (mocks === overrides) cache.set(file, out);
  return out;
}
(async () => {
  for (const [name, route] of [
    ['delivery evidence', 'src/app/api/evidence/[id]/route.ts'],
    ['message attachment', 'src/app/api/messages/attachments/[id]/route.ts'],
  ]) {
    const api = load(route);
    user = null; reads = []; const before = queries;
    assert.equal((await api.GET(request, context)).status, 401);
    assert.equal(queries, before); assert.equal(reads.length, 0);
    for (const outsider of [own('unrelated-customer','CUSTOMER'), own('unrelated-transporter','TRANSPORTER')]) {
      user = outsider; assert.equal((await api.GET(request, context)).status, 403);
      assert.equal(reads.length, 0, 'Denied requests must not touch privileged storage');
    }
    for (const member of [own('customer','CUSTOMER'), own('transporter','TRANSPORTER'), own('admin','ADMIN')]) {
      user = member;
      const response = await api.GET(request, context);
      assert.equal(response.status, 200);
      assert.deepEqual(new Uint8Array(await response.arrayBuffer()), jpeg);
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    }
    missing = true; const count = reads.length;
    assert.equal((await api.GET(request, context)).status, 404); assert.equal(reads.length, count);
    missing = false; storageFails = true;
    const failed = await api.GET(request, context);
    assert.equal(failed.status, 502); assert(!(await failed.text()).includes('offline-provider-detail'));
    storageFails = false;
    pass(`${name}: guest/other-user denial before storage, both booking parties/admin allowed, private bytes and failure handling`);
  }

  const storage = load('src/lib/supabase-storage.ts', {});
  for (const [validator, max] of [
    ['validateEvidenceFile', storage.MAX_EVIDENCE_FILE_SIZE],
    ['validateMessageImage', storage.MAX_MESSAGE_FILE_SIZE],
    ['validateProfileImage', storage.MAX_PROFILE_FILE_SIZE],
  ]) {
    assert((await storage[validator](new File([jpeg], 'synthetic.jpg', {type:'image/jpeg'}))).ok);
    assert(!(await storage[validator](new File(['<svg/>'], 'synthetic.jpg', {type:'image/jpeg'}))).ok);
    assert(!(await storage[validator](new File([jpeg], 'synthetic.svg', {type:'image/svg+xml'}))).ok);
    assert(!(await storage[validator](new File([], 'empty.jpg', {type:'image/jpeg'}))).ok);
    assert((await storage[validator](new File([jpeg, new Uint8Array(max-jpeg.length)], 'limit.jpg', {type:'image/jpeg'}))).ok);
    assert(!(await storage[validator](new File([jpeg, new Uint8Array(max+1-jpeg.length)], 'too-large.jpg', {type:'image/jpeg'}))).ok);
  }
  pass('Delivery, message and profile validators reject spoofed MIME, SVG, empty and oversized files and accept their exact size limits');

  let selected = [], changes = [], uploads = [], removes = [], profile = true;
  const profileMocks = {
    '@/lib/auth':overrides['@/lib/auth'],
    '@/lib/prisma':{prisma:{
      $queryRawUnsafe:async (sql, id) => {
        assert(sql.includes('WHERE "transporterId" = $1')); selected.push(id);
        return profile ? [{id:'profile-' + id, profileImagePath:null, transporterPhotoPath:null, truckPhotoPath:null}] : [];
      },
      $executeRawUnsafe:async (sql, value, id) => {changes.push({sql, value, id}); return 1;},
    }},
    '@/lib/supabase-storage':{
      ...storage, uploadProfileImage:async p => uploads.push(p), removeProfileImage:async p => removes.push(p),
      profileImageUrl:p => 'https://public-profile.example.invalid/' + p,
    },
  };
  const api = load('src/app/api/account/profile-image/route.ts', profileMocks);
  const uploadRequest = (kind='logo') => {
    const body = new FormData(); body.set('kind', kind); body.set('transporterId','victim');
    body.set('file', new File([jpeg], 'synthetic.jpg', {type:'image/jpeg'}));
    return new Request('https://preview.example.invalid/api/account/profile-image', {method:'POST', body});
  };
  for (const actor of [null, own('customer','CUSTOMER'), own('admin','ADMIN')]) {
    user = actor; assert.equal((await api.POST(uploadRequest())).status, 403);
    assert.equal((await api.DELETE(request)).status, 403);
  }
  assert.equal(selected.length, 0); assert.equal(uploads.length, 0);
  user = own('transporter','TRANSPORTER');
  assert.equal((await api.POST(uploadRequest('invalid'))).status, 400);
  for (const kind of ['logo', 'transporter', 'truck']) {
    assert.equal((await api.POST(uploadRequest(kind))).status, 200);
    assert(uploads.at(-1).startsWith(`transporter/${kind}/`));
    assert.equal(changes.at(-1).id, 'profile-transporter');
  }
  assert(selected.every(id => id === 'transporter'));
  assert.equal((await api.DELETE(new Request('https://preview.example.invalid/api/account/profile-image?kind=truck&transporterId=victim'))).status, 200);
  assert.equal(changes.at(-1).id, 'profile-transporter');
  profile = false; const uploaded = uploads.length;
  assert.equal((await api.POST(uploadRequest())).status, 400); assert.equal(uploads.length, uploaded);
  pass('Public transporter profile uploads/removal stay bound to the signed-in owner, ignoring a supplied other-user ID');

  const report = {checkedAt:new Date().toISOString(), passed,
    limitations:['Identity, database and storage adapters are mocked. No browser session, hosted upload, Supabase permission or email delivery is certified.',
      'Verification, vehicle-photo and alternative-refund evidence checks remain in their existing dedicated suites.']};
  fs.writeFileSync(process.env.PRIVATE_FILE_REPORT || '/tmp/drivedrop-private-file-access.json', JSON.stringify(report, null, 2) + '\n');
})().catch(error => {console.error(error); process.exitCode=1;});
