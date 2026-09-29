# Phase 0 — Creative Direction & Design System

Unofficial private concept. Not commissioned or approved. See [PHASE-0-TRUTH-PACK.md](PHASE-0-TRUTH-PACK.md) for what the site may say.

## 1. Concept: "The Walk-Up Window"

**Visual thesis.** Tirzahs is a walk-up stand with a red counter and a service window. Two kitchens meet at that window: Mexican street food on one side, Mediterranean grill on the other. The site treats the window as the frame. The page is a *window you order through*, and the fusion is the seam where two halves meet.

**One-line idea (internal).** *Two kitchens. One window.* (Public headline candidate, pending copy pass; it is derived from the Yelp categories, not from a business tagline.)

**What we borrow from evidence:** hard-lit LA-sun contrast, saturated red, brick-tile base, hand-hung papel-picado color, a loud, friendly, printed-banner voice.
**What we do not do:** copy their banner, logo, photos, or slogans ("Have a Tirzahlicious day" is theirs and stays out).

**Hero focal asset.** A generated photographic plate, labeled "Concept image": a walk-up service window (invented, not a replica of 4625 Valley) framing a plate that is half Mexican (handmade corn tortilla, esquite, pickled onion) and half Mediterranean (pita, hummus, cucumber salad, kebab). Composed with the window mullion as the seam. Static poster is the full frame when JS or WebGL is off.

## 2. Skills selected (installed)

| Skill | Role | Why |
| --- | --- | --- |
| `cinematic-gsap-lenis-motion-system` | Motion engine, choreography | Matches the chosen GSAP + Lenis stack |
| `masked-reveal` | Word-by-word masked headings | Restrained per-word stagger with an unsplit accessible name |
| `image-first-grid-layout` | Layout | Food photography leads; the grid serves the crops |

Deliberately not combined: glass/dark-tech skills, shader-cursor skills, or scroll-world skills. Those would fight the print-and-paper warmth.

## 3. Type hierarchy

| Role | Face (Google Fonts, self-host in Phase 1) | Setting |
| --- | --- | --- |
| Display | **Bricolage Grotesque** (variable, condensed-leaning width axis) | 800, tight leading (0.9), sentence case; clamp 56–168 px |
| Body | **Instrument Sans** | 400/500, 17–19 px, 1.55 |
| Labels | **DM Mono** | 12–13 px, uppercase, +0.08em: hours, ingredient tags, "Concept image" |

Rules: one display size per section; italics never; ingredient lines set in mono like a ticket printout; body never below 16 px.

## 4. Color system

Sampled by eye from the Yelp exterior photos; **verify against the real building in Phase 1**.

| Token | Hex | Use |
| --- | --- | --- |
| `--window-red` | `#C8281E` | Hero seam, CTAs, focus ring accents |
| `--brick` | `#8A3B2C` | Secondary blocks, footer |
| `--pita` | `#F4E7D0` | Page ground (light chapters) |
| `--char` | `#1D1613` | Text, dark chapter (Visit) ground |
| `--cucumber` | `#6E8B4E` | Mediterranean-side accent |
| `--onion` | `#C2477A` | Pickled-onion pop, small highlights only |
| `--hummus` | `#D9B47A` | Rules, tags |

Contrast: `--char` on `--pita` ≈ 14:1; white on `--window-red` ≈ 5.4:1 (large text and buttons only); `--onion` never carries body text.

## 5. Section sequence

1. **Hero — The Window.** Message, two CTAs, generated plate in the window.
2. **Manifesto.** One paragraph of Tier-A-derived copy, masked word reveal.
3. **The Seam (pinned).** Scroll splits the screen: Mexican staples left, Mediterranean right, meeting on the menu's shared dishes (El Arabic Taco, Egyptian Nachos).
4. **The Menu.** Five chapters (Starters, Tacos, Burritos, House Specialties, Salads) as ticket-style cards; ingredients from the Yelp menu; no prices (Owner list Q3).
5. **Plates to know.** Four featured plates as cutouts on color fields: Egyptian Nachos, Sopes Plate, LA Kebab, Yalla Bowl.
6. **Around the window.** Facts only: outdoor seating, dogs allowed, private lot, wheelchair accessible, takeout, delivery, catering.
7. **Visit.** Dark chapter. Address, hours table, directions link.
8. **Final CTA + footer.** "Unofficial website concept" line; Yelp source credit.

Storyboards are described in [PHASE-0-STORYBOARD.md](PHASE-0-STORYBOARD.md).

## 6. Motion narrative

The scroll story is *opening the service window and placing an order*.

| Beat | Motion | Engine |
| --- | --- | --- |
| Load | Window shutters slide up, plate settles; nav and CTA are readable before it ends | GSAP timeline |
| Headings | Word-by-word masked reveal, ~0.05 s stagger | GSAP + ScrollTrigger |
| The Seam | Pinned split; halves slide toward each other and lock; the only scrubbed sequence | ScrollTrigger scrub |
| Menu | Ticket cards print in (translate + clip) on entry | GSAP |
| Plates | Cutouts rise with slight parallax on a bounded range | ScrollTrigger |
| Visit | Closing shutter line draws across the footer | CSS/GSAP |
| Hover / focus / tap | Buttons and cards use CSS transitions only | CSS |

**Smooth-scroll engine: Lenis** (sole engine; Locomotive Scroll will not be installed). Lenis is smaller, drives cleanly from the GSAP ticker (`lenis.on('scroll', ScrollTrigger.update)` plus `gsap.ticker.add`), and does not take over the DOM structure. Refresh ScrollTrigger after fonts and images load; `lenis.destroy()` and `ScrollTrigger.kill()` on cleanup.

**Reduced motion:** Lenis is not created, scrubbed timelines are skipped, final states render immediately (not shortened animations). **No JS:** all copy and the poster are visible; heading splits are added by JS only, and each split heading keeps an unsplit `aria-label` with the decorative words `aria-hidden`. Links are never split.

## 7. Three.js decision

**Yes, narrowly.** One canvas, one job: a pointer-driven displacement/crossfade between the two hero plates (Mexican-leaning and Mediterranean-leaning versions of the same window scene) so the "seam" follows the pointer. It is texture transition, which the direction actually needs.

Guardrails: DPR capped at 1.75; pause when offscreen or `document.hidden`; pointer input throttled; no per-frame allocation; static poster shown for touch/coarse pointers by default, reduced motion, or WebGL/context-loss failure; dispose geometry, material, textures, renderer, listeners, and observers on teardown.
**Kill criterion:** if the hero cannot hold 60 fps on a mid laptop, or the poster fallback looks weaker than the canvas, drop it and keep the CSS/GSAP hero.

## 8. Asset provenance plan

- Hero plates, dish cutouts, textures: **generated originals** (Higgsfield project), each carrying a visible "Concept image" label and an entry in the source manifest. See [PHASE-0-ASSET-MANIFEST.md](PHASE-0-ASSET-MANIFEST.md).
- No Yelp photos, no press photos, no traced logo or banner.
- Illustrative elements (papel-picado, shutter, chili accents) are transparent PNG cutouts from generation, **not** model-drawn SVG or CSS art. Allowed authored SVG: interface icons and the wordmark placeholder.
- Icons: Solar via Iconify. No third-party logos, no logo wall.
- Avatars: none. No testimonials.
- Fonts: Google Fonts (OFL), self-hosted.

## 9. Quality bar checklist (for Phase 1 acceptance)

Semantic single page; responsive nav; visible keyboard focus everywhere; ingredient and hours data as real text (not images); working states for every control; production build clean; desktop and mobile QA; keyboard, touch, no-JS, reduced-motion checks; text and source scan for invented claims; `noindex` and "Unofficial website concept" footer. Never describe the result as award-winning.
