import sys, json, pathlib
from rapidocr_onnxruntime import RapidOCR
pages, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
ocr = RapidOCR()
for p in sorted(pages.glob('p-*.png')):
    dst = out / (p.stem + '.json')
    if dst.exists():
        continue
    res, _ = ocr(str(p))
    lines = [{'box': [[float(v) for v in pt] for pt in b], 'text': t, 'conf': float(c)} for b, t, c in (res or [])]
    dst.write_text(json.dumps(lines))
    print(p.stem, len(lines), flush=True)
