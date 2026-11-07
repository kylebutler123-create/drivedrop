// Isolated tests: no database, network, credentials, email or payment calls.
const {test, afterEach} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const swc = require('next/dist/build/swc');
const root = path.resolve(__dirname, '..');
const token = 'ddm_' + 'a'.repeat(64);
const user = {id: 'customer-a', role: 'CUSTOMER', accountStatus: 'ACTIVE', name: 'Customer', email: 'customer@example.invalid', passwordHash: 'hash', workRestricted: false};
const session = {id: 'session-a', userId: user.id, tokenHash: 'hash', expiresAt: new Date(Date.now() + 60000), user};
function harness(overrides = {}) {
  const calls = [];
  const prisma = {
    session: {
      findUnique: async args => {calls.push(['session.findUnique', args]); return session;},
      findMany: async () => [],
      create: async args => {calls.push(['session.create', args]); return args.data;},
      deleteMany: async args => {calls.push(['session.deleteMany', args]); return {count: 1};},
    },
    user: {findUnique: async args => {calls.push(['user.findUnique', args]); return user;}},
    booking: {findMany: async args => {calls.push(['booking.findMany', args]); return [];}},
    $queryRaw: async (...args) => {calls.push(['notifications', args]); return [];},
    ...overrides,
  };
  prisma.$transaction = async fn => fn(prisma);
  const cache = new Map();
  function load(file) {
    file = path.resolve(root, file);
    if (!path.extname(file)) file += '.ts';
    if (cache.has(file)) return cache.get(file).exports;
    const module = {exports: {}}; cache.set(file, module);
    const {code} = swc.transformSync(fs.readFileSync(file, 'utf8'), {filename: file, jsc: {parser: {syntax: 'typescript'}, target: 'es2022'}, module: {type: 'commonjs'}});
    function localRequire(name) {
      if (name === '@/lib/prisma' || name === './prisma') return {prisma};
      if (name === 'bcryptjs') return {compare: async password => password === 'correct'};
      if (name === '@/lib/rate-limit') return {checkRateLimit: () => ({allowed: true}), rateLimitResponse: () => new Response('', {status: 429})};
      if (name.startsWith('@/')) return load('src/' + name.slice(2));
      if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name));
      return require(name);
    }
    new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
    return module.exports;
  }
  return {load, calls, prisma};
}
afterEach(() => {delete process.env.MOBILE_APP_ENABLED; delete process.env.EXPO_PUBLIC_API_ORIGIN;});
const request = (endpoint, body, authenticated = true) => new Request(`https://drive-drop.com/api/mobile/${endpoint}`, {
  method: body === undefined ? 'GET' : 'POST', headers: {'content-type': 'application/json', ...(authenticated ? {authorization: `Bearer ${token}`} : {})},
  ...(body === undefined ? {} : {body: JSON.stringify(body)}),
});

test('mobile tokens and web destinations reject credential leaks and role escalation', () => {
  const {mobileBearer, mobileWebPath} = harness().load('src/lib/mobile-policy.ts');
  assert.equal(mobileBearer(`Bearer ${token}`), token);
  for (const value of [null, token, `Bearer ${'a'.repeat(64)}`, `Bearer ${token} extra`]) assert.equal(mobileBearer(value), null);
  for (const value of ['https://evil.invalid/account', '//evil.invalid/account', '/\\evil.invalid/account', '/api/auth/logout', '/admin', '/account?token=secret', '/account#secret']) assert.equal(mobileWebPath(value, 'CUSTOMER'), null);
  assert.equal(mobileWebPath('/transporter/proceeds', 'CUSTOMER'), null);
  assert.equal(mobileWebPath('/account', 'ADMIN'), null);
  assert.equal(mobileWebPath('/customer?view=bookings&bookingId=a', 'CUSTOMER'), '/customer?view=bookings&bookingId=a');
});

test('disabled native endpoints return 503 without database access', async () => {
  const {load, calls} = harness();
  for (const [endpoint, method] of [['login', 'POST'], ['logout', 'POST'], ['overview', 'GET'], ['open-web', 'POST']]) {
    const response = await load(`src/app/api/mobile/${endpoint}/route.ts`)[method](request(endpoint, method === 'POST' ? {} : undefined));
    assert.equal(response.status, 503);
    assert.match(response.headers.get('cache-control'), /no-store/);
  }
  assert.equal(calls.length, 0);
});

test('login rejects wrong passwords, inactive users and administrator accounts', async () => {
  process.env.MOBILE_APP_ENABLED = 'true';
  for (const [candidate, password, status] of [[user, 'wrong', 401], [{...user, accountStatus: 'SUSPENDED'}, 'correct', 403], [{...user, role: 'ADMIN'}, 'correct', 403]]) {
    const h = harness({user: {findUnique: async () => candidate}});
    const response = await h.load('src/app/api/mobile/login/route.ts').POST(request('login', {email: user.email, password}, false));
    assert.equal(response.status, status);
    assert.equal(h.calls.some(call => call[0] === 'session.create'), false);
  }
});

test('login stores only a token hash and returns a revocable expiring native credential', async () => {
  process.env.MOBILE_APP_ENABLED = 'true';
  const h = harness();
  const response = await h.load('src/app/api/mobile/login/route.ts').POST(request('login', {email: user.email, password: 'correct'}, false));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.match(body.token, /^ddm_[a-f0-9]{64}$/);
  assert.ok(Date.parse(body.expiresAt) > Date.now());
  const stored = h.calls.find(call => call[0] === 'session.create')[1].data;
  assert.notEqual(stored.tokenHash, body.token);
  assert.match(stored.tokenHash, /^[a-f0-9]{64}$/);
  assert.equal(stored.token, undefined);
  assert.equal(response.headers.get('set-cookie'), null);
});

test('session lookup denies expired, suspended and administrator users', async () => {
  for (const invalid of [{...session, expiresAt: new Date(0)}, {...session, user: {...user, accountStatus: 'DELETED'}}, {...session, user: {...user, role: 'ADMIN'}}]) {
    const h = harness({session: {findUnique: async () => invalid}});
    assert.equal(await h.load('src/lib/mobile-auth.ts').mobileSession(token), null);
  }
  const h = harness();
  assert.equal(await h.load('src/lib/mobile-auth.ts').mobileSession('malformed'), null);
  assert.equal(h.calls.length, 0);
});

test('overview is scoped to the signed-in customer and excludes financial/provider data', async () => {
  process.env.MOBILE_APP_ENABLED = 'true';
  const h = harness();
  const response = await h.load('src/app/api/mobile/overview/route.ts').GET(request('overview'));
  assert.equal(response.status, 200);
  const query = h.calls.find(call => call[0] === 'booking.findMany')[1];
  assert.equal(query.where.customerId, user.id);
  assert.equal(query.take, 50);
  assert.equal(query.select.payment, undefined);
  assert.equal(query.select.agreedPricePence, undefined);
  const body = await response.json();
  assert.equal(body.version, 1);
  assert.equal(body.user.passwordHash, undefined);
  assert.equal(body.user.id, user.id);
});

test('overview rejects cookie-only authentication', async () => {
  process.env.MOBILE_APP_ENABLED = 'true';
  const h = harness();
  const response = await h.load('src/app/api/mobile/overview/route.ts').GET(new Request('https://drive-drop.com/api/mobile/overview', {headers: {cookie: `drivedrop_session=${token}`}}));
  assert.equal(response.status, 401);
  assert.equal(h.calls.length, 0);
});

test('web handoff is POST-only, role-bound, no-store and never puts a token in the URL', async () => {
  process.env.MOBILE_APP_ENABLED = 'true';
  const module = harness().load('src/app/api/mobile/open-web/route.ts');
  assert.equal(module.GET, undefined);
  const response = await module.POST(new Request('https://drive-drop.com/api/mobile/open-web', {
    method: 'POST', headers: {'content-type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams({token, path: '/customer?view=bookings'}),
  }));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), 'https://drive-drop.com/customer?view=bookings');
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/i); assert.match(cookie, /Secure/); assert.match(cookie, /SameSite=lax/i);
  assert.match(response.headers.get('cache-control'), /no-store/);
  const blocked = await module.POST(new Request('https://drive-drop.com/api/mobile/open-web', {method: 'POST', headers: {'content-type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams({token, path: 'https://evil.invalid/'})}));
  assert.equal(blocked.status, 400); assert.equal(blocked.headers.get('set-cookie'), null);
});

test('logout revokes only the supplied native session', async () => {
  process.env.MOBILE_APP_ENABLED = 'true';
  const h = harness();
  await h.load('src/app/api/mobile/logout/route.ts').POST(request('logout', {}));
  const condition = h.calls.find(call => call[0] === 'session.deleteMany')[1].where;
  assert.deepEqual(Object.keys(condition), ['tokenHash']);
  assert.equal(condition.tokenHash, h.load('src/lib/mobile-auth.ts').hashMobileToken(token));
});

test('web handoff refuses cross-site login CSRF before looking up a session', async () => {
  process.env.MOBILE_APP_ENABLED = 'true';
  const h = harness();
  const response = await h.load('src/app/api/mobile/open-web/route.ts').POST(new Request('https://drive-drop.com/api/mobile/open-web', {
    method: 'POST', headers: {'content-type': 'application/x-www-form-urlencoded', origin: 'https://evil.invalid', 'sec-fetch-site': 'cross-site'},
    body: new URLSearchParams({token, path: '/customer'}),
  }));
  assert.equal(response.status, 403); assert.equal(h.calls.length, 0);
});

test('native links reject javascript, misleading Stripe hosts and foreign origins', () => {
  const {navigationKind, mapUrl, webPath} = harness().load('mobile/src/lib/links.ts');
  assert.equal(navigationKind('https://drive-drop.com/customer'), 'internal');
  assert.equal(navigationKind('https://checkout.stripe.com/c/pay/abc'), 'external');
  for (const value of ['javascript:alert(1)', 'http://drive-drop.com', 'https://checkout.stripe.com.evil.invalid', 'https://drive-drop.com@evil.invalid', 'file:///secret', 'intent://anything']) assert.equal(navigationKind(value), 'blocked');
  assert.equal(webPath('//evil.invalid/account'), null);
  assert.equal(webPath('/api/auth/logout'), null);
  assert.equal(mapUrl('A & B, UK', 'ios'), 'https://maps.apple.com/?daddr=A%20%26%20B%2C%20UK&dirflg=d');
});

test('native origin configuration rejects arbitrary hosts before credentials can be used', () => {
  for (const value of ['http://drive-drop.com', 'https://evil.invalid', 'https://drive-drop.com/path', 'https://user:secret@drive-drop.com']) {
    process.env.EXPO_PUBLIC_API_ORIGIN = value;
    assert.throws(() => harness().load('mobile/src/lib/links.ts'), /canonical DriveDrop HTTPS/);
  }
});
