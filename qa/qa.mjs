// Headless Chrome QA for the Tirzahs site (zero dependencies; Node 22+ global WebSocket).
// Usage: node qa/qa.mjs [all|desktop|flick|mobile|reduced|novideo|flip|audit]
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(process.env.QA_ROOT || path.resolve(HERE, '../site')); // QA_ROOT tests another copy (e.g. the previous commit)
const OUT = path.resolve(HERE, 'out');
fs.mkdirSync(OUT, { recursive: true });
const MODE = process.argv[2] || 'all';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const report = { mode: MODE, at: new Date().toISOString(), checks: {} };

/* static server */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4', '.svg': 'image/svg+xml', '.txt': 'text/plain' };
// QA_H2=1 serves over HTTP/2 + TLS (self-signed), like GitHub Pages, so load tests see multiplexing
const H2 = !!process.env.QA_H2;
let tls = null;
if (H2) {
  const dir = process.env.QA_TMP || os.tmpdir();
  const key = path.join(dir, 'qa-key.pem'), cert = path.join(dir, 'qa-cert.pem');
  if (!fs.existsSync(key)) (await import('node:child_process')).execSync(`openssl req -x509 -newkey rsa:2048 -nodes -keyout ${key} -out ${cert} -days 30 -subj /CN=127.0.0.1 2>/dev/null`);
  tls = { key: fs.readFileSync(key), cert: fs.readFileSync(cert), allowHTTP1: true };
}
const handler = (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.stat(f, (e, st) => {
    if (e || !st.isFile()) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Content-Length': st.size });
    fs.createReadStream(f).pipe(res);
  });
};
const server = H2 ? (await import('node:http2')).createSecureServer(tls, handler) : http.createServer(handler);
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = process.env.QA_URL || `${H2 ? 'https' : 'http'}://127.0.0.1:${server.address().port}/`; // QA_URL checks the live site

/* chrome */
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9300 + Math.floor(Math.random() * 400);
const profile = fs.mkdtempSync(path.join(process.env.QA_TMP || os.tmpdir(), 'tzqa-'));
const chrome = spawn(CHROME, ['--headless=new', ...(process.env.QA_GPU ? [] : ['--disable-gpu']), `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--autoplay-policy=no-user-gesture-required',
  ...(H2 ? ['--ignore-certificate-errors'] : []), 'about:blank'], { stdio: 'ignore' });

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
  for (let i = 0; i < 40 && !(await ev(`document.querySelector('[data-stage]').classList.contains('video-hq')`)); i++) await sleep(250);
  await sleep(800);
  const res = { video: vid, heroScrubDisplay: heroMode, hq: await ev(`document.querySelector('[data-stage]').classList.contains('video-hq')`),
    videoElements: await ev(`document.querySelectorAll('[data-video]').length`), positions: {} };
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
  // a phone held sideways has no room for the journey: static hero, no video
  await viewport(844, 390, { mobile: true, touch: true });
  await load();
  res['844x390 landscape'] = {
    staticShown: await ev(`getComputedStyle(document.querySelector('.hero-static')).display`),
    videoRequested: requests.some(u => u.includes('hero-scrub')),
    overflowX: await ev(`document.documentElement.scrollWidth - innerWidth`),
  };
  await shot('mobile-844-landscape');
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

// swap under load: scrub the preview on a throttled phone, let the full cut swap in mid-scroll, keep scrubbing
async function swap() {
  reducedMotion = false;
  await viewport(390, 844, { mobile: true, touch: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, ...NETS['4g'] });
  await load();
  const s = await waitVideo(30000);
  const hqNow = () => ev(`document.querySelector('[data-stage]').classList.contains('video-hq')`);
  const res = { state: s, hqAtReady: await hqNow(), steps: [] };
  let p = 0.05, i = 0;
  while (i < 40) {                       // keep scrolling up and down through the hero while the full cut downloads
    const y = await heroScrollFor(p); await scrollToY(y, 350);
    const pr = await probe(); const hq = await hqNow();
    res.steps.push({ p: +p.toFixed(2), t: pr.t, expect: +(p * (pr.dur - 0.05)).toFixed(2), hq, vids: await ev(`document.querySelectorAll('[data-video]').length`) });
    if (hq && res.steps.filter(x => x.hq).length > 4) break;
    p = p >= 0.9 ? 0.1 : p + 0.17; i++;
  }
  await sleep(1200);
  const y = await heroScrollFor(0.64); await scrollToY(y, 1500);
  res.final = await probe();
  res.finalVideos = await ev(`document.querySelectorAll('[data-video]').length`);
  res.consoleErrors = [...consoleErrors];
  report.checks.swap = res;
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
}

// preview missing: the loader falls back to the full-quality file
async function nopreview() {
  reducedMotion = false;
  await viewport(1440, 900);
  await cdp.send('Network.setBlockedURLs', { urls: ['*hero-preview*.mp4'] });
  await load();
  const s = await waitVideo(20000);
  const y = await heroScrollFor(0.64); await scrollToY(y, 1500);
  report.checks.nopreview = { state: s, hq: await ev(`document.querySelector('[data-stage]').classList.contains('video-hq')`), probe: await probe(), consoleErrors: [...consoleErrors] };
  await cdp.send('Network.setBlockedURLs', { urls: [] });
}

async function novideo() {
  reducedMotion = false;
  await viewport(1440, 900);
  await cdp.send('Network.setBlockedURLs', { urls: ['*hero-scrub*.mp4', '*hero-preview*.mp4'] });
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
  const AW = +(process.env.QA_W || 1440), AH = +(process.env.QA_H || 900);
  await viewport(AW, AH, AW < AH ? { mobile: true, touch: true } : {});
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

// performance: scroll the whole page like a visitor while sampling every frame.
// env: QA_W, QA_H (touch when portrait), QA_CPU (CPU slowdown, e.g. 4 for a mid-range phone)
const ANIM_PROBE = `(()=>{const out=[];const vh=innerHeight;
  for(const el of document.querySelectorAll('body *')){
    for(const pseudo of [null,'::before','::after']){
      const cs=getComputedStyle(el,pseudo);if(!cs.animationName||cs.animationName==='none')continue;
      const r=el.getBoundingClientRect();const onscreen=r.bottom>0&&r.top<vh&&r.width>0&&r.height>0;
      if(cs.animationPlayState.includes('running')) out.push({el:(el.className&&el.className.baseVal===undefined?String(el.className):el.tagName).slice(0,40)+(pseudo||''),name:cs.animationName,onscreen});
    }}
  return {running:out.length,offscreenRunning:out.filter(a=>!a.onscreen).map(a=>a.el+' '+a.name)}})()`;
async function perf() {
  reducedMotion = false;
  const W = +(process.env.QA_W || 1440), H = +(process.env.QA_H || 900), CPU = +(process.env.QA_CPU || 1);
  const touch = W < H;
  await viewport(W, H, touch ? { mobile: true, touch: true } : {});
  await load(); await waitVideo(); await sleep(800);
  await cdp.send('Performance.enable');
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  const anim = {};
  anim.top = await ev(ANIM_PROBE);
  await ev(`window.__f=[];window.__y=[];window.__lt=[];(function loop(t){__f.push(t);__y.push(Math.round(scrollY));window.__raf=requestAnimationFrame(loop)})(performance.now());
    try{new PerformanceObserver(l=>l.getEntries().forEach(e=>__lt.push(Math.round(e.duration)))).observe({type:'longtask'})}catch(e){}`);
  const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  const m0 = await metrics();
  const t0 = Date.now();
  const heroEnd = await ev(`(()=>{const h=document.querySelector('.hero');return h.offsetTop+h.offsetHeight})()`);
  let heroFrames = null, midSampled = false;
  for (let i = 0; i < 400; i++) {
    const y = await ev('scrollY');
    const max = await ev('document.documentElement.scrollHeight - innerHeight');
    if (heroFrames === null && y >= heroEnd - H) heroFrames = await ev('__f.length');
    if (!midSampled && y > max / 2) { anim.mid = await ev(ANIM_PROBE); midSampled = true; }
    if (y >= max - 2) break;
    if (touch) await cdp.send('Input.synthesizeScrollGesture', { x: Math.round(W / 2), y: Math.round(H * 0.75), yDistance: -Math.round(H * 0.55), gestureSourceType: 'touch', speed: 1400 });
    else { await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: W / 2, y: H / 2, deltaX: 0, deltaY: 100 }); await sleep(45); }
  }
  await sleep(1200);
  const secs = (Date.now() - t0) / 1000;
  const m1 = await metrics();
  anim.bottom = await ev(ANIM_PROBE);
  const stats = await ev(`(()=>{cancelAnimationFrame(__raf);const d=[];for(let i=1;i<__f.length;i++)d.push(__f[i]-__f[i-1]);
    const s=[...d].sort((a,b)=>a-b);const pct=q=>+s[Math.floor(s.length*q)].toFixed(1);
    const heroN=${'${HERO}'};const seg=(a,b)=>{const x=d.slice(a,b);return x.length?+(1000/(x.reduce((p,c)=>p+c,0)/x.length)).toFixed(1):null};
    return {frames:d.length,avgFps:+(1000/(d.reduce((a,b)=>a+b,0)/d.length)).toFixed(1),p50:pct(.5),p95:pct(.95),p99:pct(.99),
      over20ms:+(100*d.filter(x=>x>20).length/d.length).toFixed(1),over33ms:+(100*d.filter(x=>x>33.4).length/d.length).toFixed(1),
      heroFps:seg(0,heroN),belowFps:seg(heroN,d.length),longTasks:__lt.length,longTaskMs:__lt.reduce((a,b)=>a+b,0),
      slowFrames:d.map((x,i)=>[Math.round(x),__y[i+1]]).filter(a=>a[0]>25).map(a=>{const el=[...document.querySelectorAll('main > section, footer')].find(s=>a[1]+innerHeight/2>=s.offsetTop&&a[1]+innerHeight/2<s.offsetTop+s.offsetHeight);return a[0]+'ms@'+a[1]+'('+(el?el.id||el.className:'?')+')'})}})()`.replace('${HERO}', String(heroFrames ?? 0)));
  const dm = k => +((m1[k] || 0) - (m0[k] || 0)).toFixed(3);
  report.checks.perf = { viewport: `${W}x${H}`, cpuSlowdown: CPU, seconds: +secs.toFixed(1), ...stats,
    busy: { layoutS: dm('LayoutDuration'), styleS: dm('RecalcStyleDuration'), scriptS: dm('ScriptDuration'), taskS: dm('TaskDuration'), layouts: dm('LayoutCount'), styleRecalcs: dm('RecalcStyleCount') },
    animations: anim, consoleErrors: [...consoleErrors] };
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
}

// band entries: scroll slowly through the hero only and report slow frames by hero progress,
// so a hitch when a caption arrives shows up next to its band. env: QA_W/QA_H, QA_CPU
async function bandperf() {
  reducedMotion = false;
  const W = +(process.env.QA_W || 1440), H = +(process.env.QA_H || 900), CPU = +(process.env.QA_CPU || 1);
  const touch = W < H;
  await viewport(W, H, touch ? { mobile: true, touch: true } : {});
  await load(); await waitVideo();
  for (let i = 0; i < 40 && !(await ev(`document.querySelector('[data-stage]').classList.contains('video-hq')`)); i++) await sleep(250);
  await sleep(800);
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  const bands = await ev(`[...document.querySelectorAll('[data-band]')].map(b=>[+b.dataset.a,+b.dataset.b])`);
  await ev(`(()=>{const h=document.querySelector('[data-hero]'),st=document.querySelector('[data-stage]');window.__hp=()=>Math.max(0,Math.min(1,(scrollY-h.offsetTop)/(h.offsetHeight-st.offsetHeight)));
    window.__f=[];window.__p=[];(function loop(t){__f.push(t);__p.push(__hp());window.__raf=requestAnimationFrame(loop)})(performance.now())})()`);
  const end = await heroScrollFor(1);
  for (let i = 0; i < 600; i++) {
    const y = await ev('scrollY'); if (y >= end) break;
    if (touch) await cdp.send('Input.synthesizeScrollGesture', { x: Math.round(W / 2), y: Math.round(H * 0.7), yDistance: -Math.round(H * 0.18), gestureSourceType: 'touch', speed: 600 });
    else { await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: W / 2, y: H / 2, deltaX: 0, deltaY: 60 }); await sleep(40); }
  }
  await sleep(1000);
  const out = await ev(`(()=>{cancelAnimationFrame(__raf);const d=[];for(let i=1;i<__f.length;i++)d.push([__f[i]-__f[i-1],__p[i]]);
    const bands=${JSON.stringify(bands)};const near=p=>{for(const [a,b] of bands){if(Math.abs(p-a)<0.04)return 'enter '+a;if(Math.abs(p-b)<0.04)return 'exit '+b}return 'mid'};
    const slow=d.filter(x=>x[0]>20).map(x=>Math.round(x[0])+'ms@p'+x[1].toFixed(3)+' '+near(x[1]));
    const n=d.length,avg=d.reduce((a,x)=>a+x[0],0)/n;
    const enterFrames=d.filter(x=>near(x[1]).startsWith('enter'));const ent=enterFrames.reduce((a,x)=>a+x[0],0)/Math.max(1,enterFrames.length);
    return {frames:n,avgFps:+(1000/avg).toFixed(1),fpsAtBandEntries:+(1000/ent).toFixed(1),over20ms:+(100*d.filter(x=>x[0]>20).length/n).toFixed(1),slow}})()`);
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  report.checks.bandperf = { viewport: `${W}x${H}`, cpu: CPU, ...out, consoleErrors: [...consoleErrors] };
}

// load: empty cache over a throttled network. Reports first paint, largest paint, when the scrub
// is ready (and when the full-quality cut has swapped in), bytes by type, requests, and third-party origins.
// env: QA_W/QA_H (portrait = phone), QA_NET = slow4g | 4g | cable
const NETS = {
  slow4g: { latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 0.75e6 / 8 },
  '4g': { latency: 85, downloadThroughput: 9e6 / 8, uploadThroughput: 1.5e6 / 8 },
  cable: { latency: 20, downloadThroughput: 30e6 / 8, uploadThroughput: 5e6 / 8 },
};
async function loadtest() {
  reducedMotion = false;
  const W = +(process.env.QA_W || 1440), H = +(process.env.QA_H || 900);
  const net = process.env.QA_NET || (W < H ? '4g' : 'cable');
  const touch = W < H;
  await viewport(W, H, touch ? { mobile: true, touch: true } : {});
  if (touch) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.clearBrowserCache');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, ...NETS[net] });
  const bytes = {}; const reqs = new Map(); let total = 0;
  const h = d => {
    if (d.method === 'Network.responseReceived') reqs.set(d.params.requestId, { url: d.params.response.url, type: d.params.type });
    if (d.method === 'Network.loadingFinished') { const r = reqs.get(d.params.requestId); const n = d.params.encodedDataLength; total += n; if (r) { const k = r.type || 'Other'; bytes[k] = (bytes[k] || 0) + n; r.bytes = n; } }
  };
  cdp.on(h);
  const { identifier } = await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__lm={};
    new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(e.name==='first-contentful-paint')__lm.fcp=Math.round(e.startTime)})).observe({type:'paint',buffered:true});
    new PerformanceObserver(l=>{const e=l.getEntries().pop();__lm.lcp=Math.round(e.startTime);__lm.lcpEl=(e.element&&(e.element.className||e.element.tagName))+' '+(e.url||'').split('/').pop()}).observe({type:'largest-contentful-paint',buffered:true});
    document.addEventListener('DOMContentLoaded',()=>{__lm.dcl=Math.round(performance.now());
      const st=document.querySelector('[data-stage]');if(!st)return;
      new MutationObserver(()=>{if(st.classList.contains('video-ready')&&!__lm.ready)__lm.ready=Math.round(performance.now());if(st.classList.contains('video-hq')&&!__lm.hq)__lm.hq=Math.round(performance.now())}).observe(st,{attributes:true,attributeFilter:['class']});
    });
    addEventListener('load',()=>{__lm.load=Math.round(performance.now())});` });
  requests = [];
  await cdp.send('Page.navigate', { url: BASE });
  const t0 = Date.now();
  let lm = {};
  while (Date.now() - t0 < 90000) {
    await sleep(500);
    try { lm = await ev('window.__lm || {}'); } catch { continue; }
    if (lm.load && (lm.hq || (lm.ready && !(await ev('!!document.querySelector("[data-stage]")?.dataset.hasHq'))))) break;
  }
  await sleep(500);
  lm = await ev('window.__lm || {}');
  const origins = [...new Set([...reqs.values()].map(r => new URL(r.url).origin))];
  const kb = n => Math.round(n / 1024);
  report.checks.loadtest = { viewport: `${W}x${H}`, net, cpu: touch ? 4 : 1, firstPaintMs: lm.fcp, largestPaintMs: lm.lcp, largestPaintEl: lm.lcpEl, domReadyMs: lm.dcl, loadMs: lm.load,
    scrubReadyMs: lm.ready, fullQualityMs: lm.hq, totalKB: kb(total), byTypeKB: Object.fromEntries(Object.entries(bytes).map(([k, v]) => [k, kb(v)])),
    requests: reqs.size, origins, biggest: [...reqs.values()].filter(r => r.bytes).sort((a, b) => b.bytes - a.bytes).slice(0, 6).map(r => kb(r.bytes) + 'KB ' + r.url.split('/').pop().split('?')[0]),
    consoleErrors: [...consoleErrors] };
  cdp.handlers = cdp.handlers.filter(x => x !== h);
  await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
  if (touch) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
}

// phone scrub: the 9:16 cut loads, scrubs, and every band shows in its range (390x844 touch by default)
async function phone() {
  reducedMotion = false;
  const W = +(process.env.QA_W || 390), H = +(process.env.QA_H || 844);
  await viewport(W, H, { mobile: true, touch: true });
  await load();
  const vid = await waitVideo();
  const res = {
    video: vid,
    scrubShown: await ev(`getComputedStyle(document.querySelector('.hero-scrub')).display`),
    staticShown: await ev(`getComputedStyle(document.querySelector('.hero-static')).display`),
    phoneCut: requests.some(u => u.includes('hero-scrub-m.mp4')),
    desktopCut: requests.some(u => /hero-scrub\.mp4/.test(u)),
    positions: {}
  };
  for (const p of [0, 0.38, 0.64, 0.9, 1]) {
    const y = await heroScrollFor(p); await scrollToY(y, 1800);
    res.positions[p] = await probe();
    await shot(`phone-${W}-hero-${String(p).replace('.', '_')}`);
  }
  // one thumb swipe from the top, like a real visitor
  await ev('window.scrollTo(0,0)'); await sleep(800);
  await cdp.send('Input.synthesizeScrollGesture', { x: Math.round(W / 2), y: Math.round(H * 0.7), yDistance: -Math.round(H * 0.6), gestureSourceType: 'touch', speed: 1600 });
  await sleep(1500);
  res.afterSwipe = await probe();
  res.overflowX = await ev(`document.documentElement.scrollWidth - innerWidth`);
  res.consoleErrors = [...consoleErrors];
  report.checks.phone = res;
}

// phone tour: screenshot the whole page viewport by viewport (390x844, touch)
async function mtour() {
  reducedMotion = false;
  const W = +(process.env.QA_W || 390), H = +(process.env.QA_H || 844);
  await viewport(W, H, { mobile: true, touch: true });
  await load();
  await sleep(1500);
  const total = await ev('document.documentElement.scrollHeight');
  const shots = [];
  let i = 0;
  for (let y = 0; y < total; y += Math.round(H * 0.85)) {
    await ev(`window.scrollTo(0, ${y})`);
    await sleep(1300);
    const name = `mtour-${W}-${String(i).padStart(2, '0')}`;
    await shot(name); shots.push(name); i++;
  }
  report.checks.mtour = { total, shots: shots.length, overflowX: await ev(`document.documentElement.scrollWidth - innerWidth`), consoleErrors: [...consoleErrors] };
}

/* hero steps: two stops (opening 0, food 1), whatever the strength of the gesture */
async function steps() {
  reducedMotion = false;
  const res = { desktop: {}, touch: {} };
  const geo = () => ev(`(()=>{const h=document.querySelector('[data-hero]');return {top:h.offsetTop,range:h.offsetHeight-innerHeight}})()`);
  const where = async () => { const g = await geo(); const y = await ev('Math.round(scrollY)'); return { y, p: +((y - g.top) / g.range).toFixed(3) }; };
  const wheel = (dy, x = 720, y = 450) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: dy });
  const key = async k => { await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: { ArrowDown: 40, ArrowUp: 38, PageDown: 34, ' ': 32 }[k] || 0 }); await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k }); };
  const fresh = async () => { await load(); await waitVideo(); await ev('window.scrollTo(0,0)'); await sleep(900); };
  const bandOps = async () => (await probe()).bands.map(b => b.op);

  await viewport(1440, 900);
  const D = res.desktop;
  const STEP = 3800;
  // 1. a feather-light flick goes the whole way; a violent spin does the same
  await fresh();
  await wheel(8); await sleep(STEP); D.weakFlick = await where();
  await fresh();
  for (let i = 0; i < 40; i++) { await wheel(240); await sleep(12); } await sleep(STEP); D.hardSpin = await where();
  // 2. one more flick passes on to the page (past the hero)
  await wheel(120); await sleep(1800); D.afterLast = await where();
  // 3. back up: from the food, one upward gesture returns to the opening
  const g = await geo();
  await ev(`window.scrollTo(0, ${g.top + g.range})`); await sleep(900);
  await wheel(-60); await sleep(STEP); D.upOnce = await where();
  await wheel(-60); await sleep(1200); D.upAtTop = await where();
  // 4. a trackpad flick with a long, decaying inertia tail must stop at the food, not carry on
  await fresh();
  for (let i = 0; i < 90; i++) { await wheel(Math.max(1, Math.round(300 * Math.pow(0.96, i)))); await sleep(16); }
  await sleep(STEP); D.inertiaTail = await where();
  // 5. keyboard: one press = one step
  await fresh();
  await key('ArrowDown'); await sleep(STEP); D.keyDown = await where();
  await key('ArrowUp'); await sleep(STEP); D.keyUp = await where();
  // 6. smoothness: frame pacing and video progress while the step plays (run with QA_GPU=1 for real numbers)
  await fresh();
  const rec = `(()=>{const v=document.querySelector('[data-video]');window.__rec={a:[],on:true};let last=performance.now();const f=t=>{if(!window.__rec.on)return;window.__rec.a.push([t-last,v.currentTime,scrollY]);last=t;requestAnimationFrame(f)};requestAnimationFrame(f)})()`;
  const stat = () => ev(`(()=>{window.__rec.on=false;const a=window.__rec.a.slice(2);const dts=a.map(r=>r[0]).sort((x,y)=>x-y);const q=p=>dts[Math.min(dts.length-1,Math.floor(p*dts.length))];
    let stale=0,moving=0,maxJump=0;for(let i=1;i<a.length;i++){const dy=Math.abs(a[i][2]-a[i-1][2]);if(dy>2){moving++;if(a[i][1]===a[i-1][1])stale++;} maxJump=Math.max(maxJump,Math.abs(a[i][1]-a[i-1][1]));}
    return {frames:a.length,dtMedian:+q(.5).toFixed(1),dtP95:+q(.95).toFixed(1),dtMax:+dts[dts.length-1].toFixed(1),over25ms:dts.filter(x=>x>25).length,movingFrames:moving,staleVideoFrames:stale,maxVideoJumpSec:+maxJump.toFixed(3)}})()`);
  await ev(rec); await wheel(100); await sleep(STEP); D.smooth = await stat();
  // 7. captions at the two stops (bands: Two kitchens, Birria and falafel, Walk up)
  await fresh();
  await sleep(500); D.captionsOpening = await bandOps(); await shot('steps-opening');
  await wheel(100); await sleep(STEP); D.captionsFood = await bandOps(); await shot('steps-food');

  // touch: a short drag and a long swipe both take the one step
  const T = res.touch;
  const swipe = async (dy, ms = 120) => {
    const x = 195, y0 = dy > 0 ? 600 : 250;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
    for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 - dy * i / 6 }] }); await sleep(ms / 6); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  await viewport(390, 844, { mobile: true, touch: true });
  await fresh();
  await swipe(40); await sleep(STEP); T.shortSwipe = await where(); await shot('steps-phone-food');
  await swipe(-40); await sleep(STEP); T.swipeBack = await where();
  await swipe(560, 90); await sleep(STEP); T.longSwipe = await where();
  res.consoleErrors = [...consoleErrors];
  report.checks.steps = res;
}

try {
  const run = { steps, bandperf, desktop, flick, mobile, reduced, novideo, nopreview, swap, flip, audit, nojs, keys, file, mtour, phone, perf, loadtest };
  if (MODE === 'all') { for (const k of ['desktop', 'mobile', 'reduced', 'novideo', 'flip', 'flick', 'audit']) await run[k](); }
  else await run[MODE]();
} catch (e) { report.error = String(e.stack || e); }
fs.writeFileSync(path.join(OUT, `report-${MODE}.json`), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
chrome.kill(); server.close();
process.exit(0);
