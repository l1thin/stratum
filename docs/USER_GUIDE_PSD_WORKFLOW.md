**User Guide: PSD Generation + OCR + Manual Text Layer Import**

- **Purpose**: Create a PSD from image layers, extract text via OCR, and allow manual creation of editable text layers in Photoshop using a provided script.

**Prerequisites**
- Python 3.10+ (virtualenv recommended)
- Tesseract OCR installed and on PATH (Windows example: `C:\Program Files\Tesseract-OCR\tesseract.exe`)
- Photoshop (for final text layer import)
- Project dependencies installed (see `image-to-psd-backend/requirements.txt`)

Install dependencies (from repo root):

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r image-to-psd-backend/requirements.txt
```

**Workflow Overview**
1. Upload images / create a job manifest (the system produces `/outputs/{job_id}/layers.json`).
2. Run backend PSD generator: `POST /api/generate_psd?job_id={job_id}` or call `generate_psd(job_id)` in Python.
3. Backend produces:
   - `result.psd` — PSD file containing rasterized image layers
   - `text_manifest.json` — OCR results: array of {text, conf, bbox}
   - `text_overlay.png` — debugging overlay showing bounding boxes
4. Download `result.psd` and `text_manifest.json` to your workstation.
5. Open `result.psd` in Photoshop.
6. Run the provided Photoshop script `utils/import_text_layers.jsx` and when prompted select `text_manifest.json`.
7. The script will create editable Type (text) layers positioned to match OCR boxes.

**Notes & Tips**
- The backend does not create native Photoshop TypeLayers automatically (engine data is complex); instead OCR data is saved to JSON for reliable manual import into Photoshop.
- If you need fully automated TypeLayer creation server-side, we can implement Photoshop automation (COM/Bridge) but it requires a machine with Photoshop installed and configured for headless scripting.
- `text_manifest.json` uses pixel coordinates relative to the PSD image.

**Example `text_manifest.json` entry**

```json
{
  "text": "Hello",
  "conf": 95,
  "bbox": [10, 20, 110, 48]
}
```

**Troubleshooting**
- OCR returns empty or low-confidence results: improve input image quality, ensure Tesseract language packs are installed.
- Photoshop script fails: ensure you open the PSD first, and run `File > Scripts > Other Scripts...` to select the `.jsx` file.

**Where files are written**
- Job directory: `image-to-psd-backend/outputs/{job_id}/`
- Key files: `result.psd`, `text_manifest.json`, `text_overlay.png`

**Contact / Next steps**
- Want automation that runs Photoshop remotely? I can implement a Photoshop automation helper (requires Photoshop host).
- Want the backend to generate language-specific OCR? We can configure Tesseract language models and pass `lang` to `pytesseract`.
