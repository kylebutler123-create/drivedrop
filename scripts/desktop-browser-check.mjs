/**
 * PUBLIC-PAGE checks against the actual built Next.js application.
 * No login, outbound messages, production credentials or database writes.
 * Authenticated workflows and external storage/payment integrations are NOT tested here.
 */
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir, writeFile, readFile, stat} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const baseline = process.argv[2];
if (!baseline || !path.isAbsolute(baseline)) throw new Error('An absolute baseline checkout path is required.');
await stat(path.join(baseline, '.next', 'BUILD_ID'));
const out = path.join(root, 'browser-evidence');
await mkdir(out, {recursive: true});
const results = [];
const servers = [];
const streams = [];
const record = (name, passed, detail = '') => {
  results.push({name, status: passed ? 'PASS' : 'FAIL', detail});
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const urls = {baseline: 'http://127.0.0.1:3300', updated: 'http://127.0.0.1:3301'};
const oldRoutes = ['/', '/login?account=customer', '/login?account=transporter', '/register?account=customer', '/register?account=transporter', '/forgot-password', '/reset-password', '/terms', '/privacy'];
const newRoutes = ['/get-quotes', '/how-it-works', '/for-customers', '/for-transporters', '/about', '/help', '/contact'];
const slug = value => value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';
const hash = buffer => createHash('sha256').update(buffer).digest('hex');

async function launchServer(name, cwd, port) {
  const log = createWriteStream(path.join(out, `${name}-server.log`));
  streams.push(log);
  const child = spawn(process.execPath, [path.join(cwd, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)], {
    cwd, stdio: ['ignore', 'pipe', 'pipe'], env: {...process.env, NODE_ENV: 'production', VERCEL_ENV: 'preview', NEXT_TELEMETRY_DISABLED: '1'},
  });
  child.stdout.pipe(log); child.stderr.pipe(log); servers.push(child);
  child.on('error', error => record(`${name}: server startup`, false, error.message));
  const until = Date.now() + 90000;
  while (Date.now() < until) {
    if (child.exitCode !== null) throw new Error(`${name} server exited with code ${child.exitCode}`);
    try {const response = await fetch(`http://127.0.0.1:${port}/`, {signal: AbortSignal.timeout(5000)}); if (response.ok) return;} catch {}
    await new Promise(resolve => setTimeout(resolve, 800));
  }
  throw new Error(`${name} server did not become ready within 90 seconds`);
}

async function open(browser, base, route, width) {
  const context = await browser.newContext({viewport: {width, height: 1000}, locale: 'en-GB', timezoneId: 'Europe/London', reducedMotion: 'reduce', deviceScaleFactor: 1});
  // No third-party websites are contacted by a browser check.
  await context.route('**/*', async request => {
    const value = new URL(request.request().url());
    if (value.hostname === '127.0.0.1' || ['data:', 'blob:', 'about:'].includes(value.protocol)) return request.continue();
    return request.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto(base + route, {waitUntil: 'networkidle', timeout: 45000});
  await page.evaluate(async () => {
    await document.fonts.ready;
    // Settle lazy images as well, so an unloaded baseline image is not compared to a loaded one.
    await Promise.all(Array.from(document.images, image => {
      image.loading = 'eager';
      return image.decode().catch(() => {});
    }));
  });
  await page.mouse.move(0, 0);
  return {context, page, errors, response};
}

let browser;
try {
  await launchServer('baseline', baseline, 3300);
  await launchServer('updated', root, 3301);
  browser = await chromium.launch({headless: true});
  const versions = {};
  for (const item of ['next', 'react', 'playwright']) versions[item] = JSON.parse(await readFile(path.join(root, 'node_modules', item, 'package.json'), 'utf8')).version;
  await writeFile(path.join(out, 'versions.json'), JSON.stringify(versions, null, 2));

  for (const width of [375, 390, 430, 760]) {
    for (const route of oldRoutes) {
      const screenshots = {};
      for (const name of ['baseline', 'updated']) {
        const view = await open(browser, urls[name], route, width);
        const metrics = await view.page.evaluate(() => ({width: innerWidth, scrollWidth: document.documentElement.scrollWidth}));
        record(`${name} ${width}px ${route}: HTTP`, view.response?.status() === 200, String(view.response?.status()));
        record(`${name} ${width}px ${route}: client errors`, view.errors.length === 0, view.errors.join(' | '));
        // Record rather than conceal any pre-existing overflow.
        record(`${name} ${width}px ${route}: no horizontal overflow`, metrics.scrollWidth <= width, JSON.stringify(metrics));
        screenshots[name] = await view.page.screenshot({fullPage: true, animations: 'disabled', caret: 'hide'});
        await writeFile(path.join(out, `${name}-${width}-${slug(route)}.png`), screenshots[name]);
        await view.context.close();
      }
      record(`MOBILE UNCHANGED ${width}px ${route}`, hash(screenshots.baseline) === hash(screenshots.updated), 'Exact screenshot hash comparison; baseline ' + process.env.BASELINE_REF);
    }
  }

  for (const width of [761, 1024, 1280, 1440, 1920]) {
    for (const route of [...oldRoutes, ...newRoutes]) {
      const view = await open(browser, urls.updated, route, width);
      const metrics = await view.page.evaluate(() => ({width: innerWidth, scrollWidth: document.documentElement.scrollWidth}));
      record(`DESKTOP ${width}px ${route}: HTTP`, view.response?.status() === 200, String(view.response?.status()));
      record(`DESKTOP ${width}px ${route}: client errors`, view.errors.length === 0, view.errors.join(' | '));
      record(`DESKTOP ${width}px ${route}: no horizontal overflow`, metrics.scrollWidth <= width, JSON.stringify(metrics));
      record(`DESKTOP ${width}px ${route}: navigation visible`, await view.page.locator('.desktopPublicHeader').isVisible());
      if (width === 1440 || route === '/' || route === '/get-quotes') await view.page.screenshot({path: path.join(out, `desktop-${width}-${slug(route)}.png`), fullPage: true, animations: 'disabled', caret: 'hide'});
      await view.context.close();
    }
  }

  const view = await open(browser, urls.updated, '/get-quotes', 1440);
  for (const selector of ['#home-quote-vehicle-type', '#home-quote-make', '#home-quote-model', '#home-quote-registration', '#home-quote-running', '.homeQuoteDateButton', '#home-quote-transport-type', '#home-quote-name', '#home-quote-phone', '#home-quote-email', '#home-quote-password']) {
    record(`Quote form: ${selector} visible`, await view.page.locator(selector).isVisible());
  }
  record('Quote form: vehicle placeholder', await view.page.locator('#home-quote-vehicle-type').inputValue() === '');
  record('Quote form: transport placeholder', await view.page.locator('#home-quote-transport-type').inputValue() === '');
  await view.page.locator('#home-quote-transport-type').selectOption('ENCLOSED');
  await view.page.locator('#home-quote-vehicle-type').selectOption('Van');
  record('Quote form: incompatible vehicle remains selected', await view.page.locator('#home-quote-vehicle-type').inputValue() === 'Van');
  record('Quote form: enclosed compatibility warning', await view.page.locator('.homeQuoteCompatibility').isVisible());
  await view.page.locator('#home-quote-vehicle-type').selectOption('Car');
  record('Quote form: compatible vehicle removes warning', await view.page.locator('.homeQuoteCompatibility').count() === 0);
  await view.page.locator('.homeQuoteDateButton').click();
  record('Quote form: calendar opens', await view.page.getByRole('dialog', {name: 'Choose collection date'}).isVisible());
  await view.page.keyboard.press('Escape');
  record('Quote form: calendar closes on Escape', await view.page.getByRole('dialog', {name: 'Choose collection date'}).count() === 0);
  await view.page.screenshot({path: path.join(out, 'desktop-quote-form-checked.png'), fullPage: true, animations: 'disabled', caret: 'hide'});
  await view.context.close();

  const help = await open(browser, urls.updated, '/help', 1440);
  const question = help.page.locator('.informationHelp details').first();
  await question.locator('summary').click();
  record('FAQ opens', await question.getAttribute('open') !== null);
  await question.locator('summary').click();
  record('FAQ closes', await question.getAttribute('open') === null);
  await help.context.close();

  const home = await open(browser, urls.updated, '/', 1440);
  await home.page.locator('.desktopPublicHeader').getByRole('link', {name: 'Get a Quote', exact: true}).click();
  await home.page.waitForURL('**/get-quotes');
  record('Header Get a Quote navigates to working request form', await home.page.locator('#home-quote-make').isVisible());
  await home.context.close();
} catch (error) {
  record('Browser suite execution', false, error.stack || error.message);
} finally {
  if (browser) await browser.close();
  for (const child of servers) child.kill('SIGTERM');
  for (const stream of streams) stream.end();
  const report = {
    scope: 'Actual Next.js public pages, native controls and client validation. No authenticated workflows or real database/storage/payment integration tested.',
    baseline: process.env.BASELINE_REF,
    commit: process.env.GITHUB_SHA || 'local',
    pass: results.filter(item => item.status === 'PASS').length,
    fail: results.filter(item => item.status === 'FAIL').length,
    results,
  };
  await writeFile(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
  const summary = `# DriveDrop browser checks\n\n${report.pass} passed; ${report.fail} failed.\n\n${report.scope}\n\n` + results.filter(item => item.status === 'FAIL').map(item => `- ${item.name}: ${item.detail}`).join('\n');
  await writeFile(path.join(out, 'summary.md'), summary);
  if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, summary);
  if (report.fail) process.exitCode = 1;
}
