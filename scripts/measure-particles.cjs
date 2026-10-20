const fs = require('node:fs/promises');
const path = require('node:path');

module.exports = async function measureParticles(browser, origin, output) {
  const results = [];
  for (const rate of [1, 6]) {
    for (const paused of [true, false]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ru-RU', reducedMotion: 'no-preference' });
      await context.addInitScript(isPaused => {
        localStorage.setItem('hexwald-motion', isPaused ? 'paused' : 'playing');
        window.drawSamples = [];
        let started = 0;
        const clear = CanvasRenderingContext2D.prototype.clearRect;
        const rectangle = CanvasRenderingContext2D.prototype.fillRect;
        const fill = CanvasRenderingContext2D.prototype.fill;
        CanvasRenderingContext2D.prototype.clearRect = function (...args) {
          if (this.canvas.id === 'particle-field') started = performance.now();
          return clear.apply(this, args);
        };
        CanvasRenderingContext2D.prototype.fillRect = function (...args) {
          if (this.canvas.id === 'particle-field') started = performance.now();
          return rectangle.apply(this, args);
        };
        CanvasRenderingContext2D.prototype.fill = function (...args) {
          const result = fill.apply(this, args);
          if (this.canvas.id === 'particle-field') window.drawSamples.push(performance.now() - started);
          return result;
        };
      }, paused);
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      await cdp.send('Performance.enable');
      await page.goto(origin);
      await page.locator('html.enhanced').waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);
      await page.evaluate(() => { window.drawSamples.length = 0; });
      const before = await cdp.send('Performance.getMetrics');
      const started = performance.now();
      // Exercise repulsion as well as idle drift; the cursor never spawns particles.
      for (let i = 0; i < 50; i++) {
        await page.mouse.move(300 + i * 16, 360 + Math.sin(i / 6) * 120);
        await page.waitForTimeout(100);
      }
      const elapsed = performance.now() - started;
      const after = await cdp.send('Performance.getMetrics');
      const sample = await page.evaluate(() => {
        const canvas = document.getElementById('particle-field');
        return { draws: window.drawSamples, pixels: canvas.width * canvas.height };
      });
      sample.draws.sort((a, b) => a - b);
      const metric = (snapshot, name) => snapshot.metrics.find(item => item.name === name).value;
      results.push({
        cpuSlowdown: rate,
        background: paused ? 'paused' : 'playing',
        seconds: Number((elapsed / 1000).toFixed(2)),
        drawnFrames: sample.draws.length,
        drawsPerSecond: Number((sample.draws.length / elapsed * 1000).toFixed(1)),
        drawSubmissionP95Ms: Number((sample.draws[Math.floor(sample.draws.length * 0.95)] || 0).toFixed(2)),
        mainThreadBusyPercent: Number(((metric(after, 'TaskDuration') - metric(before, 'TaskDuration')) / (elapsed / 1000) * 100).toFixed(2)),
        jsHeapMiB: Number((metric(after, 'JSHeapUsedSize') / 1048576).toFixed(2)),
        canvasBufferMiB: Number((sample.pixels * 4 / 1048576).toFixed(2))
      });
      await context.close();
    }
  }
  const report = {
    note: 'Local headless Chromium, 1440x900, simulated 6x CPU slowdown. Not an 8 GB RAM limit or a guarantee for other hardware. Heap excludes browser/GPU memory; canvas bytes describe one RGBA buffer. Draw submission timings exclude deferred GPU rendering.',
    results
  };
  await fs.writeFile(path.join(output, 'particle-performance.json'), JSON.stringify(report, null, 2) + '\n');
  console.table(results);
  console.log(report.note);
};
