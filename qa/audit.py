# Worst-frame legibility audit (10k scrub standard): run `node qa/qa.mjs audit` first.
# Glyphs are hidden in the screenshots, so each box shows exactly what sits behind the words
# (footage + every scrim layer). Light text is judged against the lightest pixel, dark text
# (band 1) against the darkest. Floor: 3.5:1 on every fully visible frame.
import json
from PIL import Image

def lum(c):
    def f(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = c
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

TEXT = {1: (0x23, 0x14, 0x11)}          # band 1: dark lettering
LIGHT = (0xFF, 0xF6, 0xEA)             # every other band

boxes = json.load(open("qa/out/audit-boxes.json"))
worst = {}
for e in boxes:
    im = Image.open("qa/out/" + e["file"]).convert("RGB")
    band = e["band"]
    dark_text = band in TEXT
    Lt = lum(TEXT.get(band, LIGHT))
    vals = []
    for b in e["boxes"]:
        x0, y0 = max(0, b["x"]), max(0, b["y"])
        x1, y1 = min(im.width, b["x"] + b["w"]), min(im.height, b["y"] + b["h"])
        if x1 > x0 and y1 > y0:
            vals += [lum(p) for p in im.crop((x0, y0, x1, y1)).getdata()]
    vals.sort()
    if not vals:
        continue
    if dark_text:
        bg = vals[max(0, int(len(vals) * 0.005))]          # darkest (0.5th percentile)
        ratio = (bg + 0.05) / (Lt + 0.05)
    else:
        bg = vals[int(len(vals) * 0.995) - 1]               # lightest (99.5th percentile)
        ratio = (Lt + 0.05) / (bg + 0.05)
    ok = "ok" if ratio >= 3.5 else "FAIL"
    print(f"band {band} p={e['p']:<5} opacity={e['opacity']:<5} contrast={ratio:5.2f}  {ok}")
    if e["opacity"] > 0.9:
        worst[band] = min(worst.get(band, 99), ratio)
print("worst per band:", {k: round(v, 2) for k, v in sorted(worst.items())})
