// Headless Chrome QA for the Tirzahs site (zero dependencies; Node 22+ global WebSocket).
// Usage: node qa/qa.mjs [all|desktop|flick|mobile|reduced|novideo|flip|audit]
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, '../site');
const OUT = path.resolve(HERE, 'out');
fs.mkdirSync(OUT, { recursive: true });
const MODE = process.argv[2] || 'all';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const report = { mode: MODE, at: new Date().toISOString(), checks: {} };

/* static server */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4', '.svg': 'image/svg+xml', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.stat(f, (e, st) => {
    if (e || !st.isFile()) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Content-Length': st.size });
    fs.createReadStream(f).pipe(res);
  });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = process.env.QA_URL || `http://127.0.0.1:${server.address().port}/`; // QA_URL checks the live site

/* chrome */
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9300 + Math.floor(Math.random() * 400);
const profile = fs.mkdtempSync(path.join(process.env.QA_TMP || os.tmpdir(), 'tzqa-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });

async function wsUrl() {
  for (let i = 0; i < 80; i++) {
    try { const j = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); const pg = j.find(t => t.type === 'page'); if (pg) return pg.webSocketDebuggerUrl; } catch {}
    await sleep(200);
  }
  throw new Error('chrome did not start');
}
class CDP {
  constructor(url) {
    this.ws = new WebSocket(url); this.id = 0; this.cb = new Map(); this.handlers = [];
    this.ws.onmessage = m => {
      const d = JSON.parse(m.data);
      if (d.id && this.cb.has(d.id)) { const { res, rej } = this.cb.get(d.id); this.cb.delete(d.id); d.error ? rej(new Error(d.error.message)) : res(d.result); }
      else if (d.method) this.handlers.forEach(h => h(d));
    };
  }
  open() { return new Promise(r => { this.ws.onopen = r; }); }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((res, rej) => this.cb.set(id, { res, rej })); }
  on(h) { this.handlers.push(h); }
}
const cdp = new CDP(await wsUrl());
await cdp.open();
await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Network.enable'); await cdp.send('Log.enable');

let consoleErrors = [], requests = [];
cdp.on(d => {
  if (d.method === 'Runtime.exceptionThrown') consoleErrors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') consoleErrors.push(d.params.args.map(a => a.value ?? a.description).join(' '));
  if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') consoleErrors.push(d.params.entry.text + ' ' + (d.params.entry.url || ''));
  if (d.method === 'Network.requestWillBeSent') requests.push(d.params.request.url);
});

const ev = async (expr) => {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
};
const shot = async (name, full = false) => {
  const r = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full });
  fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
};
async function viewport(w, h, { mobile = false, touch = false } = {}) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile, screenOrientation: w > h ? { type: 'landscapePrimary', angle: 90 } : { type: 'portraitPrimary', angle: 0 } });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: touch, maxTouchPoints: 5 });
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'pointer', value: touch ? 'coarse' : 'fine' }, { name: 'hover', value: touch ? 'none' : 'hover' }, { name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' }] });
}
let reducedMotion = false;
async function load(url = BASE) {
  consoleErrors = []; requests = [];
  await cdp.send('Page.navigate', { url });
  for (let i = 0; i < 100; i++) { await sleep(150); if (await ev('document.readyState') === 'complete') break; }
  await sleep(1200);
}
async function waitVideo(ms = 25000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const s = await ev(`(()=>{const st=document.querySelector('[data-stage]');return st.classList.contains('video-ready')?'ready':st.classList.contains('video-failed')?'failed':'wait'})()`);
    if (s !== 'wait') return s;
    await sleep(250);
  }
  return 'timeout';
}
const heroScrollFor = p => ev(`(()=>{const h=document.querySelector('[data-hero]');return Math.round(h.offsetTop + p*(h.offsetHeight-innerHeight))})()`.replace('p*', p + '*'));
async function scrollToY(y, settle = 1400) { await ev(`window.scrollTo(0, ${y})`); await sleep(settle); }
const probe = () => ev(`(()=>{const v=document.querySelector('[data-video]');const b=[...document.querySelectorAll('[data-band]')].map(e=>({op:+getComputedStyle(e).opacity,k:+(e.style.getPropertyValue('--k')||0)}));return {t:+v.currentTime.toFixed(3),dur:+(v.duration||0).toFixed(3),ready:v.readyState,bands:b,y:Math.round(scrollY)}})()`);

async function desktop() {
  reducedMotion = false;
  await viewport(1440, 900);
  await load();
  const vid = await waitVideo();
  const heroMode = await ev(`getComputedStyle(document.querySelector('.hero-scrub')).display`);
  const res = { video: vid, heroScrubDisplay: heroMode, positions: {} };
  for (const p of [0, 0.12, 0.38, 0.64, 0.9, 1]) {
    const y = await heroScrollFor(p);
    await scrollToY(y, 1800);
    res.positions[p] = await probe();
    await shot(`desktop-hero-${String(p).replace('.', '_')}`);
  }
  for (const id of ['kitchens', 'plates', 'menu', 'around', 'faq', 'visit']) {
    await ev(`window.scrollTo(0, document.getElementById('${id}').offsetTop - 72)`);
    await sleep(1600);
    await shot(`desktop-${id}`);
  }
  await ev(`window.scrollTo(0, document.body.scrollHeight)`); await sleep(1400); await shot('desktop-footer');
  // seam drag with a real mouse
  await ev(`window.scrollTo(0, document.querySelector('.seam').getBoundingClientRect().top + scrollY - 140)`); await sleep(1400);
  const box = await ev(`(()=>{const r=document.querySelector('.seam-frame').getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height}})()`);
  const cy = box.y + box.h / 2;
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x + box.w * 0.5, y: cy, button: 'left', clickCount: 1 });
  for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x + box.w * (0.5 + i * 0.035), y: cy, button: 'left', buttons: 1 }); await sleep(30); }
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x + box.w * 0.85, y: cy, button: 'left', clickCount: 1 });
  await sleep(500);
  res.seamAfterDrag = await ev(`({seam:document.querySelector('[data-seam]').style.getPropertyValue('--seam'),meet:document.querySelector('[data-meet]').className,aria:document.querySelector('[data-seam-handle]').getAttribute('aria-valuetext')})`);
  await shot('desktop-seam-dragged');
  // tabs
  await ev(`document.getElementById('tab-burritos').click()`); await sleep(400);
  res.tabs = await ev(`[...document.querySelectorAll('[data-panel]')].map(p=>p.id+':'+(p.hidden?'hidden':'shown'))`);
  await ev(`window.scrollTo(0, document.getElementById('menu').offsetTop - 72)`); await sleep(1200); await shot('desktop-menu-burritos');
  // horizontal overflow
  res.overflowX = await ev(`document.documentElement.scrollWidth - innerWidth`);
  res.consoleErrors = [...consoleErrors];
  res.videoRequested = requests.some(u => u.includes('hero-scrub.mp4'));
  report.checks.desktop = res;
}

async function flick() {
  reducedMotion = false;
  await viewport(1440, 900);
  const out = {};
  for (const [step, count] of [[120, 40], [240, 22], [360, 16]]) {
    await load(); await waitVideo();
    await ev('window.scrollTo(0,0)'); await sleep(800);
    const log = [];
    for (let i = 0; i < count; i++) {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 720, y: 450, deltaX: 0, deltaY: step });
      await sleep(420);
      log.push(await ev(`[...document.querySelectorAll('[data-band]')].map(e=>+getComputedStyle(e).opacity)`));
    }
    const nb = log[0].length;
    const bands = [];
    for (let b = 0; b < nb; b++) {
      let best = 0, run = 0, max = 0;
      for (const row of log) { max = Math.max(max, row[b]); if (row[b] >= 0.98) { run++; best = Math.max(best, run); } else run = 0; }
      bands.push({ maxOpacity: +max.toFixed(2), longestFullRun: best });
    }
    out[step] = bands;
  }
  report.checks.flick = out;
}

async function mobile() {
  reducedMotion = false;
  const res = {};
  for (const [w, h] of [[390, 844], [375, 667]]) {
    await viewport(w, h, { mobile: true, touch: true });
    await load();
    const r = {
      staticShown: await ev(`getComputedStyle(document.querySelector('.hero-static')).display`),
      scrubShown: await ev(`getComputedStyle(document.querySelector('.hero-scrub')).display`),
      overflowX: await ev(`document.documentElement.scrollWidth - innerWidth`),
    };
    await shot(`mobile-${w}-top`);
    for (const id of ['kitchens', 'menu', 'visit']) { await ev(`window.scrollTo(0, document.getElementById('${id}').offsetTop - 72)`); await sleep(1300); await shot(`mobile-${w}-${id}`); }
    await ev('window.scrollTo(0,0)'); await sleep(400);
    await ev(`document.querySelector('[data-sheet-open]').click()`); await sleep(400);
    r.sheet = await ev(`({open:!document.querySelector('[data-sheet]').hidden, focus:document.activeElement.className})`);
    await shot(`mobile-${w}-sheet`);
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sleep(300);
    r.sheetClosedByEsc = await ev(`document.querySelector('[data-sheet]').hidden`);
    r.videoRequested = requests.some(u => u.includes('hero-scrub.mp4'));
    r.posterRequested = requests.some(u => u.includes('hero-poster'));
    r.consoleErrors = [...consoleErrors];
    res[`${w}x${h}`] = r;
  }
  report.checks.mobile = res;
}

async function reduced() {
  reducedMotion = true;
  await viewport(1440, 900);
  await load();
  report.checks.reduced = {
    staticShown: await ev(`getComputedStyle(document.querySelector('.hero-static')).display`),
    videoRequested: requests.some(u => u.includes('hero-scrub.mp4')),
    lenis: await ev(`document.documentElement.classList.contains('lenis')`),
    hiddenFades: await ev(`[...document.querySelectorAll('[data-fade]')].filter(e=>+getComputedStyle(e).opacity<1).length`),
    consoleErrors: [...consoleErrors],
  };
  await shot('reduced-top');
  await ev(`window.scrollTo(0, document.getElementById('kitchens').offsetTop)`); await sleep(600); await shot('reduced-kitchens');
  reducedMotion = false;
}

async function novideo() {
  reducedMotion = false;
  await viewport(1440, 900);
  await cdp.send('Network.setBlockedURLs', { urls: ['*hero-scrub.mp4'] });
  await load();
  const s = await waitVideo(8000);
  const y = await heroScrollFor(0.9); await scrollToY(y, 1500);
  report.checks.novideo = { state: s, poster: await ev(`getComputedStyle(document.querySelector('[data-poster]')).backgroundImage.slice(0,80)`), bands: (await probe()).bands, consoleErrorsCount: consoleErrors.length };
  await shot('novideo-hero-0_9');
  await cdp.send('Network.setBlockedURLs', { urls: [] });
}

async function flip() {
  reducedMotion = false;
  await viewport(1440, 900);
  await load(); await waitVideo();
  const y = await heroScrollFor(0.4); await scrollToY(y, 1500);
  const before = await probe();
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await sleep(600);
  const during = { staticShown: await ev(`getComputedStyle(document.querySelector('.hero-static')).display`), lenis: await ev(`document.documentElement.classList.contains('lenis')`) };
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await sleep(600);
  const y2 = await heroScrollFor(0.7); await scrollToY(y2, 1600);
  const after = await probe();
  report.checks.flip = { before, during, after, lenisAfter: await ev(`document.documentElement.classList.contains('lenis')`) };
}

// worst-frame legibility audit: hide the glyphs, screenshot, save band boxes for the Python pass
async function audit() {
  reducedMotion = false;
  await viewport(1440, 900);
  await load(); await waitVideo();
  const plan = { 0: [0.02, 0.1, 0.2], 1: [0.3, 0.38, 0.46], 2: [0.57, 0.65, 0.73], 3: [0.86, 0.93, 1] };
  const boxes = [];
  for (const [bi, ps] of Object.entries(plan)) {
    for (const p of ps) {
      const y = await heroScrollFor(p); await scrollToY(y, 1800);
      const bb = await ev(`(()=>{const band=document.querySelectorAll('[data-band]')[${bi}];const els=[...band.querySelectorAll('.band-title, .band-line, .kicker')];
        const rs=els.map(e=>e.getBoundingClientRect()).filter(r=>r.width>0);
        band.querySelectorAll('.w,.c,.band-line,.kicker').forEach(e=>e.style.visibility='hidden');
        return rs.map(r=>({x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)}))})()`);
      await sleep(250);
      const name = `audit-b${+bi + 1}-${String(p).replace('.', '_')}`;
      await shot(name);
      await ev(`document.querySelectorAll('[data-band]')[${bi}].querySelectorAll('.w,.c,.band-line,.kicker').forEach(e=>e.style.visibility='')`);
      boxes.push({ band: +bi + 1, p, file: name + '.png', boxes: bb, opacity: (await probe()).bands[bi].op });
    }
  }
  fs.writeFileSync(path.join(OUT, 'audit-boxes.json'), JSON.stringify(boxes, null, 1));
  report.checks.audit = { frames: boxes.length };
}

async function nojs() {
  reducedMotion = false;
  await viewport(1440, 900);
  await cdp.send('Emulation.setScriptExecutionDisabled', { value: true });
  await load();
  report.checks.nojs = {
    staticShown: await cdp.send('Runtime.evaluate', { expression: `getComputedStyle(document.querySelector('.hero-static')).display`, returnByValue: true }).then(r => r.result.value),
    panelsShown: await cdp.send('Runtime.evaluate', { expression: `[...document.querySelectorAll('[data-panel]')].filter(p=>!p.hidden && getComputedStyle(p).display!=='none').length`, returnByValue: true }).then(r => r.result.value),
    videoRequested: requests.some(u => u.includes('hero-scrub.mp4')),
  };
  await shot('nojs-top');
  await cdp.send('Emulation.setScriptExecutionDisabled', { value: false });
}

async function keys() {
  reducedMotion = false;
  await viewport(1440, 900);
  await load(); await waitVideo();
  const seen = [];
  for (let i = 0; i < 9; i++) {
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await sleep(250);
    seen.push(await ev(`(()=>{const a=document.activeElement;const cs=getComputedStyle(a);return (a.textContent||a.getAttribute('aria-label')||a.tagName).trim().slice(0,30)+' | outline '+cs.outlineStyle+' '+cs.outlineWidth})()`));
    if (i === 1) await shot('keys-focus-nav');
  }
  // tab into the seam handle and move it with the keyboard
  await ev(`document.querySelector('[data-seam-handle]').focus()`); await sleep(300);
  for (let i = 0; i < 4; i++) await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
  await sleep(300);
  report.checks.keys = { order: seen, seamAfterKeys: await ev(`document.querySelector('[data-seam-handle]').getAttribute('aria-valuenow')`) };
  await ev(`document.querySelector('.seam').scrollIntoView({block:'center'})`); await sleep(1200);
  await shot('keys-seam');
}

async function file() {
  reducedMotion = false;
  await viewport(1440, 900);
  await load('file://' + path.join(ROOT, 'index.html'));
  const s = await waitVideo(15000);
  const y = await heroScrollFor(0.64); await scrollToY(y, 1800);
  report.checks.file = { state: s, probe: await probe(), consoleErrors: [...consoleErrors] };
  await shot('file-hero-0_64');
}

try {
  const run = { desktop, flick, mobile, reduced, novideo, flip, audit, nojs, keys, file };
  if (MODE === 'all') { for (const k of ['desktop', 'mobile', 'reduced', 'novideo', 'flip', 'flick', 'audit']) await run[k](); }
  else await run[MODE]();
} catch (e) { report.error = String(e.stack || e); }
fs.writeFileSync(path.join(OUT, `report-${MODE}.json`), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
chrome.kill(); server.close();
process.exit(0);
