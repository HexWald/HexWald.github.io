(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let language = navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en';
  let activeCase = null;
  let toastTimer;
  try {
    const saved = localStorage.getItem('hexwald-language');
    if (Object.hasOwn(window.COPY, saved)) language = saved;
  } catch { /* Language storage is optional. */ }

  function copy(key, values = {}) {
    const text = window.COPY[language][key];
    if (typeof text !== 'string') throw new Error(`Missing translation: ${key}`);
    return text.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match);
  }
  function translate() {
    document.documentElement.lang = language;
    document.title = copy('pageTitle');
    $('meta[name="description"]').content = copy('pageDescription');
    $('meta[property="og:title"]').content = copy('pageTitle');
    $('meta[property="og:description"]').content = copy('pageDescription');
    $$('[data-t]').forEach(element => { element.textContent = copy(element.dataset.t); });
    $$('[data-a]').forEach(element => element.setAttribute('aria-label', copy(element.dataset.a)));
    $$('[data-p]').forEach(element => { element.placeholder = copy(element.dataset.p); });
    $('#language-button').textContent = language === 'ru' ? 'EN' : 'RU';
    $('#language-button').setAttribute('aria-label', language === 'ru' ? 'Switch to English' : 'Переключить на русский');
    demos.refresh();
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
    $('#toast').textContent = text;
    $('#toast').hidden = false;
    toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3500);
  }
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      notify(copy('copied'));
    } catch { notify(copy('copyFailed')); }
  }
  $('#language-button').addEventListener('click', changeLanguage);
  $$('[data-copy]').forEach(button => button.addEventListener('click', () => copyText(button.dataset.copy)));

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
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });
  matchMedia('(max-width: 650px)').addEventListener('change', closeMenu);

  function showDialog(dialog) {
    closeMenu();
    $$('dialog[open]').forEach(other => other.close());
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
    if (event.key === 'Escape' && !mobileNav.hidden) { closeMenu(); menuButton.focus(); }
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

  const demos = window.initDemos({ t: copy, copyText });
  translate();
  document.documentElement.classList.add('enhanced');
})();
