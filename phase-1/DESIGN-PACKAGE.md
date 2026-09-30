# Phase 1 — Design Package ("Walk up to the window")

Tier 1 build: one 6-second Higgsfield shot, scrubbed by scroll, then a real one-page site. Plain HTML, CSS and JavaScript in `site/` (no build step). This replaces the Phase 0 React + Three.js plan at the user's request (2026-09-29: "use the 10k website", with the Awwwards-quality skill as the bar). Every line of copy below ships verbatim. Facts follow `phase-0/PHASE-0-CONTENT-MAP.md`.

## 1. Brand premise

**The window.** Tirzahs is one walk-up window with two kitchens behind it: Mexican street food and Mediterranean grill. The page is the walk up to that window. The hero descends from the papel picado to the counter, the one interactive moment lets you slide the window frame between the two kitchens, and every section ends at the same place: order at the window.

## 2. Palette (sampled from the stand and the footage)

```css
:root{
  --canvas:#F3E9DA;       /* sunlit plaster, never pure white */
  --panel:#EADCC6;        /* deeper plaster for raised surfaces */
  --wall:#C22A20;         /* the stand's red, used as one chapter ground (the menu) */
  --brick:#2B1813;        /* dark brick chapter (visit) and body text */
  --accent:#1D55CF;       /* tarp and sky blue: the call to action, focus, rare emphasis */
  --accent-hover:#1644A8;
  --accent-muted:rgba(29,85,207,.16);
  --text-secondary:#5B463D;
  --text-primary:#231411;
}
```

Deviation said out loud: warm plaster is close to the "cream canvas" default the 10k guide warns about. Here it is the subject's own material (sunlit plaster next to red paint), it is paired with a grotesque, not a serif, and the accent is the stand's tarp blue, not terracotta.

## 3. Type trio

- Display: **Bricolage Grotesque** 700 and 800 (tight, loud, printed-banner voice).
- Body: **Instrument Sans** 400, 500, 600.
- Labels: **DM Mono** 400, 500 (hours, prices, ingredient lines, "Concept image").

## 4. Band map (hero 520vh; ranges are starting points for the flick test)

| Band | Range | Footage moment | Copy (verbatim) | Entrance |
|---|---|---|---|---|
| 1 | 0.00 to 0.22 | Open blue sky, banners below | Kicker: "Tirzahs Mexi-Terranean Grill · El Sereno, Los Angeles". Headline: "Two kitchens. One window." | Drift-down (the camera is descending), with a one-time load ramp |
| 2 | 0.27 to 0.49 | Papel picado sweeps past | Headline: "Birria and falafel. Esquite and hummus." Line: "Mexican street food and Mediterranean grill, made to order." | Flutter: characters arrive alternating from above and below, like the banners |
| 3 | 0.54 to 0.75 | Tile roof, red wall, the window arrives | Headline: "Walk up. Order at the window." Line: "Take it to go, or eat on the patio in the sun." | Slide: characters slide in sideways, like a sliding service window |
| 4 (settle) | 0.81 to 1.00 | The counter at rest | Headline: "Come hungry." Line: "Big portions, handmade corn tortillas, 4625 Valley Blvd." Buttons: "Order on Yelp", "See the menu" | Word-by-word rise, then line, then buttons |

## 5. Static hero (phones, portrait tablets, reduced motion)

Poster: the tall sky-to-counter photo on portrait screens, the ending frame on landscape. Kicker "Tirzahs Mexi-Terranean Grill · El Sereno, Los Angeles", headline "Two kitchens. One window.", line "Mexican street food and Mediterranean grill, made to order at a walk-up window on Valley Blvd.", buttons "Order on Yelp" and "See the menu".

## 6. Below the fold (one call to action: Order on Yelp)

1. **Two kitchens (the interactive moment).** Kicker "The window". Headline "Pick a side. Or don't." Body: "One side of the kitchen makes birria, esquite and street tacos. The other grills kebab and fries falafel. It all comes out of the same window, and some of it lands in the same tortilla." Slider labels "Mexican kitchen" and "Mediterranean kitchen", hint "Drag the window frame". Under it: "Where the two meet" with El Arabic Taco, Egyptian Nachos, Habibi Burrito, LA Kebab.
2. **Plates to know.** Kicker "Start here". Headline "Four plates to know." Egyptian Nachos, Sopes Plate, LA Kebab, Yalla Bowl, each with its Yelp ingredient line and price.
3. **The menu (red wall chapter).** Kicker "The menu". Headline "Everything on the board." Tabs: Starters, Tacos, Burritos, Plates, Salads. Cards with photo, name, ingredients, price, and "Most reviewed on Yelp" on Esquite, El Sereno Torta, Kebab Plate. Meat note: "Choice of meat: chicken, carne asada, or kofta (lamb and ground beef). Vegetarian? Ask for jackfruit or falafel." Drinks and more: Aguas frescas "Watermelon, horchata, pineapple." Sides "Falafel, cucumber salad, esquite, hummus and pita, rice." Extras "Guacamole, garlic sauce, tzatziki, pico de gallo, chipotle aioli, pickled onions." Soda "Cold bottled sodas." Pop Up "Specials come and go. Ask at the window." Footnote: "Menu and prices as listed on Yelp, September 29, 2026. May not be current."
4. **Around the window.** Kicker "Good to know". Headline "Sun, patio, and room for the dog." Facts: Outdoor seating, Dogs allowed, Private lot parking, Bike parking, Wheelchair accessible, Takeout, Delivery, Catering, Vegan options, Cards, Apple Pay and Android Pay. Proof row: "4.8 on Yelp · 221 reviews" (as of September 29, 2026), "Health grade A" (routine inspection, July 29, 2026), "Latinx-owned · Women-owned".
5. **FAQ.** Headline "Before you walk up." Parking, eating there, vegetarian, delivery, dogs, catering, why food takes a few minutes (answers in the page source, all from the content map).
6. **Visit (dark brick chapter, the call to action).** Kicker "Visit". Headline "Come to the window." Address, El Sereno, hours table with today marked, "Open now" or "Closed now", phone (323) 612-6062, parking tip, buttons "Order on Yelp" (primary) and "Get directions".
7. **Footer.** "Unofficial website concept. Not affiliated with Tirzahs Mexi-Terranean Grill. Details and menu from its Yelp listing, September 29, 2026. Photos marked Concept image are AI generated." Back to top.

No form: ordering goes to Yelp's own order button, so a form would collect nothing real.

## 7. Vector layer and living elements

- Self-drawing seam line (SVG stroke) in the Two kitchens section and down the menu legend.
- The generated papel-picado strip hangs over the Two kitchens and Visit chapters and sways at whisper level (6 to 8 second loop, negative delay, paused offscreen and on hidden tabs).
- An "Open now" dot pulses softly in Visit.
- Fixed environment layer: fine grain plus a slow drifting warm glow (70 second cycle).

## 8. Engineering list

10k scrub standard (Blob fetch with loading ring and watchdog, dt-normalized lerp, gated seeks, delta-gated DOM writes, band pacing with the flick test, four-layer legibility with the worst-frame audit, five live static-hero gates, complete without video). Awwwards bar: GSAP + ScrollTrigger for below-fold choreography, **Lenis as the only smooth-scroll engine** (off under reduced motion), masked word reveals with an unsplit accessible name, CSS-only hovers, visible focus, 44px touch targets, `noindex`. **Three.js: not used.** The scrubbed video already carries the hero's depth, so a WebGL canvas would add weight with no job.

## 9. Copy gate

Every viewer-facing line above ships verbatim. The built page must pass the grep gate (zero em dashes, zero of: leverage, seamless, empower, unlock, robust, actionable, data-driven, solutions) and the AI-tell sweep before anyone sees it.
