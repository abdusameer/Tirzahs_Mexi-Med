# Phase 0 — Storyboard (desktop and mobile)

Text storyboards. Frames as images are optional for Phase 1 once assets exist.

## Desktop (1440 × 900)

| # | Section | Composition | Copy source | Motion |
| - | --- | --- | --- | --- |
| D1 | **Hero** | 12-col grid. Left 5 cols: display headline (3 lines), one line of support, two CTAs (See the menu / Get directions), hours chip "Open today 11–7". Right 7 cols: the window-frame plate, cropped 4:5, red mullion cuts it in two | Headline candidate "Two kitchens. One window." Support from Yelp About (paraphrase) | Shutters lift, plate settles, headline words unmask; canvas seam follows pointer |
| D2 | **Manifesto** | Full-width, centered 10 cols, display at ~72 px, pita ground | "Mexican street food and Mediterranean grill, made to be eaten out of one window." (candidate; check against Tier A) | Word-by-word mask reveal |
| D3 | **The Seam** | Pinned 100vh. Left half brick color, right half cucumber. Left column list (handmade corn tortilla · esquite · pickled onion · cotija); right column (hummus · falafel · tzatziki · kebab) — all menu-listed ingredients. Center: El Arabic Taco and Egyptian Nachos as the two dishes where sides meet | Yelp menu ingredient lines | Scrub: halves slide in, lock at 60% progress, dishes rise |
| D4 | **Menu** | Five chapter rows. Each row: chapter label in mono, 3–4 ticket cards with dish name (display 40 px) and ingredients (mono). Horizontal drift on wide rows | Yelp menu | Cards print in; hover lifts 4 px and shows red underline |
| D5 | **Plates to know** | Four alternating cutout + color-field blocks, 2-col overlap | Menu dish + ingredient line | Cutouts parallax on bounded ±40 px |
| D6 | **Around the window** | 6-item strip with Solar icons: Outdoor seating · Dogs allowed · Private lot parking · Wheelchair accessible · Takeout · Delivery (catering as a seventh) | Yelp amenities (ticked only) | Fade-up stagger |
| D7 | **Visit (dark)** | `--char` ground. Big address, hours table (Sat "Closed" in red), Get directions button | Yelp hours/address | Table rows reveal; footer shutter line draws |
| D8 | **Final + footer** | Red block: "Come to the window." + directions CTA. Footer: unofficial-concept line, Yelp source credit, back to top | — | Shutter closes |

## Mobile (390 × 844)

| # | Change from desktop |
| - | --- |
| M1 Hero | Stacked: plate on top (poster, no canvas), headline below, CTAs full width, sticky bottom bar "Directions" appears after the hero |
| M2 Manifesto | 36 px display, left aligned, masked reveal kept |
| M3 Seam | **Not pinned.** Two stacked color panels with the same ingredient lists; a short clip-in transition per panel (no scrub) |
| M4 Menu | Chapters become accordions; first open by default; cards full width |
| M5 Plates | Single column, cutout above copy |
| M6 Around | 2-column icon grid |
| M7 Visit | Hours as stacked rows; directions button pinned within section |
| M8 Footer | Single column |

Touch: no hover dependency; tap states use `:active`; nav opens as a full-screen sheet with focus trap and Escape/close button.
