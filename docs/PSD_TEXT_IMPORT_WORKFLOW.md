# PSD Generation with Manual Text Layer Import

## Workflow Overview

The `generate_psd()` API generates a PSD file with **image layers only**. Text entries from OCR are stored separately in a JSON manifest for **manual import** into Photoshop using a provided script.

### Why This Approach?

Photoshop TypeLayers (text layers) require complex engine data structures to be fully editable. Rather than attempting automatic creation (which often fails or produces non-editable layers), we provide:

1. **result.psd** - Raster image layers + background from your image manifest
2. **text_manifest.json** - All OCR-extracted text with exact positions and confidence scores
3. **import_text_layers.jsx** - Photoshop script that creates real editable text layers from the manifest

## Workflow Steps

### 1. Generate PSD + OCR

```bash
POST /generate_psd?job_id=user_image_job
```

Response:
```json
{
  "success": true,
  "psd_path": "X:\\projects\\stratum\\stratum\\image-to-psd-backend\\outputs\\user_image_job\\result.psd",
  "layer_count": 1,
  "file_size_kb": 45.2
}
```

**Output files created:**
- `result.psd` - PSD with raster image layers
- `text_manifest.json` - OCR text entries with positions
- `text_overlay.png` - Visual preview with text bounding boxes (for verification)

### 2. Download & Import Text Layers

**Files to retrieve from `/outputs/{job_id}/`:**
- Download `result.psd` ← Open in Photoshop
- Download `text_manifest.json` ← Use with script
- Download `import_text_layers.jsx` ← Run in Photoshop

**In Photoshop:**

1. **Open** `result.psd` (contains your image layer)
2. Go to **File > Scripts > Other Scripts...**
3. Select `import_text_layers.jsx`
4. When prompted, select `text_manifest.json` from the same folder
5. Wait for completion message ✓

**Result:** All text entries are created as **editable TypeLayers** with correct positions.

## text_manifest.json Format

Each text entry contains:

```json
{
  "text": "The quick brown",
  "conf": 96,
  "bbox": [9, 9, 216, 37]
}
```

| Field | Meaning |
|-------|---------|
| `text` | Extracted OCR text (may contain multiple words) |
| `conf` | Tesseract confidence 0-100 |
| `bbox` | [left, top, right, bottom] in image pixels |

## Example: Full Workflow

```bash
# 1. Generate PSD from uploaded image
curl -X POST "http://localhost:8000/generate_psd?job_id=my_design"

# Outputs created:
# - /outputs/my_design/result.psd
# - /outputs/my_design/text_manifest.json
# - /outputs/my_design/text_overlay.png

# 2. Download files
# result.psd, text_manifest.json, import_text_layers.jsx

# 3. In Photoshop:
# File > Scripts > Other Scripts... > import_text_layers.jsx
# Select text_manifest.json
# ✓ Done! Text layers created.
```

## Troubleshooting

**"No PSD document open"**
- Open `result.psd` first before running the script

**Script not appearing in Photoshop**
- Ensure it's an `.jsx` file (plain text with ExtendScript code)
- Restart Photoshop if needed
- Try `File > Scripts > Browse...` and navigate manually

**Text layers created but not at correct positions**
- Verify `text_manifest.json` has valid `bbox` values
- Check that PSD is in RGB mode (not CMYK)

**Some text entries missing**
- Low-confidence entries may be skipped by Tesseract
- Check `text_overlay.png` to verify OCR coverage

## API Reference

### POST /generate_psd

Generate PSD + extract text from image manifest.

**Query Parameters:**
- `job_id` (required) - Job identifier

**Response:**
```json
{
  "success": boolean,
  "psd_path": "string",
  "layer_count": integer,
  "file_size_kb": float
}
```

**Output files in `/outputs/{job_id}/`:**
- `result.psd` - Raster PSD
- `text_manifest.json` - OCR text data
- `text_overlay.png` - Visual verification

---

**For questions or issues, refer to the Photoshop documentation or ExtendScript reference guide.**
