# Phase 0 — Content Map

Every visible string, its source tier, and status. "Cand." means candidate copy needing a copy pass. Nothing may be added that is not in this table. Source rule: Yelp is treated as correct (see [PHASE-0-TRUTH-PACK.md](PHASE-0-TRUTH-PACK.md)).

| Slot | Copy | Tier / source | Status |
| --- | --- | --- | --- |
| Wordmark | Tirzahs Mexi-Terranean Grill | A (Yelp name) | Typographic placeholder; no logo |
| Hero headline | "Two kitchens. One window." | Derived from A categories | Cand. |
| Hero support | "Mexican and Mediterranean cooking from a walk-up window on Valley Blvd in El Sereno." | A (Food Stands, address, neighborhood) + B (walk-up) | Cand. |
| Rating chip | "4.8 on Yelp · 221 reviews" with "as of Sept 29, 2026"; links to the Yelp listing | A | OK, always dated |
| Primary CTA | Order on Yelp (links to the Yelp listing, which carries Yelp's order button) | A | OK |
| Secondary CTA | See the menu (anchor) | — | OK |
| Hours chip | "Open today 11–7" (computed from hours, JS only; static fallback "Hours below") | A | OK |
| Manifesto | "Mexican street food and Mediterranean grill, made to order and handed out of one window. Big portions, handmade tortillas." | A + B | Cand. |
| Seam left list | handmade corn tortilla · esquite · pickled red onion · cotija | A menu | OK |
| Seam right list | hummus · falafel · tzatziki · kebab · pita | A menu | OK |
| Menu items | All 18 items with ingredient lines and prices from the truth pack | A menu | OK; footnote "Menu and prices as listed on Yelp, Sept 29, 2026. May not be current." |
| Menu tag | "Most reviewed on Yelp" on Esquite, El Sereno Torta, Kebab Plate | A (menu page counts) | OK |
| "Choice of meat" note | "Choice of meat: chicken, carne asada, or kofta (lamb and ground beef). Vegetarian? Ask for jackfruit or falafel." | B | OK |
| Other menu groups | Sides · Dessert · Aguas Frescas · Soda · Extras & Add-Ons · Pop Up | A | Group names only |
| Aguas frescas | watermelon · horchata · pineapple | B (most-mentioned in Yelp reviews; user chose these 2026-09-29) | OK, under the menu footnote date |
| Specials line | "Specials come and go. Ask at the window." | B | OK; no special named |
| Featured plates | Egyptian Nachos · Sopes Plate · LA Kebab · Yalla Bowl, each with ingredients and price | A menu | Chosen for visual range; Egyptian Nachos is on Yelp's "What's Popular Here" |
| Around-the-window facts | Outdoor seating · Dogs allowed · Private lot parking · Bike parking · Wheelchair accessible · Takeout · Delivery · Catering · Vegan options · Cards, Apple Pay, Android Pay | A amenities (yes only) | OK |
| Ownership badges | "Latinx-owned · Women-owned" (Yelp wording, no paraphrase) | A | OK |
| Health grade | "Health grade A · routine inspection, July 29, 2026" | A (Yelp health page) | OK, always dated |
| Delivery note | "Delivery through Yelp or DoorDash." | A + B | Text only; the only link is Yelp |
| Patio line | "Eat on the patio and it comes out on real plates, or take it to go." | B | OK |
| Parking tip | "The small private lot fills up at lunch. Street parking is usually easier." | A + B | OK |
| Address | 4625 Valley Blvd, Los Angeles, CA 90032 · El Sereno | A | OK |
| Hours | Mon–Fri 11–7 · Sat closed · Sun 11–2 | A | OK |
| Phone | (323) 612-6062, tap-to-call | A | OK |
| Directions | Get directions (maps link to 4625 Valley Blvd) | A | OK |
| Footer note | "Unofficial website concept. Not affiliated with Tirzahs Mexi-Terranean Grill. Details and menu from its Yelp listing, September 29, 2026." | — | Required |
| Image label | "Concept image" on every generated image | — | Required |
| Meta | `noindex, nofollow` | — | Required |

## Menu group images (user direction, 2026-09-29)

Generated with Higgsfield, labeled "Concept image". Files and prompts: `photos/generated/PROVENANCE.md`.

| Group | Image shows | Open point |
| --- | --- | --- |
| Sides | Falafel with tzatziki, cucumber salad, esquite, hummus with pita, Mexican rice | Text lists sides only once the user confirms which are real |
| Aguas Fresca | Watermelon, horchata, pineapple | Matches the menu text. Chosen from Yelp review mentions: watermelon (10), horchata (9), pineapple (6) |
| Soda | Unlabeled glass-bottle sodas on ice | — |
| Extras & Add-Ons | Guacamole, garlic sauce, tzatziki, pico de gallo, chipotle aioli, pickled red onions | All are menu ingredients |
| Pop Up | The service window with a bell and blank ticket, no food | No special named |
| Dessert | No image (user: skip) | — |

## Never on the site
Reviewer names, quotes, avatars, or photos · any Yelp photo · opinions or superlatives ("best", "authentic", "amazing") · negative reviews or inspection violations · halal · espresso drinks · Korean-leaning or other off-menu dishes by name · owner names or story (Tier C) · social handles or a DoorDash link · Wi-Fi, alcohol, reservations, drive-thru, waiter service, TV, crypto · the phrase "Have a Tirzahlicious day" · the business's logo · any testimonial or logo wall · an undated rating or health grade.

## Structured data (Phase 1, hidden concept only)
`Restaurant` JSON-LD **omitted** while the site is `noindex` and unofficial. Revisit only if the owner adopts the site.
