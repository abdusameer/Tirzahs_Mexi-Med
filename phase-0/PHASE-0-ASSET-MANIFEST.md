# Phase 0 — Asset Manifest

**Status 2026-09-29:** generated and checked — H1 (`hero-window.png`, 2560×3200), C5 (`papel-picado.png`, transparent), T1 (`brick.png`, 2048×2048; used unrepeated, since its edges don't tile perfectly), all 18 menu dishes, and the five group images (sides, aguas frescas, soda, extras, pop up). The dishes replace C1–C4 as photos rather than cutouts. Still to make: H2 (only if the WebGL seam stays) and T2 (a crop of H1, made during the build). Everything is in `photos/generated/`, logged in `PROVENANCE.md`.

## Rules
- Every generated image carries a visible **"Concept image"** label and a provenance row (tool, model, prompt, date, file).
- No people. No faces. No replicas of the real storefront, signage, banner, or logo.
- Dish images show only ingredients the Yelp menu lists for that dish (meats and sides may follow what Yelp reviews report).
- Transparent PNG cutouts for illustrative elements; no model-authored SVG/CSS illustration.
- Each image ships with alt text, fixed aspect ratio, `object-position` crop note, lazy loading below the fold, and a solid-color fallback.

## Minimum set

| ID | Asset | Ratio / size | Role | Prompt seed (dish ingredients from Yelp menu only) |
| --- | --- | --- | --- | --- |
| H1 | Hero plate — window scene | 4:5, 2400 px | Hero poster + canvas texture A | Hard noon sun, red walk-up service window with brick-tile counter (invented), plate half Mexican (handmade corn tacos, esquite, pickled red onion), half Mediterranean (pita, hummus, cucumber salad, kebab); no text, no people |
| H2 | Hero plate — alt grade | 4:5, 2400 px | Canvas texture B for the seam shader | Same scene, cooler light, Mediterranean side dominant |
| C1 | Egyptian Nachos cutout | transparent PNG, 1600 px | Plates section | Corn tortilla chips fanned out, beans, feta, garlic sauce, cucumber salad, tzatziki, red onions, hummus, kofta |
| C2 | Sopes Plate cutout | transparent PNG | Plates section | 2 sopes with chicken or carne asada, lettuce, pico de gallo, sour cream, chipotle aioli, cotija, 2 sides (e.g. esquite, cucumber salad) |
| C3 | LA Kebab burrito cutout | transparent PNG | Plates section | Grilled kebab, hummus, fries, feta, cucumbers, tomato, garlic sauce, pickled red onions |
| C4 | Yalla Bowl cutout | transparent PNG | Plates section | Kofta, basmati rice, shredded lettuce, feta, garlic sauce, cucumber salad, tzatziki, hummus, pickled red onion |
| C5 | Papel-picado strip | transparent PNG, wide | Decorative header/footer | Abstract cut-paper flags in the palette; no letters |
| T1 | Brick-tile texture | tileable 1024 px | Seam left panel | Red-brown glazed brick tile, flat lit |
| T2 | Poster fallback (crop of H1) | 4:5, 1200 px, AVIF/WebP | No-JS/no-WebGL first frame | Derived from H1 |

## Optional (only if approved)
Esquite cup cutout · Queso Birria Taco cutout · Agua fresca cups cutout (watermelon, pineapple, cucumber lemonade) · a 6-second hero loop.

## Non-generated assets

| Asset | Source | License |
| --- | --- | --- |
| Interface icons | Solar set via Iconify | Solar icon license (check at install) |
| Fonts | Bricolage Grotesque, Instrument Sans, DM Mono — Google Fonts | SIL OFL |
| GSAP, ScrollTrigger | npm `gsap` | GSAP standard license |
| Lenis | npm `lenis` | MIT |
| Three.js | npm `three` | MIT |

## Explicitly excluded
Yelp customer photos · press photos · the business's logo or banner · stock imagery · Logo Ipsum · Iconify SVG Logos · avatars.
