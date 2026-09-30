# Photos for the site

Drop original photos in this folder. Any format works (JPG, HEIC, PNG). Name each file after what it shows, using the names below. Add `-2`, `-3` for extra shots of the same thing (e.g. `egyptian-nachos-2.jpg`).

Anything without a photo gets a generated image, labeled "Concept image".

## Quality bar (user, 2026-09-29): crisp, high quality

1. Relight or clean up only when a photo needs it (Nano Banana 2 Relight), keeping the dish exactly as it is. No added or changed ingredients.
2. Upscale every photo with Topaz (`topaz_image`, non-generative, so it doesn't invent detail): **High Fidelity V2** for good originals, **Low Resolution V2** for small or compressed ones. Light denoise and sharpen.
3. Output size: hero 2400 px on the long side; dishes and textures at least 1600 px. The site serves smaller AVIF/WebP copies from these.
4. Check each result at 100% zoom for softness, halos, smeared text, or plastic-looking food before it goes on the site. Redo any that fail.
5. Originals stay untouched in this folder; enhanced versions go in `photos/enhanced/`.

## Needed

| File name | What it shows | Used in |
| --- | --- | --- |
| `window` | The service window / front of the stand, ideally with food on the counter | Hero |
| `egyptian-nachos` | Egyptian Nachos | Plates to know |
| `sopes-plate` | Sopes Plate | Plates to know |
| `la-kebab` | LA Kebab burrito | Plates to know |
| `yalla-bowl` | Yalla Bowl | Plates to know |
| `papel-picado` | The papel-picado banners | Decoration |
| `brick` | Close-up of the red brick-tile base | Texture |
| `logo` | Logo file (vector if you have it: SVG, AI, or PDF) | Header |

## Nice to have

| File name | What it shows |
| --- | --- |
| `patio` | The patio / seating area |
| `aguas-frescas` | Agua fresca cups |
| `esquite` | Esquite |
| `queso-birria-taco` | Queso Birria Taco |
| Any other dish | Use the dish name from the menu, e.g. `el-sereno-torta`, `kebab-plate`, `el-arabic-taco` |
