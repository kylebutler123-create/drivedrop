// Read-only HTTP checks. No accounts, bookings or financial requests are created.
// Usage: node scripts/check-seo.mjs http://127.0.0.1:3107 moveamotor.co.uk
import assert from 'node:assert/strict';
import {request as httpRequest} from 'node:http';
import {request as httpsRequest} from 'node:https';

const base = process.argv[2] || 'https://moveamotor.co.uk';
const host = process.argv[3];
const origin = 'https://moveamotor.co.uk';
const pages = ['/', '/get-quotes', '/for-customers', '/for-transporters', '/how-it-works', '/about', '/help', '/contact', '/terms', '/privacy'];
const privatePages = ['/login', '/register', '/forgot-password', '/reset-password', '/account', '/customer', '/transporter', '/admin', '/messages', '/payments', '/notifications'];
const decode = value => value.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"');
const tags = (html, tag) => [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'gi'))].map(match => Object.fromEntries([...match[0].matchAll(/([\w:-]+)="([^"]*)"/g)].map(a => [a[1], decode(a[2])])));
const canonical = path => `${origin}${path === '/' ? '' : path}`;
async function read(path, requestHost = host) {
  if (requestHost) {
    // Node fetch does not reliably preserve an explicit Host override. Use the
    // HTTP client to exercise Next's canonical-host header rules locally.
    return new Promise((resolve, reject) => {
      const url = new URL(path, base);
      const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, {
        headers: {host: requestHost, 'user-agent': 'Googlebot'},
      }, response => {
        let html = '';
        response.setEncoding('utf8');
        response.on('data', chunk => { html += chunk; });
        response.on('end', () => resolve({response: {
          status: response.statusCode,
          headers: new Headers(Object.entries(response.headers).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)])),
        }, html}));
        response.on('error', reject);
      });
      request.setTimeout(30_000, () => request.destroy(new Error('HTTP check timed out')));
      request.on('error', reject);
      request.end();
    });
  }
  const response = await fetch(`${base}${path}`, {
    headers: {'user-agent': 'Googlebot', ...(requestHost ? {host: requestHost} : {})},
    redirect: 'manual',
    signal: AbortSignal.timeout(30_000),
  });
  return {response, html: await response.text()};
}

const titles = new Set();
const descriptions = new Set();
for (const path of pages) {
  const {response, html} = await read(path);
  assert.equal(response.status, 200, path);
  assert(!response.headers.get('x-robots-tag')?.includes('noindex'), `${path}: canonical host must be indexable`);
  const metas = tags(html, 'meta');
  const title = decode(html.match(/<title>([^<]+)<\/title>/)?.[1] || '');
  const description = metas.find(m => m.name === 'description')?.content;
  assert(title.includes('MoveAMotor') && !titles.has(title), `${path}: descriptive, unique title`);
  assert(description?.length > 80 && !descriptions.has(description), `${path}: unique description`);
  titles.add(title); descriptions.add(description);
  assert.equal(tags(html, 'link').filter(l => l.rel === 'canonical').length, 1, path);
  assert.equal(tags(html, 'link').find(l => l.rel === 'canonical')?.href, canonical(path), path);
  assert(metas.some(m => m.name === 'robots' && /(^|,\s*)index(,|$)/.test(m.content)), `${path}: index directive`);
  assert(!metas.some(m => /robots|googlebot/.test(m.name || '') && m.content?.includes('noindex')), `${path}: no conflicting noindex`);
  assert.equal(metas.find(m => m.property === 'og:url')?.content, canonical(path), path);
  assert(metas.some(m => m.name === 'twitter:card'), `${path}: share metadata`);
  assert.match(html, /<html[^>]*lang="en-GB"/);
  if (path === '/') {
    assert(metas.some(m => m.name === 'google-site-verification' && m.content), 'Google ownership tag');
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)?.[1] || '{}');
    assert.equal(graph['@context'], 'https://schema.org');
    assert(graph['@graph']?.some(n => n['@type'] === 'WebSite' && n.url === origin && n.name === 'MoveAMotor'));
    assert(graph['@graph']?.some(n => n['@type'] === 'Organization' && n.url === origin));
    assert(!JSON.stringify(graph).match(/aggregateRating|reviewCount|ratingValue/), 'No invented review schema');
  }
}
for (const path of privatePages) {
  let {response, html} = await read(path);
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    const location = new URL(response.headers.get('location'), base);
    assert.equal(location.pathname, '/login', `${path}: existing login gate`);
    ({response, html} = await read(location.pathname + location.search));
  }
  assert(response.status < 500, path);
  assert(tags(html, 'meta').some(m => m.name === 'robots' && m.content?.includes('noindex')), `${path}: noindex`);
  assert(!tags(html, 'link').some(l => l.rel === 'canonical'), `${path}: no homepage canonical inherited`);
}
const robots = await read('/robots.txt');
assert.equal(robots.response.status, 200);
assert.match(robots.html, /Allow: \/\s/);
assert(!/Disallow: \/\s/.test(robots.html), 'Production not blocked');
assert(robots.html.includes(`${origin}/sitemap.xml`));
const sitemap = await read('/sitemap.xml');
assert.equal(sitemap.response.status, 200);
const urls = [...sitemap.html.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
assert.deepEqual(urls.sort(), pages.map(canonical).sort(), 'Only canonical public pages in sitemap');
assert(!sitemap.html.includes('<lastmod>'), 'No invented modification timestamps');
for (const path of ['/?view=customer', '/?view=transporter']) {
  const {html} = await read(path);
  assert.equal(tags(html, 'link').find(l => l.rel === 'canonical')?.href, origin);
}
for (const path of ['/api/health', '/orange-design-preview/index.html', '/desktop-design-proposal/index.html']) {
  const {response} = await read(path);
  assert(response.headers.get('x-robots-tag')?.includes('noindex'), `${path}: response noindex`);
}
if (host) {
  const {response} = await read('/', 'drivedrop-pink.vercel.app');
  assert.equal(response.status, 200, 'Aliases remain usable');
  assert(response.headers.get('x-robots-tag')?.includes('noindex'), 'Alternate hosts excluded from search');
}
console.log(JSON.stringify({result: 'PASS', public_pages: pages.length, private_routes: privatePages.length, sitemap: urls.length, query_canonicals: 2, structured_data: true, response_headers: true}));
