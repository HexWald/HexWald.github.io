(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let language = navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en';
  let activeCase = null;
  let hitCount = 0;
  let importReady = false;
  let scannerRunning = false;
  let scannerComplete = false;
  let toastTimer;

  try {
    const saved = localStorage.getItem('hexwald-language');
    if (Object.hasOwn(window.COPY, saved)) language = saved;
  } catch { /* The site also works when browser storage is disabled. */ }

  const copy = key => window.COPY[language][key];

  function setText(element, text) {
    const lines = text.split('\n');
    element.replaceChildren();
    lines.forEach((line, index) => {
      if (index) element.append(document.createElement('br'));
      element.append(document.createTextNode(line));
    });
  }

  function translate() {
    document.documentElement.lang = language;
    document.title = copy('pageTitle');
    $('meta[name="description"]').content = copy('pageDescription');
    $('meta[property="og:title"]').content = copy('pageTitle');
    $('meta[property="og:description"]').content = copy('pageDescription');
    $$('[data-t]').forEach(element => setText(element, copy(element.dataset.t)));
    $$('[data-a]').forEach(element => element.setAttribute('aria-label', copy(element.dataset.a)));
    $('#language-button').textContent = language === 'ru' ? 'EN' : 'RU';
    $('#language-button').setAttribute('aria-label', language === 'ru' ? 'Switch to English' : 'Переключить на русский');
    if (hitCount) $('#aim-instruction').textContent = copy('aimSuccess');
    if (importReady) renderImport();
    updateScannerStatus();
    if (activeCase) renderCase(activeCase);
  }

  function changeLanguage() {
    language = language === 'ru' ? 'en' : 'ru';
    try { localStorage.setItem('hexwald-language', language); } catch { /* Storage is optional. */ }
    $('#toast').hidden = true;
    translate();
  }

  function notify(text) {
    clearTimeout(toastTimer);
    const toast = $('#toast');
    toast.textContent = text;
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
  }

  $('#language-button').addEventListener('click', changeLanguage);

  const menuButton = $('#menu-button');
  const mobileNav = $('#mobile-nav');
  function closeMenu() {
    mobileNav.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
  }
  menuButton.addEventListener('click', () => {
    mobileNav.hidden = !mobileNav.hidden;
    menuButton.setAttribute('aria-expanded', String(!mobileNav.hidden));
  });
  $$('#mobile-nav a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header')) closeMenu();
  });
  window.matchMedia('(max-width: 650px)').addEventListener('change', closeMenu);

  function showDialog(dialog) {
    closeMenu();
    $$('dialog[open]').forEach(openDialog => openDialog.close());
    dialog.showModal();
    document.documentElement.classList.add('dialog-open');
  }
  $$('dialog').forEach(dialog => {
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      if (dialog.id === 'case-dialog') activeCase = null;
      if (!$('dialog[open]')) document.documentElement.classList.remove('dialog-open');
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
  });

  function renderCase(id) {
    const project = window.CASES[id];
    $('#case-kind').textContent = project.kind;
    $('#case-title').textContent = project.name;
    $('#case-intro').textContent = copy(`${id}Lead`);
    $('#case-source').href = project.href;
    $('#case-sections').replaceChildren(...project[language].map(([title, body]) => {
      const section = document.createElement('section');
      const heading = document.createElement('h3');
      const paragraph = document.createElement('p');
      heading.textContent = title;
      paragraph.textContent = body;
      section.append(heading, paragraph);
      return section;
    }));
  }
  $$('[data-case]').forEach(button => button.addEventListener('click', () => {
    activeCase = button.dataset.case;
    renderCase(activeCase);
    showDialog($('#case-dialog'));
  }));

  const commandDialog = $('#command-dialog');
  function openCommands() {
    showDialog(commandDialog);
    $('.command-list button').focus();
  }
  $$('[data-command]').forEach(button => button.addEventListener('click', openCommands));
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (commandDialog.open) commandDialog.close(); else openCommands();
    }
    if (event.key === 'Escape' && !mobileNav.hidden) {
      closeMenu();
      menuButton.focus();
    }
  });
  commandDialog.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = $$('.command-list button');
    let index = buttons.indexOf(document.activeElement);
    if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = buttons.length - 1;
    else index = (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[index].focus();
  });
  $$('[data-jump]').forEach(button => button.addEventListener('click', () => {
    commandDialog.close();
    const destination = document.getElementById(button.dataset.jump);
    destination.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    history.replaceState(null, '', `#${destination.id}`);
    destination.setAttribute('tabindex', '-1');
    destination.focus({ preventScroll: true });
  }));
  $('[data-change-language]').addEventListener('click', () => { changeLanguage(); commandDialog.close(); });

  $$('[data-copy]').forEach(button => button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      notify(copy('copied'));
    } catch {
      notify(copy('copyFailed') + button.dataset.copy);
    }
  }));

  const crosshair = $('#crosshair');
  const hitMarker = $('#hit-marker');
  const aimButton = $('#aim-button');
  let pointerFrame;
  $$('.preset-buttons button').forEach(button => button.addEventListener('click', () => {
    crosshair.dataset.style = button.dataset.style;
    $$('.preset-buttons button').forEach(preset => preset.setAttribute('aria-pressed', String(preset === button)));
  }));
  aimButton.addEventListener('pointermove', event => {
    if (reducedMotion.matches || event.pointerType !== 'mouse') return;
    cancelAnimationFrame(pointerFrame);
    pointerFrame = requestAnimationFrame(() => {
      const bounds = aimButton.getBoundingClientRect();
      const x = Math.max(8, Math.min(92, (event.clientX - bounds.left) / bounds.width * 100));
      const y = Math.max(10, Math.min(84, (event.clientY - bounds.top) / bounds.height * 100));
      crosshair.style.left = hitMarker.style.left = `${x}%`;
      crosshair.style.top = hitMarker.style.top = `${y}%`;
      $('.scene-layer').style.transform = `translate(${(50 - x) * .09}px, ${(50 - y) * .05}px)`;
    });
  });
  function resetAim() {
    cancelAnimationFrame(pointerFrame);
    crosshair.style.left = hitMarker.style.left = '50%';
    crosshair.style.top = hitMarker.style.top = '50%';
    $('.scene-layer').style.transform = '';
  }
  aimButton.addEventListener('pointerleave', resetAim);
  aimButton.addEventListener('click', () => {
    hitCount++;
    $('#hit-count').textContent = `${String(hitCount).padStart(2, '0')} HITS`;
    $('#aim-instruction').textContent = copy('aimSuccess');
    [crosshair, hitMarker].forEach(element => {
      element.classList.remove('hit');
      void element.offsetWidth;
      element.classList.add('hit');
    });
  });

  const sampleServers = [
    { name: 'Creative', address: 'play.example.org' },
    { name: 'Localhost', address: '127.0.0.1' },
    { name: 'Creative copy', address: 'PLAY.EXAMPLE.ORG:25565' },
    { name: 'Mods', address: 'mods.example.org' }
  ];
  function renderImport() {
    const known = new Set();
    const rows = sampleServers.filter(server => {
      const address = server.address.toLowerCase().replace(/:25565$/, '');
      if (known.has(address)) return false;
      known.add(address);
      return true;
    });
    $('#import-preview').replaceChildren(...rows.map(server => {
      const row = document.createElement('div');
      row.className = 'import-result';
      const name = document.createElement('span');
      const status = document.createElement('span');
      name.textContent = server.name;
      status.textContent = '✓';
      row.append(name, status);
      return row;
    }));
    const summary = document.createElement('div');
    summary.className = 'import-summary';
    summary.textContent = copy('importSummary');
    $('#import-preview').append(summary);
    $('#import-button [data-t]').textContent = copy('importAgain');
  }
  $('#import-button').addEventListener('click', () => { importReady = true; renderImport(); });

  $('#notification-button').addEventListener('click', () => {
    const card = $('#notification-card');
    card.classList.remove('notify');
    void card.offsetWidth;
    card.classList.add('notify');
    notify(copy('notificationShown'));
  });

  function updateScannerStatus() {
    $('#scanner-status').textContent = copy(scannerRunning ? 'scannerBusy' : scannerComplete ? 'scannerDone' : 'scannerIdle');
  }
  $('#scanner-button').addEventListener('click', async () => {
    if (scannerRunning) return;
    scannerRunning = true;
    $('#scanner-button').disabled = true;
    $('.scanner-visual').classList.add('scanning');
    updateScannerStatus();
    const rows = $$('.scanner-row');
    rows.forEach(row => { row.style.opacity = '.2'; });
    for (const row of rows) {
      if (!reducedMotion.matches) await new Promise(resolve => setTimeout(resolve, 220));
      row.style.opacity = '1';
    }
    scannerRunning = false;
    scannerComplete = true;
    $('#scanner-button').disabled = false;
    $('.scanner-visual').classList.remove('scanning');
    updateScannerStatus();
  });

  let revealObserver;
  function updateMotion() {
    revealObserver?.disconnect();
    resetAim();
    const animate = !reducedMotion.matches && 'IntersectionObserver' in window;
    document.documentElement.classList.toggle('motion-ready', animate);
    if (!animate) return;
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: .05 });
    $$('.reveal').forEach(element => revealObserver.observe(element));
  }
  reducedMotion.addEventListener('change', updateMotion);

  translate();
  document.documentElement.classList.add('enhanced');
  updateMotion();
})();
