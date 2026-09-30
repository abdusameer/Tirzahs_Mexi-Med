/* Tirzahs · "Walk up to the window"
   Hero: 10k-websites scrub standard (Blob fetch + ring, dt-normalized lerp, gated seeks,
   delta-gated writes, paced bands, five live static-hero gates).
   Page: GSAP + ScrollTrigger choreography, Lenis as the only smooth-scroll engine. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const smoothstep = (p, e0, e1) => { const t = clamp((p - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const rng = seed => { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const NAV_H = 72;
  let lenis = null;       // the one smooth-scroll engine (null under reduced motion)
  let motionOn = false;   // GSAP choreography armed

  /* ---------- pause every loop on hidden tabs; living elements only run in view ---------- */
  document.addEventListener('visibilitychange', () => document.body.classList.toggle('paused', document.hidden));
  // observe the animated elements themselves, so each loop stops the moment its own element leaves the screen
  const viewIO = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('in-view', e.isIntersecting)), { threshold: 0.01 });
  $$('.papel, [data-status]').forEach(el => viewIO.observe(el));

  /* ---------- icons (Solar via Iconify, inlined in icons.js) ---------- */
  const ICONS = window.TZ_ICONS || {};
  $$('[data-icon]').forEach(el => { const svg = ICONS[el.dataset.icon]; if (svg) { el.innerHTML = svg; el.setAttribute('aria-hidden', 'true'); } });

  /* ======================================================================
     HERO SCRUB
     ====================================================================== */
  // Two cuts of the same descent: 16:9 for landscape screens, 9:16 for portrait (phones, tablets held upright).
  // Byte sizes are the fallback when Content-Length is missing.
  const VARIANTS = {
    land: { video: 'assets/hero-scrub.mp4', poster: 'assets/hero-poster.jpg', bytes: 6701623 },
    port: { video: 'assets/hero-scrub-m.mp4', poster: 'assets/hero-poster-m.jpg', bytes: 3579785 }
  };
  const PORTRAIT = matchMedia('(orientation: portrait)');
  const variantNow = () => (PORTRAIT.matches ? 'port' : 'land');
  // Static-hero gates (identical strings in site.css): phones held sideways have no room, reduced motion gets no video.
  const GATES = [
    '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)',
    '(prefers-reduced-motion: reduce)'
  ];

  const hero = $('[data-hero]');
  const stage = $('[data-stage]');
  const video = $('[data-video]');
  const posterLayer = $('[data-poster]');
  const ring = $('[data-ring]');
  const cue = $('[data-cue]');

  function splitBand(el, mode, spread) {
    const text = el.textContent.trim();
    const r = rng(text.length * 97 + mode.length * 13);
    el.textContent = '';
    const sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = text;
    const vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true');
    const words = text.split(' ');
    const total = text.replace(/ /g, '').length;
    let ci = 0;
    words.forEach((word, wi) => {
      const w = document.createElement('span'); w.className = 'w';
      if (mode === 'drift' || mode === 'rise') {
        w.style.setProperty('--th', (wi / words.length * 0.5 + r() * 0.04).toFixed(3));
        w.textContent = word;
      } else {
        [...word].forEach(ch => {
          const c = document.createElement('span'); c.className = 'c'; c.textContent = ch;
          const order = ci / total * spread;
          if (mode === 'flutter') {
            c.style.setProperty('--th', (order + r() * 0.06).toFixed(3));
            c.style.setProperty('--jy', ((ci % 2 ? 1 : -1) * (18 + r() * 16)).toFixed(1) + 'px');
            c.style.setProperty('--jr', ((r() - 0.5) * 16).toFixed(1) + 'deg');
          } else { // slide, like a sliding service window
            c.style.setProperty('--th', (order + r() * 0.04).toFixed(3));
            c.style.setProperty('--jx', (26 + r() * 18).toFixed(1) + 'px');
          }
          w.appendChild(c); ci++;
        });
      }
      vis.appendChild(w);
      if (wi < words.length - 1) vis.appendChild(document.createTextNode(' '));
    });
    el.append(sr, vis);
  }

  const bands = $$('[data-band]').map(el => ({
    el, a: +el.dataset.a, b: +el.dataset.b,
    ramp: el.dataset.ramp ? +el.dataset.ramp : null,
    ctas: $('[data-settle-ctas]', el),
    op: -1, k: -1, live: null
  }));
  bands.forEach(b => { const t = $('[data-split]', b.el); if (t) splitBand(t, t.dataset.split, +(b.el.dataset.spread || 0.5)); });

  let scrubOn = false, heroInit = false, heroOnScreen = true;
  let target = 0, shown = 0, rafId = null, lastTick = 0;
  let seekBusy = false, pendingTime = null, lastSeek = -1;
  let loadK = 0, loadStart = 0, cueGone = null;
  const HALF_FRAME = 1 / 48; // the clips are 24 fps: a seek closer than half a frame shows the same picture

  // hero geometry is cached, so scrolling never forces a layout read; re-measured on resize and layout changes
  let heroTop = 0, heroRange = 1;
  function measureHero() {
    heroTop = hero.getBoundingClientRect().top + scrollY;
    heroRange = Math.max(1, hero.offsetHeight - stage.offsetHeight); // the stage is 100svh, so the phone toolbar never shifts progress
  }
  function heroProgress() { return clamp((scrollY - heroTop) / heroRange, 0, 1); }

  function requestSeek(t, force) {
    if (!video.duration || !isFinite(video.duration)) return;
    if (seekBusy) { pendingTime = t; return; }
    if (!force && Math.abs(t - lastSeek) < HALF_FRAME) return; // same frame: skip the decode
    seekBusy = true;
    lastSeek = t;
    video.currentTime = t;
  }
  video.addEventListener('seeked', () => {
    seekBusy = false;
    if (pendingTime !== null) { const t = pendingTime; pendingTime = null; requestSeek(t); }
  });
  video.addEventListener('error', () => { seekBusy = false; pendingTime = null; failVideo(); });
  const timeFor = p => p * Math.max(0, (video.duration || 0) - 0.05);

  function updateCaptions(p) {
    const n = bands.length;
    for (let i = 0; i < n; i++) {
      const b = bands[i];
      const f = Math.min(0.02, (b.b - b.a) / 3);
      const inO = i === 0 ? 1 : smoothstep(p, b.a, b.a + f);
      const outO = i === n - 1 ? 1 : 1 - smoothstep(p, b.b - f, b.b);
      const op = Math.round(inO * outO * 1000) / 1000;
      const ramp = b.ramp || Math.min(0.025, (b.b - b.a) * 0.35);
      let k = clamp((p - b.a) / ramp, 0, 1);
      if (i === 0) k = Math.max(k, loadK);
      if (op !== b.op) {
        if ((op > 0) !== (b.op > 0)) b.el.classList.toggle('on', op > 0); // promote only the bands on screen
        b.op = op; b.el.style.opacity = op;
      }
      if (Math.abs(k - b.k) > 0.008 || (k === 1 && b.k !== 1) || (k === 0 && b.k !== 0)) { b.k = k; b.el.style.setProperty('--k', k.toFixed(3)); }
      if (b.ctas) { const live = op > 0.6; if (live !== b.live) { b.live = live; b.ctas.inert = !live; } }
    }
    const gone = p > 0.03;
    if (gone !== cueGone) { cueGone = gone; cue.classList.toggle('gone', gone); }
  }

  function tick(now) {
    const dt = Math.min(100, now - (lastTick || now));
    lastTick = now;
    const k = 0.2; // Lenis already smooths the wheel, so this lerp stays light
    shown += (target - shown) * (1 - Math.pow(1 - k, dt / 16.667));
    if (Math.abs(target - shown) < 0.0005) { shown = target; rafId = null; lastTick = 0; }
    else rafId = requestAnimationFrame(tick);
    requestSeek(timeFor(shown));
    updateCaptions(shown);
  }
  function onScroll() {
    target = heroProgress();
    if (rafId === null && heroOnScreen) rafId = requestAnimationFrame(tick);
  }

  function loadRamp(now) {
    const t = clamp((now - loadStart) / 1400, 0, 1);
    loadK = 1 - Math.pow(1 - t, 3);
    if (scrubOn) updateCaptions(shown);
    if (t < 1) requestAnimationFrame(loadRamp);
  }

  let loaded = null, loadToken = 0, blobUrl = null;

  function initHeroOnce() {
    if (!heroInit) {
      heroInit = true;
      loadStart = performance.now();
      requestAnimationFrame(loadRamp);
    }
    loadVariant(variantNow());
  }

  // Poster first, then the video streams in behind the ring. A newer call (rotation) cancels an older one.
  function loadVariant(v) {
    if (loaded === v) return;
    loaded = v;
    const token = ++loadToken;
    const { poster } = VARIANTS[v];
    stage.classList.remove('video-ready', 'video-failed');
    ring.style.setProperty('--ld', 126);
    seekBusy = false; pendingTime = null; lastSeek = -1;
    posterLayer.style.backgroundImage = `url('${poster}')`;
    let started = false;
    const start = () => { if (started || token !== loadToken) return; started = true; loadHeroVideo(v, token).catch(() => { if (token === loadToken) failVideo(); }); };
    const img = new Image();
    img.onload = start; img.onerror = start; img.src = poster;
    setTimeout(start, 4000);
  }

  async function loadHeroVideo(v, token) {
    const { video: url, bytes } = VARIANTS[v];
    if (location.protocol === 'file:') { // double-click preview: fetch is blocked, play the file directly
      video.src = url; video.load(); whenReady(token); ring.style.setProperty('--ld', 0); return;
    }
    const ctrl = new AbortController();
    let watchdog = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch(url, { priority: 'low', signal: ctrl.signal });
    if (!res.ok || !res.body) throw new Error('video ' + res.status);
    const total = Number(res.headers.get('Content-Length')) || bytes;
    const reader = res.body.getReader();
    const chunks = [];
    let got = 0, lastRing = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (token !== loadToken) { ctrl.abort(); clearTimeout(watchdog); return; }
      clearTimeout(watchdog);
      watchdog = setTimeout(() => ctrl.abort(), 20000);
      chunks.push(value);
      got += value.length;
      const frac = Math.min(1, got / total);
      const now = performance.now();
      if (now - lastRing > 100 || frac === 1) { lastRing = now; ring.style.setProperty('--ld', Math.round(126 * (1 - frac))); }
    }
    clearTimeout(watchdog);
    if (token !== loadToken) return;
    ring.style.setProperty('--ld', 0);
    const old = blobUrl;
    blobUrl = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
    video.src = blobUrl;
    if (old) URL.revokeObjectURL(old);
    video.load();
    whenReady(token);
  }
  function whenReady(token) {
    video.addEventListener('canplay', () => {
      if (token !== loadToken) return;
      const reveal = () => { stage.classList.add('video-ready'); requestSeek(timeFor(heroProgress()), true); };
      // iOS Safari only paints seeked frames after the video has played once: a muted play/pause wakes the decoder.
      const p = video.play();
      if (p && p.then) p.then(() => { video.pause(); reveal(); }).catch(reveal);
      else { video.pause(); reveal(); }
    }, { once: true });
  }
  function failVideo() { stage.classList.add('video-failed'); }
  PORTRAIT.addEventListener('change', () => { if (scrubOn) { loadVariant(variantNow()); onScroll(); } });

  let resizeQueued = false;
  function onResize() {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => { resizeQueued = false; measureHero(); if (scrubOn) onScroll(); });
  }
  new ResizeObserver(onResize).observe(hero);
  addEventListener('load', onResize, { once: true });

  function enableScrub() {
    if (scrubOn) return;
    scrubOn = true;
    measureHero();
    initHeroOnce();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onResize, { passive: true });
    bands.forEach(b => { b.op = -1; b.k = -1; b.live = null; });
    cueGone = null;
    target = shown = heroProgress();
    updateCaptions(shown);
    onScroll();
  }
  function disableScrub() {
    if (!scrubOn) return;
    scrubOn = false;
    removeEventListener('scroll', onScroll);
    removeEventListener('resize', onResize);
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  }
  const MQLS = GATES.map(q => matchMedia(q));
  function applyHeroMode() { if (MQLS.some(m => m.matches)) disableScrub(); else enableScrub(); }
  MQLS.forEach(m => m.addEventListener('change', applyHeroMode));
  applyHeroMode();
  new IntersectionObserver(([e]) => { heroOnScreen = e.isIntersecting; if (heroOnScreen && scrubOn) onScroll(); }).observe(hero);

  /* ======================================================================
     NAV + MOBILE SHEET
     ====================================================================== */
  const nav = $('[data-nav]');
  const heroSection = $('.hero');
  new IntersectionObserver(([e]) => nav.classList.toggle('solid', !e.isIntersecting), { rootMargin: `-${NAV_H}px 0px 0px 0px` }).observe(heroSection);

  const sheet = $('[data-sheet]');
  const openBtn = $('[data-sheet-open]');
  const closeBtn = $('[data-sheet-close]');
  let lastFocus = null;
  function openSheet() {
    lastFocus = document.activeElement;
    sheet.hidden = false;
    openBtn.setAttribute('aria-expanded', 'true');
    document.documentElement.style.overflow = 'hidden';
    if (lenis) lenis.stop();
    closeBtn.focus();
  }
  function closeSheet(restore = true) {
    sheet.hidden = true;
    openBtn.setAttribute('aria-expanded', 'false');
    document.documentElement.style.overflow = '';
    if (lenis) lenis.start();
    if (restore && lastFocus) lastFocus.focus();
  }
  openBtn.addEventListener('click', openSheet);
  closeBtn.addEventListener('click', () => closeSheet());
  sheet.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeSheet(); return; }
    if (e.key !== 'Tab') return;
    const f = $$('a, button', sheet);
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  $$('[data-sheet-link]').forEach(a => a.addEventListener('click', () => closeSheet(false)));

  /* ======================================================================
     MENU TABS
     ====================================================================== */
  const tabs = $$('[role="tab"]');
  const panels = $$('[data-panel]');
  function selectTab(tab, focus) {
    tabs.forEach(t => { const on = t === tab; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
    panels.forEach(p => { p.hidden = p.id !== tab.getAttribute('aria-controls'); });
    if (focus) tab.focus();
    if (motionOn) ScrollTrigger.refresh();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', e => {
      let j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = tabs.length - 1;
      if (j !== null) { e.preventDefault(); selectTab(tabs[j], true); }
    });
  });
  if (tabs.length) selectTab(tabs[0]);

  /* ======================================================================
     THE SEAM (the one interactive moment)
     ====================================================================== */
  const seam = $('[data-seam]');
  const handle = $('[data-seam-handle]');
  const frame = $('.seam-frame', seam);
  const meet = $('[data-meet]');
  let seamVal = 50, dragging = false;
  function setSeam(v) {
    seamVal = clamp(v, 0, 100);
    seam.style.setProperty('--seam', seamVal + '%');
    handle.setAttribute('aria-valuenow', Math.round(seamVal));
    const side = seamVal >= 65 ? 'mex' : seamVal <= 35 ? 'med' : 'both';
    handle.setAttribute('aria-valuetext',
      side === 'mex' ? 'Mostly the Mexican kitchen' : side === 'med' ? 'Mostly the Mediterranean kitchen' : 'Half Mexican kitchen, half Mediterranean kitchen');
    const cls = 'meet is-' + side;
    if (meet.className !== cls) meet.className = cls;
  }
  const fromX = x => { const r = frame.getBoundingClientRect(); return (x - r.left) / r.width * 100; };
  $$('img', frame).forEach(img => { img.draggable = false; });
  frame.addEventListener('dragstart', e => e.preventDefault()); // a native image drag would cancel the pointer stream
  frame.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    dragging = true; seam.classList.add('dragging');
    frame.setPointerCapture(e.pointerId);
    setSeam(fromX(e.clientX));
  });
  frame.addEventListener('pointermove', e => { if (dragging) setSeam(fromX(e.clientX)); });
  const endDrag = () => { dragging = false; seam.classList.remove('dragging'); };
  frame.addEventListener('pointerup', endDrag);
  frame.addEventListener('pointercancel', endDrag);
  handle.addEventListener('keydown', e => {
    const step = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -20, PageUp: 20 }[e.key];
    if (step) { e.preventDefault(); setSeam(seamVal + step); }
    else if (e.key === 'Home') { e.preventDefault(); setSeam(0); }
    else if (e.key === 'End') { e.preventDefault(); setSeam(100); }
  });
  setSeam(50);
  seam.addEventListener('animationend', e => { if (e.animationName === 'nudge') seam.classList.remove('nudge'); });
  if (!RM.matches) {
    const nudgeIO = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { seam.classList.add('nudge'); nudgeIO.disconnect(); }
    }, { threshold: 0.6 });
    nudgeIO.observe(seam);
  }

  /* ======================================================================
     OPEN NOW (Los Angeles time)
     ====================================================================== */
  const HOURS = { 0: [11, 14], 1: [11, 19], 2: [11, 19], 3: [11, 19], 4: [11, 19], 5: [11, 19], 6: null };
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const fmt = h => (h > 12 ? h - 12 : h) + (h >= 12 ? ' PM' : ' AM');
  function laNow() {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
    const get = t => parts.find(p => p.type === t).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { day, hour: (+get('hour') % 24) + (+get('minute')) / 60 };
  }
  function updateStatus() {
    const el = $('[data-status]');
    if (!el) return;
    const { day, hour } = laNow();
    $$('.hours tr').forEach(tr => tr.classList.toggle('today', +tr.dataset.day === day));
    const today = HOURS[day];
    let text, open = false;
    if (today && hour >= today[0] && hour < today[1]) { open = true; text = `Open now · until ${fmt(today[1])}`; }
    else if (today && hour < today[0]) text = `Closed now · opens today at ${fmt(today[0])}`;
    else {
      let d = (day + 1) % 7; while (!HOURS[d]) d = (d + 1) % 7;
      text = `Closed now · opens ${d === (day + 1) % 7 ? 'tomorrow' : DAY_NAMES[d]} at ${fmt(HOURS[d][0])}`;
    }
    el.classList.toggle('open', open);
    const t = $('[data-status-text]', el);
    if (t.textContent !== text) t.textContent = text;
  }
  updateStatus();
  setInterval(updateStatus, 60000);

  /* ======================================================================
     MOTION: Lenis (only smooth-scroll engine) + GSAP choreography
     ====================================================================== */
  function splitReveal(h) {
    if (h.dataset.split === 'done') return;
    h.dataset.split = 'done';
    const text = h.textContent.trim();
    h.textContent = '';
    const sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = text;
    const vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true');
    text.split(' ').forEach((w, i, arr) => {
      const o = document.createElement('span'); o.className = 'rw';
      const inn = document.createElement('span'); inn.className = 'ri'; inn.textContent = w;
      o.appendChild(inn); vis.appendChild(o);
      if (i < arr.length - 1) vis.appendChild(document.createTextNode(' '));
    });
    h.append(sr, vis);
  }

  function startLenis() {
    if (lenis || !window.Lenis || !window.gsap || RM.matches) return;
    lenis = new Lenis({ lerp: 0.11, smoothWheel: true });
    if (window.ScrollTrigger) lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(lenisRaf);
    gsap.ticker.lagSmoothing(0);
  }
  function lenisRaf(t) { if (lenis) lenis.raf(t * 1000); }
  function stopLenis() {
    if (!lenis) return;
    gsap.ticker.remove(lenisRaf);
    lenis.destroy();
    lenis = null;
  }

  function startMotion() {
    if (motionOn || RM.matches || !window.gsap || !window.ScrollTrigger) return;
    motionOn = true;
    gsap.registerPlugin(ScrollTrigger);
    startLenis();

    $$('[data-reveal]').forEach(h => {
      splitReveal(h);
      gsap.fromTo($$('.ri', h), { yPercent: 110 }, {
        yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.06,
        scrollTrigger: { trigger: h, start: 'top 86%', once: true }
      });
    });

    const fades = $$('[data-fade]');
    gsap.set(fades, { opacity: 0, y: 28 });
    ScrollTrigger.batch(fades, {
      start: 'top 90%', once: true,
      onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.09, overwrite: true })
    });

    $$('[data-stagger]').forEach(list => {
      const kids = [...list.children];
      gsap.set(kids, { opacity: 0, y: 18 });
      ScrollTrigger.create({
        trigger: list, start: 'top 88%', once: true,
        onEnter: () => gsap.to(kids, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.06 })
      });
    });

    $$('[data-parallax]').forEach(img => {
      gsap.fromTo(img, { yPercent: -4.5 }, {
        yPercent: 4.5, ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
    addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  }

  function pinToFinalStates() {
    stopLenis();
    if (window.ScrollTrigger) ScrollTrigger.getAll().forEach(t => t.kill());
    if (window.gsap) {
      gsap.globalTimeline.clear();
      gsap.set($$('[data-fade], [data-stagger] > *, .ri, [data-parallax]'), { clearProps: 'opacity,transform' });
    }
    seam.classList.remove('nudge');
    motionOn = false;
  }

  RM.addEventListener('change', e => {
    if (e.matches) pinToFinalStates();
    else { startLenis(); }
    applyHeroMode();
  });

  /* in-page links: route through Lenis when it is running, then move focus for keyboard users */
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const dest = id === 'top' ? document.body : document.getElementById(id);
    if (!dest) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(id === 'top' ? 0 : dest, { offset: id === 'top' ? 0 : -NAV_H, duration: 1.4 });
    else if (id === 'top') scrollTo({ top: 0, behavior: RM.matches ? 'auto' : 'smooth' });
    else dest.scrollIntoView({ behavior: RM.matches ? 'auto' : 'smooth', block: 'start' });
    const focusEl = id === 'top' ? $('#main') : dest;
    if (!focusEl.hasAttribute('tabindex')) focusEl.setAttribute('tabindex', '-1');
    focusEl.focus({ preventScroll: true });
    history.replaceState(null, '', '#' + id);
  });

  startMotion();
})();
