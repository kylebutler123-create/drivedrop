const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const swc = require('next/dist/build/swc');
const {randomUUID} = require('node:crypto');

function load(relative, stubs = {}) {
  const file = path.resolve(relative);
  const moduleUnderTest = new Module(file, module);
  moduleUnderTest.filename = file;
  moduleUnderTest.paths = module.paths;
  const original = moduleUnderTest.require.bind(moduleUnderTest);
  moduleUnderTest.require = id => id in stubs ? stubs[id] : original(id);
  moduleUnderTest._compile(swc.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file,
    jsc: {parser: {syntax: 'typescript', tsx: true}, target: 'es2020', transform: {react: {runtime: 'automatic'}}},
    module: {type: 'commonjs'},
  }).code, file);
  return moduleUnderTest.exports;
}

async function main() {
  const envNames = ['RESEND_API_KEY', 'VERCEL_ENV', 'TRANSACTIONAL_EMAILS_ENABLED', 'TRANSACTIONAL_EMAILS_SENDER_VERIFIED', 'NEXT_PUBLIC_APP_URL'];
  const savedEnv = Object.fromEntries(envNames.map(key => [key, process.env[key]]));
  const originalFetch = global.fetch;
  const originalError = console.error;
  const requests = [];
  const logs = [];
  let providerFailure = false;
  let providerInvalidReply = false;
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails', 'Only the expected mocked email provider may be contacted');
    requests.push({body: JSON.parse(options.body), headers: options.headers});
    if (providerFailure) throw new Error('Simulated provider timeout');
    return Response.json(providerInvalidReply ? {} : {id: 'mock-email-id'});
  };
  console.error = (...args) => logs.push(args);

  try {
    process.env.RESEND_API_KEY = 'mock-not-a-real-key';
    process.env.VERCEL_ENV = 'preview';
    delete process.env.TRANSACTIONAL_EMAILS_ENABLED;
    delete process.env.TRANSACTIONAL_EMAILS_SENDER_VERIFIED;
    const runtime = load('src/lib/payment-runtime.ts', {'./availability-error': load('src/lib/availability-error.ts')});
    const mail = load('src/lib/email.ts', {'./payment-runtime': runtime});
    const details = load('src/lib/support-contact.ts');
    const enquiry = load('src/lib/contact-enquiry.ts', {'./email': mail, './support-contact': details});
    const route = load('src/app/api/contact/route.ts', {
      '@/lib/contact-enquiry': enquiry,
      '@/lib/rate-limit': load('src/lib/rate-limit.ts'),
      '@/lib/support-contact': details,
    });
    let address = 0;
    const data = {name: 'Example visitor', email: 'visitor@example.test', enquiry: 'General enquiry', bookingReference: '', subject: 'A question', message: '<script>not HTML</script>\nCan you help?', website: '', requestId: randomUUID()};
    const request = (body = data, headers = {}) => new Request('https://preview.example.test/api/contact', {
      method: 'POST',
      headers: {origin: 'https://preview.example.test', 'content-type': 'application/json', 'x-forwarded-for': `192.0.2.${++address}`, ...headers},
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
    let result = await route.POST(request());
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), {sent: true});
    assert.equal(result.headers.get('cache-control'), 'no-store');
    assert.deepEqual(requests[0].body.to, ['support@drive-drop.com']);
    assert.equal(requests[0].body.reply_to, data.email);
    assert.equal(requests[0].body.from, 'DriveDrop contact form <account@contact.drive-drop.com>');
    assert.equal(requests[0].body.html, undefined);
    assert.ok(requests[0].body.text.includes(data.message));
    assert.ok(requests[0].body.text.includes('Booking reference: Not supplied'));

    await route.POST(request());
    assert.deepEqual(requests[1], requests[0], 'An unchanged retry must retain the exact provider body and idempotency key');
    const beforeRejected = requests.length;
    for (const invalid of [
      {...data, name: '   '}, {...data, message: '   '}, {...data, email: 'not-an-email'},
      {...data, email: 'person@example.test\r\nBcc: outsider@example.test'},
      {...data, subject: 'Subject\r\nBcc: outsider@example.test'},
      {...data, enquiry: 'not a valid category'}, {...data, message: 'x'.repeat(5001)},
      {...data, website: 'https://spam.example'}, {...data, requestId: 'not-a-uuid'},
      {...data, to: 'outsider@example.test'},
    ]) assert.equal((await route.POST(request(invalid))).status, 400);
    assert.equal((await route.POST(request(data, {origin: 'https://another.example.test'}))).status, 403);
    assert.equal((await route.POST(request(data, {origin: ''}))).status, 403);
    assert.equal((await route.POST(request(data, {'content-type': 'text/plain'}))).status, 415);
    assert.equal((await route.POST(request('{broken JSON'))).status, 400);
    assert.equal((await route.POST(request('x'.repeat(32001)))).status, 413);
    assert.equal((await route.POST(request(data, {'content-length': '32001'}))).status, 413);
    assert.equal(requests.length, beforeRejected, 'Invalid, bot and cross-origin requests must not send mail');

    delete process.env.RESEND_API_KEY;
    assert.equal((await route.POST(request())).status, 503);
    process.env.RESEND_API_KEY = 'mock-not-a-real-key';
    process.env.VERCEL_ENV = 'production';
    assert.equal((await route.POST(request())).status, 503, 'Existing production email guards must remain closed');
    assert.equal(requests.length, beforeRejected);
    process.env.VERCEL_ENV = 'preview';

    providerFailure = true;
    result = await route.POST(request());
    assert.equal(result.status, 502);
    assert.equal((await result.json()).sent, undefined, 'Unconfirmed sending must not show success');
    providerFailure = false;
    providerInvalidReply = true;
    assert.equal((await route.POST(request())).status, 502);
    providerInvalidReply = false;
    assert.ok(!JSON.stringify(logs).includes(data.email));
    assert.ok(!JSON.stringify(logs).includes(data.message));

    const rateLimitedHeaders = {'x-forwarded-for': '198.51.100.1'};
    for (let i = 0; i < 5; i++) assert.equal((await route.POST(request(data, rateLimitedHeaders))).status, 200);
    const beforeLimited = requests.length;
    result = await route.POST(request(data, rateLimitedHeaders));
    assert.equal(result.status, 429);
    assert.ok(Number(result.headers.get('retry-after')) > 0);
    assert.equal(requests.length, beforeLimited);

    const React = require('react');
    const Contact = load('src/app/components/ContactDesktop.tsx', {'@/lib/support-contact': details}).default;
    const html = require('react-dom/server').renderToStaticMarkup(React.createElement(Contact));
    assert.ok(html.includes('mailto:support@drive-drop.com'));
    assert.ok(html.includes('tel:+447438285027'));
    for (const line of details.SUPPORT_CONTACT.address) assert.ok(html.includes(line));
    assert.ok(!html.includes('Opening hours'), 'Do not invent support hours');
    assert.ok(!html.includes('Message sending is not yet available'));
    console.log('PASS: fixed support recipient and visitor reply-to; unchanged retry idempotency; validation, origin, size, honeypot and rate-limit guards; disabled production email and provider failures; contact details rendered. Provider mocked: no emails, payment operations or database calls.');
  } finally {
    global.fetch = originalFetch;
    console.error = originalError;
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

main().catch(error => {console.error(error); process.exitCode = 1;});
