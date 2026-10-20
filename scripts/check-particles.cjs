const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'particles.js'), 'utf8');

function target() {
  const listeners = new Map();
  return {
    addEventListener(name, listener) { listeners.set(name, listener); },
    fire(name, event) { listeners.get(name)?.(event); }
  };
}
function fixture({ width = 1440, height = 780, coarse = false, reduced = false, paused = false, contextMissing = false } = {}) {
  let now = 0;
  let frameId = 0;
  let drawCost = 0;
  const frames = new Map();
  const draws = [];
  let current = [];
  let intersection;
  let resize;
  const canvas = { getContext: () => contextMissing ? null : context };
  const context = {
    fillRect() { current = []; },
    setTransform() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
    arc(x, y, radius) { current.push({ x, y, radius }); },
    fill() { draws.push(current); now += drawCost; }
  };
  const hero = { ...target(), getBoundingClientRect: () => ({ width, height, left: 0, top: 0, bottom: height }) };
  const button = { ...target(), hidden: true, setAttribute(name, value) { this[name] = value; } };
  const label = {};
  const elements = { 'particle-field': canvas, top: hero, 'motion-toggle': button, 'motion-label': label };
  const document = { ...target(), hidden: false, getElementById: id => elements[id] };
  const window = target();
  const media = {
    '(prefers-reduced-motion: reduce)': { ...target(), matches: reduced },
    '(pointer: coarse)': { ...target(), matches: coarse }
  };
  const storage = new Map(paused ? [['hexwald-motion', 'paused']] : []);
  vm.runInNewContext(source, {
    window, document, devicePixelRatio: 3, innerHeight: 1000,
    matchMedia: query => media[query],
    performance: { now: () => now },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: id => frames.delete(id),
    IntersectionObserver: class { constructor(callback) { intersection = callback; } observe() {} },
    ResizeObserver: class { constructor(callback) { resize = callback; } observe() {} }
  });
  const controller = window.initParticles({ t: key => key });
  function step(ms = 34) {
    now += ms;
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach(callback => callback(now));
  }
  return {
    canvas, document, hero, button, label, frames, draws, media, storage, window, controller, step,
    visible(value) { intersection([{ isIntersecting: value }]); },
    resize(nextWidth, nextHeight) { width = nextWidth; height = nextHeight; resize(); },
    drawCost(value) { drawCost = value; }
  };
}

test('caps particles and backing pixels at 4K and high DPR', () => {
  const f = fixture({ width: 3840, height: 2160 });
  assert.ok(f.canvas.width * f.canvas.height <= 1500000);
  assert.equal(f.draws[0].length, 72);
  const mobile = fixture({ width: 1920, height: 1080, coarse: true });
  assert.equal(mobile.draws[0].length, 26);
});
test('caps drawing at 30 FPS and schedules just one loop', () => {
  const f = fixture();
  f.visible(true);
  f.visible(true);
  assert.equal(f.frames.size, 1);
  for (let i = 0; i < 120; i++) f.step(1000 / 120);
  assert.ok(f.draws.length >= 29 && f.draws.length <= 32, `Drew ${f.draws.length} frames in one second`);
});
test('stops off screen and when the page is hidden', () => {
  const f = fixture();
  f.visible(true);
  f.step();
  f.visible(false);
  assert.equal(f.frames.size, 0);
  const count = f.draws.length;
  f.step(2000);
  assert.equal(f.draws.length, count);
  f.visible(true);
  f.document.hidden = true;
  f.document.fire('visibilitychange');
  assert.equal(f.frames.size, 0);
  f.document.hidden = false;
  f.document.fire('visibilitychange');
  assert.equal(f.frames.size, 1);
});
test('reduced motion gives one still frame and follows preference changes', () => {
  const f = fixture({ reduced: true });
  f.visible(true);
  assert.equal(f.frames.size, 0);
  assert.equal(f.draws.length, 1);
  assert.equal(f.button.hidden, true);
  f.media['(prefers-reduced-motion: reduce)'].matches = false;
  f.media['(prefers-reduced-motion: reduce)'].fire('change');
  assert.equal(f.frames.size, 1);
  assert.equal(f.button.hidden, false);
});
test('remembers pause and keeps it through visibility changes', () => {
  const f = fixture({ paused: true });
  f.visible(true);
  assert.equal(f.frames.size, 0);
  assert.equal(f.label.textContent, 'resumeMotion');
  f.button.fire('click');
  assert.equal(f.frames.size, 1);
  f.button.fire('click');
  f.visible(false);
  f.visible(true);
  assert.equal(f.frames.size, 0);
  assert.equal(f.storage.get('hexwald-motion'), 'paused');
});
test('cursor repulsion moves nearby points and never creates particles', () => {
  const f = fixture();
  const index = f.draws[0].findIndex(point => point.x > 30 && point.x < 1400);
  const before = f.draws[0][index];
  f.visible(true);
  f.hero.fire('pointermove', { clientX: before.x - 10, clientY: before.y });
  f.step();
  const after = f.draws.at(-1)[index];
  assert.ok(after.x > before.x + 0.4);
  assert.equal(f.draws.at(-1).length, f.draws[0].length);
});
test('drops drawing work if a device misses the frame budget', () => {
  const f = fixture();
  const initial = f.draws[0].length;
  f.drawCost(10);
  f.visible(true);
  for (let i = 0; i < 12; i++) f.step(51);
  assert.ok(f.draws.at(-1).length < initial);
  assert.ok(f.draws.at(-1).length >= 18);
  f.resize(1920, 1080);
  assert.ok(f.draws.at(-1).length < initial, 'Resize preserves the reduced point limit');
});
test('resize stays bounded and page lifecycle cancels pending work', () => {
  const f = fixture();
  f.visible(true);
  f.resize(320, 500);
  assert.equal(f.draws.at(-1).length, 18);
  f.window.fire('pagehide');
  assert.equal(f.frames.size, 0);
  f.window.fire('pageshow');
  assert.equal(f.frames.size, 1);
});
test('a missing canvas context leaves the page usable', () => {
  const f = fixture({ contextMissing: true });
  f.controller.refresh();
  assert.equal(f.frames.size, 0);
  assert.equal(f.button.hidden, true);
});
