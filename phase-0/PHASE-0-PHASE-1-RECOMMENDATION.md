# Phase 0 — Phase 1 Recommendation

## Recommendation
Build Phase 1 as a **single-page React + Vite + TypeScript** site in `~/Documents/tirzahs-mexi-terranean/site/`, with GSAP + ScrollTrigger, **Lenis** as the sole smooth-scroll engine, and one narrow **Three.js** hero-seam canvas with a CSS/poster fallback.

## Why this stack
- Matches the earlier BB's Bakery build (same tooling, QA scripts can be adapted).
- One page, no routing, no backend, no forms: no data risk.
- Lenis + GSAP ticker is simple to integrate and to tear down.
- The WebGL piece is isolated in one component so it can be cut if the kill criterion trips.

## Sequence
1. ~~Get answers to Q1–Q6~~ Done 2026-09-29: use everything from Yelp ([PHASE-0-OWNER-CONFIRMATION.md](PHASE-0-OWNER-CONFIRMATION.md)).
2. Approve generation budget: minimum 9 images ([PHASE-0-ASSET-MANIFEST.md](PHASE-0-ASSET-MANIFEST.md)).
3. Generate H1 first and check the concept; then cutouts, then textures.
4. Scaffold the site; build static, no-JS-complete HTML/CSS first.
5. Add GSAP choreography, then Lenis, then (last) the WebGL seam.
6. Validate: production build; desktop and mobile; keyboard and focus; no-JS; reduced motion; single scroll engine; teardown; a copy scan against the Content Map.

## Risks
| Risk | Mitigation |
| --- | --- |
| Generated food looks generic or wrong for the dish | Ingredient-locked prompts, review each image against the Yelp menu line, regenerate sparingly |
| Hero canvas hurts performance | DPR cap, offscreen pause, kill criterion, poster fallback |
| Pinned Seam section is fragile on mobile | Not pinned on mobile; tested at 390 px |
| Brand collision with real signage | Nothing copied; invented window; typographic placeholder |
| Stale facts (hours, menu, prices, rating, health grade) | Every time-bound figure carries its date; Yelp remains the source; re-check Yelp before showing anyone |
| Reputation risk of an unofficial mockup | Private, `noindex`, footer disclaimer, never published without an explicit ask |

## Not in Phase 1
Deployment, custom domain, built-in ordering (the site only links to Yelp), analytics, CMS, review widgets, social embeds.
