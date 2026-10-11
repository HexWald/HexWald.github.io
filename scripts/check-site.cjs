const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'build');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' };

const server = http.createServer(async (request, response) => {
  try {
    let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname === '/') pathname = '/index.html';
    const file = path.resolve(root, `.${pathname}`);
    if (!file.startsWith(root + path.sep) || !/^\/(index\.html|styles\.css|content\.js|app\.js|favicon\.svg|assets\/.*)$/.test(pathname)) {
      response.writeHead(404).end();
      return;
    }
    const body = await fs.readFile(file);
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
});

async function run() {
  await fs.mkdir(output, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  const failures = [];
  const externalRequests = [];
  try {
    browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ru-RU' });
    await context.route('**/*', route => {
      if (route.request().url().startsWith(origin)) route.continue();
      else { externalRequests.push(route.request().url()); route.abort(); }
    });
    const page = await context.newPage();
    page.on('pageerror', error => failures.push(error.message));
    page.on('console', message => { if (message.type() === 'error') failures.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
    await page.goto(origin);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('html').getAttribute('lang'), 'ru');
    assert.equal(await page.locator('.project-card').count(), 4);
    assert.equal(await page.locator('#hero-title').innerText(), 'HexWald.');
    const socialPath = new URL(await page.locator('meta[property="og:image"]').getAttribute('content')).pathname;
    const socialResponse = await page.request.get(origin + socialPath);
    assert.equal(socialResponse.status(), 200);
    assert.equal(socialResponse.headers()['content-type'], 'image/jpeg');

    await page.locator('[data-style="Dot"][type="button"]').click();
    assert.equal(await page.locator('#crosshair').getAttribute('data-style'), 'Dot');
    await page.locator('#aim-button').click();
    assert.equal(await page.locator('#hit-count').innerText(), '01 HITS');
    await page.locator('[data-style="Cacao"][type="button"]').click();

    await page.locator('#import-button').click();
    assert.equal(await page.locator('.import-result').count(), 3);
    assert.match(await page.locator('.import-summary').innerText(), /1 дубликат/);
    await page.locator('#import-button').click();
    assert.equal(await page.locator('.import-result').count(), 3);

    await page.locator('#scanner-button').click();
    await page.waitForFunction(() => !document.getElementById('scanner-button').disabled);
    assert.match(await page.locator('#scanner-status').innerText(), /Готово/);
    assert.equal(await page.locator('.scanner-row').count(), 3);
    await page.locator('#notification-button').click();
    assert.match(await page.locator('#toast').innerText(), /уведомление показано/);

    for (const id of ['cacao', 'inserter', 'notifier', 'scanner']) {
      const trigger = page.locator(`[data-case="${id}"]`);
      await trigger.click();
      assert.equal(await page.locator('#case-dialog').evaluate(dialog => dialog.open), true);
      assert.equal(await page.locator('#case-sections section').count(), 3);
      assert.match(await page.locator('#case-source').getAttribute('href'), /^https:\/\/github\.com\/HexWald\//);
      await page.keyboard.press('Escape');
      assert.equal(await trigger.evaluate(button => button === document.activeElement), true);
    }

    await page.keyboard.press('Control+k');
    assert.equal(await page.locator('#command-dialog').evaluate(dialog => dialog.open), true);
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator('[data-jump="details"]').evaluate(button => button === document.activeElement), true);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !document.getElementById('command-dialog').open);
    assert.equal(new URL(page.url()).hash, '#details');
    await page.keyboard.press('Control+k');
    await page.keyboard.press('Escape');

    await page.locator('#language-button').click();
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.match(await page.locator('.import-summary').innerText(), /1 duplicate/);
    assert.match(await page.locator('#scanner-status').innerText(), /Done/);
    await page.reload();
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    await page.locator('[data-case="cacao"]').click();
    assert.equal(await page.locator('#case-sections h3').first().innerText(), 'Inside the client');
    await page.keyboard.press('Escape');

    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('[data-copy="https://github.com/HexWald"]').click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'https://github.com/HexWald');
    assert.equal(await page.locator('#toast').innerText(), 'Link copied');
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } }));
    await page.locator('[data-copy="https://t.me/msketch_all"]').click();
    assert.match(await page.locator('#toast').innerText(), /https:\/\/t\.me\/msketch_all/);

    for (const width of [320, 375, 650, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(100);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false, `Horizontal overflow at ${width}px`);
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.locator('#menu-button').click();
    assert.equal(await page.locator('#mobile-nav').isVisible(), true);
    await page.locator('#mobile-nav a[href="#projects"]').click();
    assert.equal(await page.locator('#mobile-nav').isVisible(), false);
    await page.locator('#language-button').click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('html').evaluate(html => html.classList.contains('motion-ready')), false);
    await page.locator('#scanner-button').click();
    assert.match(await page.locator('#scanner-status').innerText(), /Готово/);

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: path.join(output, 'mobile-top.png') });
    await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: path.join(output, 'desktop-top.png') });
    await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });
    await page.locator('#projects').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, 'projects.png') });

    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
    const fallback = await noJs.newPage();
    await fallback.goto(origin);
    assert.equal(await fallback.locator('.project-card').count(), 4);
    assert.equal(await fallback.locator('.repo-link').first().isVisible(), true);
    assert.equal(await fallback.locator('#language-button').isVisible(), false);
    assert.equal(await fallback.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await noJs.close();

    const socialContext = await browser.newContext({ viewport: { width: 1200, height: 630 }, locale: 'ru-RU', reducedMotion: 'reduce' });
    const socialPage = await socialContext.newPage();
    await socialPage.goto(origin);
    await socialPage.evaluate(() => document.fonts.ready);
    await socialPage.screenshot({ path: path.join(output, 'social.jpg'), quality: 86 });
    await socialContext.close();

    await context.clearPermissions();
    await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('disabled'); } }));
    await page.reload();
    await page.locator('#language-button').click();
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.deepEqual(failures, [], 'Browser errors');
    assert.deepEqual(externalRequests, [], 'Previews must not send external requests');
    console.log('Passed: previews, four case dialogs, keyboard and mobile navigation, language persistence, clipboard, storage fallback, six viewport sizes, reduced motion, and no-JavaScript content.');
    console.log(`Screenshots: ${output}`);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
