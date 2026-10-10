(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const linkIcon = '<span aria-hidden="true">↗</span>';
  let lang = 'en';

  function featured(project, copy) {
    const txt = project[lang];
    return `
      <article class="featured-article" aria-labelledby="featured-title">
        <div class="feature-main">
          <div class="feature-micro mono"><span>${project.id} / ${escapeHTML(copy.featuredLabel)}</span><span>${escapeHTML(copy.publicLabel)}</span></div>
          <div class="feature-headline"><span class="feature-index">${project.id}</span><h3 id="featured-title">${escapeHTML(project.name)}</h3></div>
          <p class="feature-lead">${escapeHTML(txt.lead)}</p>
          <p class="feature-body">${escapeHTML(txt.body)}</p>
          <div class="feature-tech mono">${project.tech.map(t=>`<span>${escapeHTML(t)}</span>`).join('')}</div>
          <a class="feature-link" href="${escapeHTML(project.href)}" target="_blank" rel="noopener noreferrer">${escapeHTML(copy.source)} ${linkIcon}</a>
        </div>
        <div class="feature-graphic" aria-label="Simplified project flow illustration">
          <div class="graphic-head mono"><span>WORKFLOW / 01</span><span>PY</span></div>
          <div class="graphic-inner"><div class="graphic-stage"><span class="stage-num mono">01</span><span>KWORK</span></div><div class="graphic-connector"><span></span><i>↓</i><span></span></div><div class="graphic-stage"><span class="stage-num mono">02</span><span>MONITOR</span></div><div class="graphic-connector"><span></span><i>↓</i><span></span></div><div class="graphic-stage graphic-end"><span class="stage-num mono">03</span><span>TELEGRAM</span></div></div>
          <div class="graphic-foot mono"><span>INPUT / PROCESS / OUTPUT</span><span>HW.01</span></div>
        </div>
      </article>`;
  }

  function projectRow(project, copy) {
    const txt = project[lang];
    const slug = `detail-${project.id}`;
    return `<article class="project-row">
      <button class="project-trigger" type="button" aria-expanded="false" aria-controls="${slug}" data-project="${project.id}">
        <span class="project-num mono">${escapeHTML(project.id)}</span>
        <span class="project-title-group"><strong>${escapeHTML(project.name)}</strong><span>${escapeHTML(txt.lead)}</span></span>
        <span class="project-kind mono">${escapeHTML(project.kind)}</span>
        <span class="project-toggle" aria-hidden="true">+</span>
      </button>
      <div id="${slug}" class="project-detail" hidden><div class="project-detail-inner">
        <div><span class="detail-label mono">${escapeHTML(copy.note)} / ${escapeHTML(project.id)}</span><p>${escapeHTML(txt.body)}</p></div>
        <div><span class="detail-label mono">${escapeHTML(copy.tech)}</span><p>${project.tech.map(escapeHTML).join(' / ')}</p>
        ${project.href ? `<a href="${escapeHTML(project.href)}" target="_blank" rel="noopener noreferrer" class="detail-action">${escapeHTML(copy.source)} ${linkIcon}</a>` : `<span class="detail-muted">${escapeHTML(copy.private)}</span>`}</div>
      </div></div>
    </article>`;
  }

  function applyText() {
    const t = window.COPY[lang];
    document.documentElement.lang = lang;
    $$('[data-t]').forEach(el => { if (Object.prototype.hasOwnProperty.call(t, el.dataset.t)) el.textContent = t[el.dataset.t]; });
    $('#lang-button').innerHTML = lang === 'en' ? 'RU <span aria-hidden="true">↗</span>' : 'EN <span aria-hidden="true">↗</span>';
    $('#lang-button').setAttribute('aria-label', lang === 'en' ? 'Switch to Russian' : 'Switch to English');
    $('#featured-project').innerHTML = featured(window.DATA.projects[0],t);
    $('#other-projects').innerHTML = window.DATA.projects.slice(1).map(p=>projectRow(p,t)).join('');
    $('#stack-grid').innerHTML = window.DATA.stack.map(g=>`<div class="stack-group"><div class="stack-head mono"><span>${g.no}</span><span>${escapeHTML(g[lang])}</span></div><p>${g.values.map(escapeHTML).join('<span class="stack-sep"> / </span>')}</p></div>`).join('');
    $$('.project-trigger').forEach(b=>b.addEventListener('click',()=>{
      const opened=b.getAttribute('aria-expanded')==='true';
      b.setAttribute('aria-expanded', String(!opened));
      b.querySelector('.project-toggle').textContent=opened?'+':'−';
      $('#detail-'+b.dataset.project).hidden=opened;
    }));
  }
  $('#lang-button').addEventListener('click',()=>{lang=lang==='en'?'ru':'en';applyText();});
  applyText();
})();
