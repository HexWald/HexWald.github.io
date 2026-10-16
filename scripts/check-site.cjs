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
    if (!file.startsWith(root + path.sep) || !/^\/(index\.html|styles\.css|content\.js|demo-data\.js|demos\.js|app\.js|favicon\.svg|assets\/.*)$/.test(pathname)) {
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
  const failures = [];
  const externalRequests = [];
  let browser;
  let checks = 0;
  function check(condition, message) { assert.ok(condition, message); checks++; }
  try {
    browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ru-RU', reducedMotion: 'reduce' });
    await context.route('**/*', route => {
      if (route.request().url().startsWith(origin)) return route.continue();
      externalRequests.push(route.request().url());
      return route.abort();
    });
    context.on('page', page => {
      page.on('pageerror', error => failures.push(error.message));
      page.on('console', message => { if (message.type() === 'error') failures.push(message.text()); });
      page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
    });
    const page = await context.newPage();
    await page.goto(origin);
    await page.evaluate(() => document.fonts.ready);
    check(await page.locator('html.enhanced').count() === 1, 'Application initializes');
    check(await page.locator('#hero-title').innerText() === 'HexWald', 'Page heading');
    check(await page.locator('.project-card').count() === 4, 'Four source projects');
    check(await page.evaluate(() => {
      const ru = Object.keys(COPY.ru).sort();
      const en = Object.keys(COPY.en).sort();
      return JSON.stringify(ru) === JSON.stringify(en) && ['ru', 'en'].every(lang =>
        [...document.querySelectorAll('[data-t],[data-a],[data-p]')].every(element =>
          ['t', 'a', 'p'].every(key => !element.dataset[key] || typeof COPY[lang][element.dataset[key]] === 'string')));
    }), 'Complete translations');
    async function tab(id) { await page.locator(`#tab-${id}`).click(); }
    async function counts(received, prepared, skipped) {
      check(await page.locator('#notifier-received').innerText() === String(received), 'Received count');
      check(await page.locator('#notifier-prepared').innerText() === String(prepared), 'Prepared count');
      check(await page.locator('#notifier-skipped').innerText() === String(skipped), 'Skipped count');
    }
    async function download(selector, name) {
      const pending = page.waitForEvent('download');
      await page.locator(selector).click();
      const result = await pending;
      check(result.suggestedFilename() === name, `Download filename: ${name}`);
      return fs.readFile(await result.path(), 'utf8');
    }

    await page.locator('#notifier-run').click();
    await counts(4, 3, 1);
    check((await page.locator('#notifier-message').innerText()).includes('projects/4105/view'), 'Newest notification shown');
    await page.locator('#notifier-repeat').click();
    await counts(4, 0, 4);
    await page.locator('#notifier-sample').click();
    await page.locator('#notifier-run').click();
    await counts(4, 0, 4);
    await page.locator('#notifier-reset').click();
    await page.locator('#notifier-input').fill('{');
    await page.locator('#notifier-run').click();
    check(await page.locator('#notifier-error').isVisible(), 'Malformed JSON error');
    check(await page.locator('#notifier-repeat').isDisabled(), 'Changed input invalidates repeat');
    const valid = { id: 5001, title: 'One', description: 'First<br>Second &amp; third', price: 100, offers: 1 };
    await page.locator('#notifier-input').fill(JSON.stringify([valid, { ...valid, id: 5002, offers: -1 }]));
    await page.locator('#notifier-run').click();
    check((await page.locator('#notifier-error').innerText()).includes('2'), 'Invalid record identified');
    await page.locator('#notifier-input').fill(JSON.stringify([valid]));
    await page.locator('#notifier-run').click();
    await counts(1, 1, 0);
    check((await page.locator('#notifier-message').innerText()).includes('First\nSecond & third'), 'HTML entities and line breaks');
    const injection = '<img src="https://invalid.example/image" onerror="window.injected=true">';
    await page.locator('#notifier-input').fill(JSON.stringify([{ ...valid, id: 5003, title: injection, description: injection }]));
    await page.locator('#notifier-run').click();
    check((await page.locator('#notifier-message').innerText()).includes(injection), 'Markup stays literal text');
    check(await page.evaluate(() => !window.injected && document.querySelectorAll('#notifier-message img').length === 0), 'No executable markup');
    await page.locator('#notifier-input').fill('[]');
    await page.locator('#notifier-run').click();
    await counts(0, 0, 0);
    check(!(await page.locator('#notifier-error').isVisible()), 'Empty batch allowed');
    await page.locator('#notifier-input').fill(JSON.stringify(Array.from({ length: 101 }, () => valid)));
    await page.locator('#notifier-run').click();
    check(await page.locator('#notifier-error').isVisible(), 'Batch limit enforced');
    await page.locator('#notifier-reset').click();
    await page.locator('#notifier-run').click();
    await page.locator('.processing-log').evaluate(element => { element.open = true; });
    await page.locator('#panel-notifier').screenshot({ path: path.join(output, 'notifier.png') });

    await tab('scanner');
    check(await page.locator('#scan-results tr').count() === 9, 'Nine fixture servers');
    for (const [core, count] of [['Forge', 1], ['Paper', 3], ['UNKNOWN', 2]]) {
      await page.locator('#scan-core').selectOption(core);
      check(await page.locator('#scan-results tr').count() === count, `Filter ${core}`);
    }
    await page.locator('#scan-reset').click();
    await page.locator('#scan-access').selectOption('WHITELIST');
    check(await page.locator('#scan-results tr').count() === 1, 'Whitelist filter');
    check((await page.locator('#scan-detail').innerText()).includes('multiplayer.disconnect.not_whitelisted'), 'Raw whitelist reason');
    await page.locator('#scan-reset').click();
    await page.locator('#scan-sort-ping').click();
    check(await page.locator('.row-select').first().innerText() === 'proxy.example.org', 'Ascending ping');
    await page.locator('#scan-sort-ping').click();
    check(await page.locator('.row-select').first().innerText() === 'fabric.example.org', 'Descending ping');
    check(await page.locator('.row-select').last().innerText() === 'hidden.example.org', 'Unknown ping remains last');
    await page.locator('[data-server="hidden.example.org"]').click();
    check((await page.locator('#scan-detail').innerText()).includes('UNKNOWN'), 'Unknown detail preserved');
    await page.locator('#scan-search').fill('hidden');
    const unknownExport = JSON.parse(await download('#scan-json', 'mc-scanner-demo.json'));
    check(unknownExport.sample === true && unknownExport.results.length === 1 && unknownExport.results[0].clientModsRequired === null, 'JSON exports filtered data and nulls');
    await page.locator('#scan-search').fill('no-server');
    check(await page.locator('#scan-results tr').count() === 0 && await page.locator('#scan-empty').isVisible(), 'Empty filter result');
    check(await page.locator('#scan-json').isDisabled() && await page.locator('#scan-csv').isDisabled(), 'Empty exports disabled');
    check(!(await page.locator('#scan-detail').innerText()).includes('hidden.example.org'), 'No stale server detail');
    await page.locator('#scan-reset').click();
    await page.locator('#scan-core').selectOption('Forge');
    const csv = await download('#scan-csv', 'mc-scanner-demo.csv');
    check(csv.startsWith('\uFEFF') && csv.includes('mods.example.org') && !csv.includes('play.example.org'), 'CSV exports visible records with BOM');
    check(csv.includes('""create""'), 'CSV escapes quoted mod JSON');
    await page.locator('#scan-reset').click();
    await page.locator('[data-server="mods.example.org"]').click();
    await page.locator('#panel-scanner').screenshot({ path: path.join(output, 'scanner.png') });

    await tab('inserter');
    await page.locator('#import-run').click();
    check(await page.locator('#import-results tr').count() === 4, 'Four import records');
    check((await page.locator('#import-summary').innerText()).includes('2'), 'Import summary');
    const imported = JSON.parse(await download('#import-download', 'server-list-demo.json'));
    check(imported.sample === true && imported.servers.length === 2 && imported.servers[1].ip === 'mods.example.org', 'Preview contains accepted records');
    await page.locator('#import-input').fill('\uFEFF# Comment\r\nOne;PLAY.EXAMPLE.ORG.\rTwo,play.example.org:25565\nIPv6;[2001:db8::1]:25565\nSame;2001:db8::1\nExisting;127.0.0.1:25565');
    check(await page.locator('#import-download').isDisabled() && await page.locator('#import-results tr').count() === 0, 'Editing invalidates old preview');
    await page.locator('#import-run').click();
    const normalized = JSON.parse(await download('#import-download', 'server-list-demo.json'));
    check(normalized.servers.length === 2, 'BOM, comments, case, final dot, default port and IPv6');
    await page.locator('#import-input').fill('Good;example.org\nInvalid');
    await page.locator('#import-run').click();
    check((await page.locator('#import-error').innerText()).includes('2'), 'Import error line');
    check(await page.locator('#import-results tr').count() === 0, 'Invalid list not partially applied');
    await page.locator('#import-input').fill('# comment only');
    await page.locator('#import-run').click();
    check(await page.locator('#import-error').isVisible(), 'Empty server list error');
    await page.locator('#import-input').fill(Array.from({ length: 201 }, () => '#').join('\n'));
    await page.locator('#import-run').click();
    check(await page.locator('#import-error').isVisible(), 'Import line limit');
    await page.locator('#import-sample').click();
    await page.locator('#import-run').click();
    await page.locator('#panel-inserter').screenshot({ path: path.join(output, 'inserter.png') });

    await tab('cacao');
    await page.locator('#crosshair-style').selectOption('Dot');
    await page.locator('#crosshair-dot').uncheck();
    check(!(await page.locator('#crosshair b').evaluate(element => element.hidden)), 'Dot style always shows a dot');
    await page.locator('#crosshair-style').selectOption('Cross');
    check(await page.locator('#crosshair b').evaluate(element => element.hidden), 'Optional center dot');
    for (const style of ['Cacao', 'Cross', 'Dot', 'Corner', 'Circle']) {
      await page.locator('#crosshair-style').selectOption(style);
      check(await page.locator('#crosshair').getAttribute('data-style') === style, `${style} preview`);
    }
    for (const [id, value] of [['crosshair-size', '16'], ['crosshair-gap', '10'], ['hud-scale', '200']]) {
      await page.locator(`#${id}`).fill(value);
    }
    const settings = JSON.parse(await page.locator('#cacao-settings').innerText());
    check(settings.size === 16 && settings.gap === 10 && settings.hudScale === 200, 'Range settings reach output');
    check(await page.locator('#crosshair').evaluate(element => element.style.getPropertyValue('--size')) === '16px', 'Size reaches preview');
    check(await page.locator('#hud-block').evaluate(element => element.style.transform) === 'scale(2)', 'HUD scale reaches preview');
    await page.locator('#cacao-reset').click();
    check(JSON.parse(await page.locator('#cacao-settings').innerText()).size === 6, 'Cacao reset');
    await page.locator('#panel-cacao').screenshot({ path: path.join(output, 'cacao.png') });
    await page.locator('#cacao-hit').click();
    check(await page.locator('#crosshair').evaluate(element => getComputedStyle(element).animationName) === 'none', 'Reduced motion respected');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('#cacao-hit').click();
    check(await page.locator('#crosshair').evaluate(element => getComputedStyle(element).animationName) === 'hit', 'Hit feedback animates when allowed');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copiedText = text; } } }));
    await page.locator('#cacao-copy').click();
    check(JSON.parse(await page.evaluate(() => window.copiedText)).style === 'Cacao', 'Copy settings');
    await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error('Clipboard unavailable'); }; });
    await page.locator('#cacao-copy').click();
    check((await page.locator('#toast').innerText()).includes('Не удалось'), 'Clipboard failure explained');

    await page.locator('#tab-cacao').focus();
    await page.keyboard.press('Home');
    check(await page.locator('#tab-notifier').getAttribute('aria-selected') === 'true', 'Tab Home');
    await page.keyboard.press('ArrowRight');
    check(await page.locator('#tab-scanner').evaluate(element => element === document.activeElement), 'Tab ArrowRight focus');
    await page.keyboard.press('ArrowLeft');
    check(await page.locator('#tab-notifier').getAttribute('aria-selected') === 'true', 'Tab ArrowLeft');
    await page.keyboard.press('End');
    check(await page.locator('#tab-cacao').getAttribute('aria-selected') === 'true', 'Tab End');
    await page.locator('#language-button').click();
    check(await page.locator('html').getAttribute('lang') === 'en', 'English switch');
    check(await page.locator('#tab-cacao').getAttribute('aria-selected') === 'true', 'Language preserves selected tab');
    await tab('notifier');
    await counts(4, 3, 1);
    await page.reload();
    check(await page.locator('html').getAttribute('lang') === 'en', 'Language persists');
    await page.locator('#language-button').click();

    for (const id of ['notifier', 'scanner', 'inserter', 'cacao']) {
      const trigger = page.locator(`[data-case="${id}"]`);
      await trigger.click();
      check(await page.locator('#case-dialog').evaluate(dialog => dialog.open), `Open ${id} details`);
      check(await page.locator('#case-sections section').count() === 3, 'Three case sections');
      await page.keyboard.press('Escape');
      check(await trigger.evaluate(button => button === document.activeElement), 'Dialog restores focus');
    }
    await page.keyboard.press('Control+k');
    check(await page.locator('#command-dialog').evaluate(dialog => dialog.open), 'Command dialog opens');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    check(await page.locator('[data-jump="details"]').evaluate(button => button === document.activeElement), 'Command keyboard navigation');
    await page.keyboard.press('Enter');
    check(new URL(page.url()).hash === '#details', 'Command navigates');

    for (const width of [320, 375, 650, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const language of ['ru', 'en']) {
        if (await page.locator('html').getAttribute('lang') !== language) await page.locator('#language-button').click();
        for (const id of ['notifier', 'scanner', 'inserter', 'cacao']) {
          await tab(id);
          check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No page overflow at ${width}px, ${language}, ${id}`);
        }
      }
    }
    await page.setViewportSize({ width: 375, height: 850 });
    await page.locator('#menu-button').click();
    check(await page.locator('#mobile-nav').isVisible(), 'Mobile menu opens');
    await page.locator('#mobile-nav a[href="#projects"]').click();
    check(!(await page.locator('#mobile-nav').isVisible()), 'Mobile menu closes after navigation');

    if (await page.locator('html').getAttribute('lang') !== 'ru') await page.locator('#language-button').click();
    await tab('notifier');
    await page.locator('#notifier-run').click();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(output, 'mobile-top.png') });
    await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(output, 'desktop-top.png') });
    await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });
    const social = await context.newPage();
    await social.setViewportSize({ width: 1200, height: 630 });
    await social.goto(origin);
    await social.evaluate(() => document.fonts.ready);
    await social.addStyleTag({ content: '#demos, #details, #contact, .site-footer, .project-tech, .project-links { display: none; } .hero { padding-block: 24px; } .project-section { padding-top: 10px; } .project-card { grid-template-columns: 220px 1fr; padding-block: 12px; } .project-card h3 { font-size: 16px; } .project-card p { font-size: 13px; } .section-heading { margin-bottom: 14px; }' });
    await social.screenshot({ path: path.join(output, 'social.jpg'), quality: 86 });

    const noScriptContext = await browser.newContext({ javaScriptEnabled: false });
    const noScript = await noScriptContext.newPage();
    await noScript.goto(origin);
    check(await noScript.locator('.project-card').count() === 4 && await noScript.locator('.repo-link').first().isVisible(), 'Source links work without JavaScript');
    check(!(await noScript.locator('#demos').isVisible()), 'Inactive demos hidden without JavaScript');
    const storageContext = await browser.newContext({ locale: 'ru-RU' });
    await storageContext.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage unavailable'); } });
    });
    const noStorage = await storageContext.newPage();
    await noStorage.goto(origin);
    await noStorage.locator('#language-button').click();
    check(await noStorage.locator('html.enhanced').getAttribute('lang') === 'en', 'App works without storage');
    assert.deepEqual(failures, [], 'Browser errors');
    assert.deepEqual(externalRequests, [], 'Demos must not call external services');
    console.log(`${checks} browser checks passed. Screenshots: build/. No external requests.`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
