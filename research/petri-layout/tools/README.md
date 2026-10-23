# Regenerating the figures

From a local copy of the PDF, with a venv holding opencv-python-headless, numpy, pillow, and rapidocr-onnxruntime:

1. `pdftoppm -r 150 -gray -png peterson.pdf pages/p`
2. `python -I ocr.py pages ocr`
3. `python -I clip.py pages ocr figs`. It writes one PNG per figure and `manifest.json`.

The 300 dpi clips in `figures/clips/` are the same boxes cut from `pdftoppm -r 300` pages. `figures.json` adds each figure's kind.
