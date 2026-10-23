"""Clip every captioned figure out of the rasterized pages.

usage: clip.py <pages dir> <ocr dir> <out dir>

A figure is the ink between its caption and the nearest barrier above it:
a prose line, another caption, or the running head. The crop keeps the caption.
"""
import sys, json, re, pathlib
import numpy as np
from PIL import Image

pages, ocrdir, out = map(pathlib.Path, sys.argv[1:4])
out.mkdir(parents=True, exist_ok=True)
CAPTION = re.compile(r'^\s*Fig(ure|\.)\s*(\d+)\s*[.,]\s*(\d+)(?![\d.,;])', re.I)
HEAD = re.compile(r'(Chap\.|Sec\.)\s*\d')


def lines_of(page):
    raw = json.loads((ocrdir / f'{page}.json').read_text())
    lines = []
    for l in raw:
        xs = [p[0] for p in l['box']]; ys = [p[1] for p in l['box']]
        lines.append(dict(x0=min(xs), x1=max(xs), y0=min(ys), y1=max(ys), text=l['text']))
    return sorted(lines, key=lambda l: l['y0'])


manifest = []
for png in sorted(pages.glob('p-*.png')):
    page = png.stem
    if not (ocrdir / f'{page}.json').exists():
        continue
    img = np.array(Image.open(png).convert('L'))
    ink = img < 140
    H, W = ink.shape
    lines = lines_of(page)
    caps = [l for l in lines if CAPTION.match(l['text'])]
    # a prose line spans most of the text column
    col = max((l['x1'] - l['x0'] for l in lines), default=W * 0.6)
    for cap in caps:
        m = CAPTION.match(cap['text'])
        fig = f"{m.group(2)}.{m.group(3)}"
        # caption continuation: following lines close below and left-aligned with or indented from caption
        bottom, last = cap['y1'], cap
        for l in lines:
            if l['y0'] > last['y1'] - 2 and l['y0'] - last['y1'] < 14 and l is not cap and not CAPTION.match(l['text']) and l['x0'] >= cap['x0'] - 10:
                last = l; bottom = max(bottom, l['y1'])
        top = 0
        for l in lines:
            if l['y1'] > cap['y0'] - 2:
                continue
            barrier = (l is not cap and CAPTION.match(l['text'])) or HEAD.search(l['text']) or \
                ((l['x1'] - l['x0']) > 0.72 * col and len(l['text']) > 45)
            if barrier:
                top = max(top, l['y1'] + 2)
        # captions of other figures between top and cap end their own figure
        for c in caps:
            if c is not cap and c['y1'] < cap['y0'] and c['y1'] > top:
                top = c['y1'] + 30
        region = ink[int(top):int(bottom) + 3]
        rows = np.where(region.sum(1) > 1)[0]
        colsum = np.where(region.sum(0) > 1)[0]
        if len(rows) == 0:
            continue
        y0, y1 = int(top) + rows[0], int(top) + rows[-1]
        x0, x1 = colsum[0], colsum[-1]
        pad = 12
        crop = Image.open(png).crop((max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad)))
        name = f"fig-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
        dst = out / f'{name}.png'
        n = 2
        while dst.exists() and any(e['file'] == dst.name for e in manifest):
            dst = out / f'{name}-{n}.png'; n += 1
        crop.save(dst)
        manifest.append(dict(file=dst.name, figure=fig, page=page, caption=cap['text'], box=[int(x0), int(y0), int(x1), int(y1)], height=int(y1 - y0)))

(out / 'manifest.json').write_text(json.dumps(manifest, indent=1))
print(len(manifest), 'figures')

# a figure number can match a prose line that starts with "Figure N.M"; the real caption has the tallest figure above it
best = {}
for e in manifest:
    if e['figure'] not in best or e['height'] > best[e['figure']]['height']:
        best[e['figure']] = e
for e in manifest:
    if best[e['figure']] is not e:
        (out / e['file']).unlink()
final = sorted(best.values(), key=lambda e: tuple(map(int, e['figure'].split('.'))))
for e in final:
    want = f"fig-{int(e['figure'].split('.')[0]):02d}-{int(e['figure'].split('.')[1]):02d}.png"
    if e['file'] != want:
        (out / e['file']).rename(out / want); e['file'] = want
(out / 'manifest.json').write_text(json.dumps(final, indent=1))
print(len(final), 'after dedupe')
