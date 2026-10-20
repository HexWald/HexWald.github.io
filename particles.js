window.initParticles = ({ t }) => {
  const canvas = document.getElementById('particle-field');
  const hero = document.getElementById('top');
  const button = document.getElementById('motion-toggle');
  const label = document.getElementById('motion-label');
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return { refresh() {} };

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = matchMedia('(pointer: coarse)');
  const points = [];
  const connections = [[], [], []];
  const pointer = { x: 0, y: 0, active: false };
  let width = 0;
  let height = 0;
  let frame = 0;
  let lastTime = 0;
  let visible = false;
  let paused = false;
  let slowFrames = 0;
  let pointLimit = 72;
  let frameInterval = 1000 / 30;
  try { paused = localStorage.getItem('hexwald-motion') === 'paused'; } catch { /* Storage is optional. */ }

  function refresh() {
    button.hidden = reducedMotion.matches;
    button.setAttribute('aria-pressed', String(paused));
    label.textContent = t(paused ? 'resumeMotion' : 'pauseMotion');
  }

  function draw(delta) {
    context.fillStyle = '#080808';
    context.fillRect(0, 0, width, height);
    for (const point of points) {
      if (pointer.active && delta) {
        const dx = point.x - pointer.x;
        const dy = point.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 0 && distance < 125) {
          const force = (1 - distance / 125) * delta * 0.045;
          point.x += dx / distance * force;
          point.y += dy / distance * force;
        }
      }
      point.x += point.vx * delta;
      point.y += point.vy * delta;
      if (point.x < 0 || point.x > width) { point.vx *= -1; point.x = Math.max(0, Math.min(width, point.x)); }
      if (point.y < 0 || point.y > height) { point.vy *= -1; point.y = Math.max(0, Math.min(height, point.y)); }
    }

    const radius = width < 650 ? 115 : 155;
    const radiusSquared = radius * radius;
    connections.forEach(group => { group.length = 0; });
    for (let i = 0; i < points.length; i++) {
      let links = 0;
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i];
        const b = points[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared >= radiusSquared) continue;
        const group = distanceSquared < radiusSquared / 9 ? 2 : distanceSquared < radiusSquared * 4 / 9 ? 1 : 0;
        connections[group].push(i, j);
        if (++links === 3) break;
      }
    }
    // Submit the links in three batches instead of a separate stroke per line.
    context.lineWidth = 0.7;
    context.strokeStyle = '#a3a3a3';
    connections.forEach((group, index) => {
      context.globalAlpha = 0.05 + index * 0.09;
      context.beginPath();
      for (let i = 0; i < group.length; i += 2) {
        const a = points[group[i]];
        const b = points[group[i + 1]];
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
      }
      context.stroke();
    });
    context.globalAlpha = 0.5;
    context.fillStyle = '#b5b5b5';
    context.beginPath();
    for (const point of points) {
      context.moveTo(point.x + point.radius, point.y);
      context.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
    }
    context.fill();
    context.globalAlpha = 1;
  }

  function tick(time) {
    if (!running()) { frame = 0; return; }
    frame = requestAnimationFrame(tick);
    const elapsed = time - lastTime;
    if (elapsed + 0.25 < frameInterval) return;
    lastTime = time - Math.max(0, elapsed - frameInterval) % frameInterval;
    const started = performance.now();
    draw(Math.min(elapsed, 65));
    // Reduce the work permanently for this visit if drawing misses its budget.
    if (performance.now() - started > 8) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames >= 8) {
      pointLimit = Math.max(18, Math.floor(points.length * 0.75));
      points.splice(pointLimit);
      frameInterval = 1000 / 20;
      slowFrames = 0;
    }
  }

  function running() {
    return visible && !document.hidden && !paused && !reducedMotion.matches;
  }
  function sync() {
    refresh();
    if (!running()) {
      cancelAnimationFrame(frame);
      frame = 0;
      pointer.active = false;
    } else if (!frame) {
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }
  function resize() {
    const bounds = hero.getBoundingClientRect();
    const nextWidth = Math.round(bounds.width);
    const nextHeight = Math.round(bounds.height);
    if (!nextWidth || !nextHeight || nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;
    // Cap the backing buffer even on large screens with a high pixel ratio.
    const ratio = Math.min(devicePixelRatio || 1, 1.25, Math.sqrt(1500000 / (width * height)));
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const limit = coarsePointer.matches ? Math.min(26, pointLimit) : pointLimit;
    const count = Math.min(limit, Math.max(18, Math.round(width * height / 16000)));
    points.length = 0;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      points.push({ x: Math.random() * width, y: Math.random() * height, vx: Math.cos(angle) * 0.012, vy: Math.sin(angle) * 0.012, radius: 1 + Math.random() * 0.8 });
    }
    draw(0);
  }

  hero.addEventListener('pointermove', event => {
    if (coarsePointer.matches || !running()) return;
    const bounds = hero.getBoundingClientRect();
    pointer.x = event.clientX - bounds.left;
    pointer.y = event.clientY - bounds.top;
    pointer.active = true;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { pointer.active = false; });
  button.addEventListener('click', () => {
    paused = !paused;
    try { localStorage.setItem('hexwald-motion', paused ? 'paused' : 'playing'); } catch { /* Storage is optional. */ }
    sync();
  });
  document.addEventListener('visibilitychange', sync);
  reducedMotion.addEventListener('change', sync);
  const visibility = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    sync();
  });
  const sizing = new ResizeObserver(resize);
  resize();
  visibility.observe(hero);
  sizing.observe(hero);
  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(frame);
    frame = 0;
    visible = false;
    pointer.active = false;
  });
  window.addEventListener('pageshow', () => {
    const bounds = hero.getBoundingClientRect();
    visible = bounds.bottom > 0 && bounds.top < innerHeight;
    sync();
  });
  refresh();
  return { refresh };
};
