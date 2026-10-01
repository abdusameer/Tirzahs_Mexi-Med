# Phase 1 — Build Report ("Walk up to the window")

Unofficial private concept. `noindex`, footer disclaimer, not deployed.

## What was built

`site/` is the whole deployable site: `index.html` plus `assets/` (plain HTML, CSS, JavaScript, no build step). Open `site/index.html` directly (double-click works, including the scroll video in Chrome), or serve the folder with any static server.

Sections, in order: scroll-scrubbed hero (sky to counter) · Two kitchens (drag the window frame between the Mexican and Mediterranean counters) · Four plates to know · The menu (red wall chapter, tabs, 18 dishes with prices, drinks and more) · Good to know (amenities, Yelp rating, health grade, ownership badges) · FAQ · Visit (hours with live open/closed status in LA time, phone, directions, Order on Yelp) · Footer.

## Skills and stack

- **10k-websites** (the user's `~/Downloads/10k-websites` skill): the scroll-scrubbed Higgsfield hero, Blob loader with progress ring and watchdog, dt-normalized lerp, gated seeks, delta-gated DOM writes, paced caption bands, five live static-hero gates, complete-without-video, copy gate.
- **build-awwwards-quality-sites**: GSAP + ScrollTrigger choreography (masked word reveals with unsplit accessible names, batched fades, bounded parallax), **Lenis as the only smooth-scroll engine** (off under reduced motion), visible focus, 44px touch targets.
- **Three.js: not used.** The scrubbed video already carries the hero's depth, so a WebGL canvas would add weight with no job.
- Deviation said out loud: the 10k skill says it governs alone; the user asked for both skills together, so the 10k hero pipeline and the Awwwards motion bar were combined, and GSAP and Lenis load from jsDelivr (no npm, still no build step).

## Assets (all Higgsfield, all labeled on the page)

- Hero video: Seedance 2.5 (Seedance 2.0 failed three times on Higgsfield's side, refunded; the user chose 2.5). Start frame and end frame come from one tall GPT Image 2.5 photo, so the two ends match. Encoded at crf 22 with a keyframe every 8 frames: 6.7 MB.
- Seam slider pair: Nano Banana Pro edits of the ending frame (backgrounds line up).
- 18 dishes, 5 menu-group images, hero window, papel picado, brick: GPT Image 2.5.
- Log: `site/assets/PROVENANCE.txt` and `photos/generated/PROVENANCE.md`.
- Credits this phase: tall photo 4.25, start frame 2.75, seam pair 4, video 72. Balance after: 602.

## Validation (headless Chrome, `qa/qa.mjs` + `qa/audit.py`)

| Check | Result |
|---|---|
| Scrub tracks scroll | p 0.64 → 3.83 s, p 0.9 → 5.39 s of 6.04 s; every band on in its range |
| Flick test (wheel 120 / 240 / 360 px) | fully readable for 7, 6, 6, 12 normal flicks; no band skippable at 360 px |
| Worst-frame legibility (glyphs hidden, real composited frames) | worst per band 8.55, 6.13, 6.37, 5.37 : 1 (floor 3.5) |
| Phones 390×844, 375×667 (touch) | static hero, no video or poster downloaded, no sideways scroll, menu sheet with focus trap, Escape closes |
| Reduced motion | static hero, no video, no Lenis, all content visible; live flip on and off re-arms the scrub and Lenis |
| Video blocked | poster shows, bands still work, zero console errors |
| JavaScript off | static hero, all five menu panels visible, no video request |
| Keyboard | skip link, nav, CTA, slider (arrow keys move it), tabs; 3 px focus ring everywhere |
| Double-click (file://) | scroll video loads and scrubs |
| Console errors / horizontal overflow | none / 0 px at every size tested |
| Copy gate | zero em dashes, zero stock words, no AI-tell phrasing |

## Mobile pass (2026-09-30)

- Phones and upright tablets now scrub their own 9:16 cut of the same descent (Kling 3.0 Pro at the user's choice, 10.5 credits; encoded 900 px wide, crf 25, keyframe every 8 frames: 3.6 MB). Landscape screens keep the 16:9 cut; rotating swaps cuts mid-visit. A muted play/pause primes the decoder so iOS Safari paints seeked frames.
- Static hero only for phones held sideways and reduced motion (the two gates match in CSS and JS).
- Phone bands are full width with deeper scrims: worst-frame contrast 7.29, 7.70, 7.17, 7.51 : 1 at 390×844.
- Menu tabs and dish cards are snap-scrolling rows on phones ("Swipe for more dishes"); square slider and plate photos; solid nav; balanced line breaks.
- Verified headless at 390×844 and 375×667 (touch): the phone cut loads (not the desktop cut), scrub tracks scroll, a thumb swipe moves it, no sideways scroll, no console errors. Still needs a check on a real phone.

## Performance pass (2026-09-30)

Measured with `node qa/qa.mjs perf` (headless Chrome with GPU, full-page scroll: wheel on desktop, touch swipes on a phone with the CPU slowed 4×), three alternating runs each against the previous commit.

| Phone 390×844, CPU 4× | Before | After |
|---|---|---|
| Average fps | 57.4 | 59.6 |
| Hero fps | 54.0 | 59.9 |
| p99 frame | 27.8 ms | 16.8 ms |
| Frames over 20 ms | 1.5% | 0.4% |
| Long tasks | 0.7 per run (59 ms) | 0 |
| Style + script time | 0.95 s | 0.61 s |
| Animations running offscreen | papel sway, seam nudge | none |

Desktop 1440×900 held 60 fps (five of six new runs at 60.0 to 60.1 with 0 to 2 slow frames; one run had a single 683 ms stall with no main-thread task, not reproduced in three reruns).

Changes: hero seeks skip when the target is within half a frame (no re-decoding the same picture); hero geometry cached (no layout reads while scrolling); only on-screen bands get their own layer; parallax images and the slider move on the compositor; no backdrop blur behind the hero chip; no blend mode on the full-screen grain; two-layer text shadow; loops paused per element when offscreen; background drift off on touch screens; smaller phone versions of the Visit photo and papel picado.

## Load-speed pass (2026-10-01)

Measured with `QA_H2=1 node qa/qa.mjs loadtest` (empty cache, HTTP/2 like GitHub Pages; phone at 4× CPU), the live version against the new build:

| | First paint | Largest paint | Scrub ready | Full quality |
|---|---|---|---|---|
| Phone 4G, before | 0.45 s | 0.88 s | 4.3 s | n/a |
| Phone 4G, after | 0.45 s | 0.87 s | 1.4 s | 4.8 s |
| Phone slow 4G, before | 0.69 s | 1.94 s | 20.7 s | n/a |
| Phone slow 4G, after | 0.82 s | 1.81 s | 5.2 s | 23.6 s |
| Desktop cable, before | 0.44 s | 0.52 s | 2.4 s | n/a |
| Desktop cable, after | 0.23 s | 0.32 s | 0.45 s | 2.3 s |

Changes: a small preview cut of each hero clip (466 KB / 511 KB, same keyframe density) loads first so scrubbing starts at once; the full-quality cut downloads behind it and swaps in instantly on the current frame (data-saver visitors stay on the preview; a missing preview falls back to the full file). Fonts (latin subsets) and GSAP / ScrollTrigger / Lenis are self-hosted, so the page talks to one origin instead of four. Posters are WebP (142 KB / 62 KB, from 330 / 117 KB) and declared in CSS. site.js runs before the motion libraries, so the hero starts loading without waiting for them. Preloads were tried and removed: on slow 4G they competed with the stylesheet and delayed first paint.

Verified: scrub on the preview, the swap under a throttled phone while scrolling (all frames on target, one video left afterwards), preview missing, both videos missing, file://, phones, reduced motion, keyboard, no JS, flick test, and 60 fps scroll on desktop and phone (4× CPU).

## Known limits

- The video's last second still pushes in slightly; the scroll rests on the pinned end frame, so the settle reads as arriving.
- The "Choice of meat" note still uses the review-based list; the user's window photo shows a card with carne asada, pollo, birria, KBBQ asada, KBBQ chicken, falafel and jackfruit carnitas (open question).
- The footer still says "Unofficial website concept. Not affiliated..." and the page is `noindex`, per the Phase 0 rules.
- og:url and og:image are blank until a deploy (marked `DEPLOY STEP`).
