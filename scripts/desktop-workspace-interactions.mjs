/** Extra desktop interactions use existing controls with isolated CI sessions. */
import {writeFile} from 'node:fs/promises';
import path from 'node:path';

export async function checkWorkspaceInteractions({browser, base, states, out, record}) {
  for (const role of ['customer', 'transporter', 'admin']) {
    const context = await browser.newContext({storageState: states[`updated-${role}`], viewport: {width: 1440, height: 1000}, locale: 'en-GB', timezoneId: 'Europe/London', reducedMotion: 'reduce', deviceScaleFactor: 1});
    context.setDefaultTimeout(15000);
    await context.route('**/*', req => {
      const u = new URL(req.request().url());
      return ['localhost', '127.0.0.1'].includes(u.hostname) || ['data:', 'blob:', 'about:'].includes(u.protocol) ? req.continue() : req.abort();
    });
    const page = await context.newPage();
    const check = async (name, callback) => {
      try {
        await callback();
        await page.screenshot({path: path.join(out, `interaction-${role}-${name}.png`), fullPage: true, animations: 'disabled', caret: 'hide'});
      } catch (error) {
        record(`${role} interaction ${name}`, false, error.message);
        await page.screenshot({path: path.join(out, `error-interaction-${role}-${name}.png`), fullPage: true}).catch(() => {});
      }
    };
    try {
      if (role === 'admin' || role === 'transporter') {
        await check('dashboard-counter-contrast', async () => {
          await page.goto(base + '/' + role, {waitUntil: 'domcontentloaded'});
          const selector = role === 'admin' ? '.adminOverview .adminStat strong, .adminOverview .adminStat small' : '.transporterHero .dashboardSummary strong, .transporterHero .dashboardSummary > * > span:not(.dashboardSummaryActivity)';
          await page.locator(selector).first().waitFor({state: 'visible'});
          if (role === 'transporter') await page.waitForFunction(() => document.querySelector('[data-booked-proceeds-summary] strong')?.textContent !== '—');
          const contrasts = await page.locator(selector).evaluateAll(elements => {
            const rgb = value => (value.match(/[\d.]+/g) || []).map(Number);
            const luminance = values => values.slice(0, 3).map(v => {const s = v / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;}).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
            return elements.map(element => {
              const text = getComputedStyle(element).color;
              let parent = element, background = [255,255,255];
              while (parent) {
                const candidate = rgb(getComputedStyle(parent).backgroundColor);
                if (candidate.length === 3 || candidate[3] === 1) {background = candidate; break;}
                parent = parent.parentElement;
              }
              const a = luminance(rgb(text)), b = luminance(background);
              return {text: element.textContent, ratio: (Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
            });
          });
          record(`${role}: dashboard counter text contrast at least 4.5:1`, contrasts.length > 0 && contrasts.every(item => item.ratio >= 4.5), JSON.stringify(contrasts));
        });
      }
      await check('conversation', async () => {
        await page.goto(base + '/messages', {waitUntil: 'domcontentloaded'});
        await page.locator('.conversationCard').first().click();
        const pane = page.locator('.inlineConversationPanel');
        await pane.locator('.messageComposer textarea').waitFor({state: 'visible'});
        record(`${role}: one conversation composer`, await page.locator('.messageComposer textarea').count() === 1);
        const panelBox = await pane.boundingBox();
        const inboxBox = await page.locator('.conversationCard').first().boundingBox();
        record(`${role}: desktop conversation beside inbox`, Boolean(panelBox && inboxBox && panelBox.x >= inboxBox.x + inboxBox.width && panelBox.x + panelBox.width <= 1441));
        await pane.locator('.messageComposer textarea').fill('Unsent isolated layout check');
        record(`${role}: composer accepts text`, await pane.locator('.messageComposer textarea').inputValue() === 'Unsent isolated layout check');
        await pane.locator('.messageComposer textarea').fill('');
        record(`${role}: delete conversation control remains`, await pane.getByRole('button', {name: 'Delete conversation', exact: true}).isVisible());
      });
      if (role === 'customer') {
        await check('expanded-delivery', async () => {
          await page.goto(base + '/customer?view=bookings', {waitUntil: 'domcontentloaded'});
          const card = page.locator('.bookingCard[data-booking-id="ci-booking-active"]');
          await card.locator('.customerCardToggle').click();
          record('Customer: booking details expand', await card.locator('.customerCardToggle').getAttribute('aria-expanded') === 'true');
          record('Customer: message transporter visible', await card.locator('.customerMessageTransporter').isVisible());
          record('Customer: call transporter visible', await card.locator('.customerCallTransporter').isVisible());
        });
      }
      if (role === 'transporter') {
        await check('collection-form', async () => {
          await page.goto(base + '/transporter?view=deliveries', {waitUntil: 'domcontentloaded'});
          const card = page.locator('.transporterBooking[data-booking-id="ci-booking-active"]');
          await card.getByRole('button', {name: 'Complete collection', exact: true}).click();
          record('Transporter: collection signature available', await card.locator('[data-poc] canvas').isVisible());
          record('Transporter: collection photos available', await card.locator('[data-poc] input[type="file"]').isVisible());
          record('Transporter: collection confirmation available', await card.locator('[data-poc] input[type="checkbox"]').isVisible());
        });
        await check('delivery-form', async () => {
          await page.goto(base + '/transporter?view=deliveries', {waitUntil: 'domcontentloaded'});
          const card = page.locator('.transporterBooking[data-booking-id="ci-booking-transit"]');
          await card.getByRole('button', {name: 'Complete delivery', exact: true}).click();
          record('Transporter: delivery signature available', await card.locator('.podMount canvas').isVisible());
          record('Transporter: delivery photos available', await card.locator('.podMount input[type="file"]').isVisible());
          record('Transporter: optional location button available', await card.getByRole('button', {name: 'Share delivery location', exact: true}).isVisible());
          record('Transporter: location not captured automatically', await card.locator('.podLocationSuccess').count() === 0);
        });
      }
      if (role === 'admin') {
        for (const title of ['User manager','Transporter verification','Dispute management','Bookings & deliveries']) {
          await check(`rail-${title.toLowerCase().replace(/[^a-z]+/g,'-')}`, async () => {
            await page.goto(base + '/admin', {waitUntil: 'domcontentloaded'});
            const rail = page.locator('.adminWorkspace .adminSectionGrid');
            const button = rail.getByRole('button').filter({hasText: title});
            await button.click();
            record(`Admin: existing rail opens ${title}`, await button.getAttribute('aria-pressed') === 'true');
            const sidebar = await rail.boundingBox();
            const content = await page.locator('.adminWorkspaceContent').boundingBox();
            record(`Admin: ${title} content does not overlap rail`, Boolean(sidebar && content && content.x >= sidebar.x + sidebar.width && content.x + content.width <= 1441));
          });
        }
      }
    } finally {
      await context.close();
    }
  }
  await writeFile(path.join(out, 'interaction-scope.txt'), 'These checks open existing forms and conversations using isolated CI fixture accounts. They do not submit evidence, capture location, send messages or change live user data.\n');
}
