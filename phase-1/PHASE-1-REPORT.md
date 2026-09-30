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

## Known limits

- The video's last second still pushes in slightly; the scroll rests on the pinned end frame, so the settle reads as arriving.
- The "Choice of meat" note still uses the review-based list; the user's window photo shows a card with carne asada, pollo, birria, KBBQ asada, KBBQ chicken, falafel and jackfruit carnitas (open question).
- The footer still says "Unofficial website concept. Not affiliated..." and the page is `noindex`, per the Phase 0 rules.
- og:url and og:image are blank until a deploy (marked `DEPLOY STEP`).
