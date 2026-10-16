window.initDemos = ({ t, copyText }) => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const data = window.DEMO_DATA;
  const errors = new Map();

  function errorAt(id, key, values = {}) {
    if (key) errors.set(id, { key, values }); else errors.delete(id);
    const element = document.getElementById(id);
    element.hidden = !key;
    element.textContent = key ? t(key, values) : '';
  }
  function cell(value, tag = 'td') {
    const element = document.createElement(tag);
    element.textContent = value;
    return element;
  }
  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const tabs = $$('.demo-tabs [role=tab]');
  function selectTab(id, focus = false) {
    tabs.forEach(tab => {
      const selected = tab.dataset.tab === id;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
      if (selected && focus) tab.focus();
    });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab.dataset.tab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      selectTab(tabs[next].dataset.tab, true);
    });
  });

  const history = new Set();
  let lastBatch = null;
  let lastMessage = '';
  let counts = { received: 0, prepared: 0, skipped: 0 };
  let log = [];
  let processed = false;

  function cleanText(text) {
    const decoder = document.createElement('textarea');
    decoder.innerHTML = text.replace(/<br\s*\/?>/gi, '\n').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return decoder.value.trim();
  }
  function buildMessage(project) {
    const activity = project.offers < 5 ? ' ( Actual! )' : project.offers <= 10 ? ' ( 50/50 actual :/ )' : ' ( Maybe not actual :( )';
    return `New Project:\nTitle: ${cleanText(project.title)}, Price: ${project.price}₽\nDescription: ${cleanText(project.description)}\nResponses: ${project.offers}${activity}\nLink: https://kwork.ru/projects/${project.id}/view`;
  }
  function renderNotifier() {
    for (const key of ['received', 'prepared', 'skipped']) $(`#notifier-${key}`).textContent = counts[key];
    $('#notifier-message').textContent = lastMessage || t(processed ? 'noNewProjects' : 'messageEmpty');
    $('#notifier-copy').disabled = !lastMessage;
    $('#notifier-repeat').disabled = !lastBatch;
    $('#notifier-log').replaceChildren(...log.map(entry => cell(t(entry.key, { id: entry.id }), 'li')));
  }
  function invalidateNotifier() {
    lastBatch = null;
    lastMessage = '';
    processed = false;
    counts = { received: 0, prepared: 0, skipped: 0 };
    log = [];
    errorAt('notifier-error');
    renderNotifier();
  }
  function processBatch(batch) {
    const nextCounts = { received: batch.length, prepared: 0, skipped: 0 };
    log = [];
    for (const project of [...batch].sort((a, b) => a.id - b.id)) {
      if (history.has(project.id)) {
        nextCounts.skipped++;
        log.push({ key: 'logSkipped', id: project.id });
        continue;
      }
      lastMessage = buildMessage(project);
      if (history.size === 2048) history.delete(history.values().next().value);
      history.add(project.id);
      nextCounts.prepared++;
      log.push({ key: 'logPrepared', id: project.id });
    }
    lastBatch = batch;
    counts = nextCounts;
    processed = true;
    errorAt('notifier-error');
    renderNotifier();
  }
  $('#notifier-input').value = JSON.stringify(data.projects, null, 2);
  $('#notifier-input').addEventListener('input', invalidateNotifier);
  $('#notifier-run').addEventListener('click', () => {
    let batch;
    try { batch = JSON.parse($('#notifier-input').value); }
    catch { errorAt('notifier-error', 'jsonError'); return; }
    if (!Array.isArray(batch) || batch.length > 100) { errorAt('notifier-error', 'batchError'); return; }
    const invalid = batch.findIndex(project => !project || !Number.isSafeInteger(project.id) || project.id <= 0
      || typeof project.title !== 'string' || !project.title.trim() || typeof project.description !== 'string'
      || typeof project.price !== 'number' || !Number.isFinite(project.price) || project.price < 0
      || !Number.isSafeInteger(project.offers) || project.offers < 0);
    if (invalid >= 0) { errorAt('notifier-error', 'projectError', { row: invalid + 1 }); return; }
    processBatch(batch);
  });
  $('#notifier-repeat').addEventListener('click', () => { if (lastBatch) processBatch(lastBatch); });
  $('#notifier-sample').addEventListener('click', () => {
    $('#notifier-input').value = JSON.stringify(data.projects, null, 2);
    invalidateNotifier();
  });
  $('#notifier-reset').addEventListener('click', () => {
    history.clear();
    $('#notifier-input').value = JSON.stringify(data.projects, null, 2);
    invalidateNotifier();
  });
  $('#notifier-copy').addEventListener('click', () => copyText(lastMessage));

  let selectedServer = data.servers[0].ip;
  let sort = { key: 'ip', direction: 1 };
  let visibleServers = [];
  function renderServerDetail(server) {
    const detail = $('#scan-detail');
    if (!server) { detail.textContent = t('responseEmpty'); return; }
    const title = cell(server.ip, 'h4');
    const list = document.createElement('dl');
    const values = [
      [t('protocol'), server.protocolVersion ?? 'UNKNOWN'],
      [t('players'), server.playersOnline === null ? 'UNKNOWN' : `${server.playersOnline} / ${server.playersMax}`],
      [t('clientMods'), server.clientModsRequired === null ? 'UNKNOWN' : server.clientModsRequired ? 'YES' : 'NO']
    ];
    values.forEach(([label, value]) => {
      const row = document.createElement('div');
      row.append(cell(label, 'dt'), cell(value, 'dd'));
      list.append(row);
    });
    const reason = cell(server.kickReason || t('noReason'), 'pre');
    reason.setAttribute('aria-label', t('rawResponse'));
    detail.replaceChildren(title, list, cell(t('rawResponse'), 'p'), reason);
    if (server.mods.length) {
      detail.append(cell(t('modsList'), 'p'), cell(server.mods.map(mod => `${mod.id}: ${mod.version}`).join('\n'), 'pre'));
    }
  }
  function renderScanner() {
    const query = $('#scan-search').value.trim().toLowerCase();
    const core = $('#scan-core').value;
    const access = $('#scan-access').value;
    visibleServers = data.servers.filter(server => (core === 'all' || server.serverPlatform === core)
      && (access === 'all' || server.joinStatus === access)
      && `${server.ip} ${server.version ?? ''} ${server.serverPlatform}`.toLowerCase().includes(query));
    visibleServers.sort((a, b) => {
      if (sort.key === 'ping') {
        if (a.ping === null) return b.ping === null ? 0 : 1;
        if (b.ping === null) return -1;
        return (a.ping - b.ping) * sort.direction;
      }
      return a.ip.localeCompare(b.ip) * sort.direction;
    });
    if (!visibleServers.some(server => server.ip === selectedServer)) selectedServer = visibleServers[0]?.ip;
    $('#scan-results').replaceChildren(...visibleServers.map(server => {
      const row = document.createElement('tr');
      row.classList.toggle('is-selected', server.ip === selectedServer);
      const addressCell = document.createElement('td');
      const button = cell(server.ip, 'button');
      button.type = 'button';
      button.className = 'row-select';
      button.dataset.server = server.ip;
      button.setAttribute('aria-pressed', String(server.ip === selectedServer));
      button.addEventListener('click', () => {
        selectedServer = server.ip;
        renderScanner();
        $$('.row-select').find(item => item.dataset.server === server.ip)?.focus({ preventScroll: true });
      });
      addressCell.append(button);
      const statusCell = document.createElement('td');
      const status = cell(server.joinStatus, 'span');
      status.className = `status ${server.joinStatus === 'OPEN' ? 'open' : server.joinStatus === 'UNKNOWN' ? '' : 'warning'}`;
      statusCell.append(status);
      row.append(addressCell, cell(server.version ?? 'UNKNOWN'), cell(server.serverPlatform), statusCell, cell(server.ping === null ? 'UNKNOWN' : `${server.ping} ms`));
      return row;
    }));
    $('#scan-empty').hidden = visibleServers.length !== 0;
    $('#scan-count').textContent = t('resultCount', { count: visibleServers.length, total: data.servers.length });
    $('#scan-csv').disabled = $('#scan-json').disabled = visibleServers.length === 0;
    $('#scan-sort-host').setAttribute('aria-label', t('sortHost'));
    $('#scan-sort-ping').setAttribute('aria-label', t('sortPing'));
    for (const key of ['ip', 'ping']) {
      const button = $(key === 'ip' ? '#scan-sort-host' : '#scan-sort-ping');
      button.parentElement.setAttribute('aria-sort', sort.key === key ? sort.direction === 1 ? 'ascending' : 'descending' : 'none');
    }
    renderServerDetail(visibleServers.find(server => server.ip === selectedServer));
  }
  ['scan-search', 'scan-core', 'scan-access'].forEach(id => document.getElementById(id).addEventListener(id === 'scan-search' ? 'input' : 'change', renderScanner));
  $('#scan-reset').addEventListener('click', () => {
    $('#scan-search').value = '';
    $('#scan-core').value = $('#scan-access').value = 'all';
    sort = { key: 'ip', direction: 1 };
    renderScanner();
  });
  for (const [selector, key] of [['#scan-sort-host', 'ip'], ['#scan-sort-ping', 'ping']]) {
    $(selector).addEventListener('click', () => {
      sort = { key, direction: sort.key === key ? -sort.direction : 1 };
      renderScanner();
    });
  }
  $('#scan-json').addEventListener('click', () => download('mc-scanner-demo.json', JSON.stringify({ sample: true, results: visibleServers }, null, 2), 'application/json'));
  $('#scan-csv').addEventListener('click', () => {
    const fields = ['ip', 'port', 'version', 'serverPlatform', 'joinStatus', 'ping', 'protocolVersion', 'clientModsRequired', 'kickReason', 'mods'];
    const quote = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const lines = [fields, ...visibleServers.map(server => fields.map(key => key === 'mods' ? JSON.stringify(server.mods) : server[key]))];
    download('mc-scanner-demo.csv', '\uFEFF' + lines.map(line => line.map(quote).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  });

  function normalizeAddress(ip) {
    const address = ip.trim().toLowerCase();
    const normalizePort = suffix => {
      const port = suffix.slice(1).trim();
      const number = Number(port);
      return ':' + (/^[+-]?\d+$/.test(port) && number >= -2147483648 && number <= 2147483647 ? number : port);
    };
    if (address.startsWith('[')) {
      const closing = address.indexOf(']');
      if (closing > 0) {
        const host = address.slice(1, closing);
        const suffix = address.slice(closing + 1).trim();
        if (!suffix || normalizePort(suffix) === ':25565') return host;
        return `[${host}]` + (suffix.startsWith(':') ? normalizePort(suffix) : suffix);
      }
    }
    const colon = address.indexOf(':');
    if (colon >= 0 && colon === address.lastIndexOf(':')) {
      const host = address.slice(0, colon).trim().replace(/\.$/, '');
      const suffix = normalizePort(address.slice(colon));
      return host + (suffix === ':25565' ? '' : suffix);
    }
    return colon < 0 ? address.replace(/\.$/, '') : address;
  }
  let importRows = null;
  function renderImport() {
    $('#import-results').replaceChildren(...(importRows || []).map(server => {
      const row = document.createElement('tr');
      row.append(cell(server.name), cell(server.ip), cell(t(server.result)));
      return row;
    }));
    $('#import-empty').hidden = importRows !== null;
    const added = importRows?.filter(server => server.result === 'willAdd').length || 0;
    $('#import-summary').textContent = importRows ? t('importSummary', { added, skipped: importRows.length - added }) : '';
    $('#import-download').disabled = !added;
  }
  function invalidateImport() {
    importRows = null;
    errorAt('import-error');
    renderImport();
  }
  $('#import-input').value = data.importText;
  $('#import-input').addEventListener('input', invalidateImport);
  $('#import-sample').addEventListener('click', () => { $('#import-input').value = data.importText; invalidateImport(); });
  $('#import-run').addEventListener('click', () => {
    const lines = $('#import-input').value.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/);
    if (lines.length > 200) { errorAt('import-error', 'importTooLong'); return; }
    const parsed = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;
      const separator = line.includes(';') ? line.indexOf(';') : line.indexOf(',');
      const name = separator >= 0 ? line.slice(0, separator).trim() : '';
      const ip = separator >= 0 ? line.slice(separator + 1).trim() : '';
      if (!name || !ip) { errorAt('import-error', 'importInvalid', { line: i + 1 }); return; }
      parsed.push({ name, ip });
    }
    if (!parsed.length) { errorAt('import-error', 'importNoServers'); return; }
    const known = new Set(['127.0.0.1']);
    importRows = parsed.map(server => {
      const normalized = normalizeAddress(server.ip);
      const result = normalized === '127.0.0.1' ? 'exists' : known.has(normalized) ? 'duplicate' : 'willAdd';
      known.add(normalized);
      return { ...server, result };
    });
    errorAt('import-error');
    renderImport();
  });
  $('#import-download').addEventListener('click', () => {
    const servers = importRows.filter(server => server.result === 'willAdd').map(({ name, ip }) => ({ name, ip }));
    download('server-list-demo.json', JSON.stringify({ sample: true, servers }, null, 2), 'application/json');
  });

  function cacaoSettings() {
    return { style: $('#crosshair-style').value, size: Number($('#crosshair-size').value), gap: Number($('#crosshair-gap').value), hudScale: Number($('#hud-scale').value), centerDot: $('#crosshair-dot').checked };
  }
  function renderCacao() {
    const settings = cacaoSettings();
    const crosshair = $('#crosshair');
    crosshair.dataset.style = settings.style;
    crosshair.style.setProperty('--size', `${settings.size}px`);
    crosshair.style.setProperty('--gap', `${settings.gap}px`);
    crosshair.querySelector('b').hidden = !settings.centerDot && settings.style !== 'Dot';
    $('#size-value').textContent = settings.size;
    $('#gap-value').textContent = settings.gap;
    $('#scale-value').textContent = `${settings.hudScale}%`;
    $('#hud-block').style.transform = `scale(${settings.hudScale / 100})`;
    $('#cacao-settings').textContent = JSON.stringify(settings, null, 2);
  }
  ['crosshair-style', 'crosshair-size', 'crosshair-gap', 'hud-scale', 'crosshair-dot'].forEach(id => document.getElementById(id).addEventListener('input', renderCacao));
  $('#cacao-reset').addEventListener('click', () => {
    $('#crosshair-style').value = 'Cacao';
    $('#crosshair-size').value = '6';
    $('#crosshair-gap').value = '3';
    $('#hud-scale').value = '100';
    $('#crosshair-dot').checked = true;
    renderCacao();
  });
  $('#cacao-hit').addEventListener('click', () => {
    const crosshair = $('#crosshair');
    crosshair.classList.remove('hit');
    void crosshair.offsetWidth;
    crosshair.classList.add('hit');
  });
  $('#cacao-copy').addEventListener('click', () => copyText(JSON.stringify(cacaoSettings(), null, 2)));

  function refresh() {
    renderNotifier();
    renderScanner();
    renderImport();
    renderCacao();
    errors.forEach(({ key, values }, id) => errorAt(id, key, values));
  }
  refresh();
  return { refresh, selectTab };
};
