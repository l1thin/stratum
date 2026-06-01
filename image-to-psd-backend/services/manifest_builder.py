import json
from pathlib import Path

from PIL import Image

from models.job import update_job
from utils.file_utils import get_job_dir


def assemble_manifest(job_id: str, background: dict, objects: list[dict], texts: list[dict]) -> list[dict]:
    update_job(job_id, status="assembling", progress=90)

    job_dir = Path(get_job_dir(job_id))
    thumbnails_dir = job_dir / "thumbnails"
    thumbnails_dir.mkdir(parents=True, exist_ok=True)

    # Resolve canvas dimensions from original image to normalize bounding boxes to percentages
    original_path = job_dir / "original.png"
    img_width, img_height = 100, 100
    if original_path.exists():
        try:
            with Image.open(original_path) as orig_img:
                img_width, img_height = orig_img.size
        except Exception:
            pass

    all_layers = []
    if background and background.get("layer_path"):
        all_layers.append({
            "layer_id": "background",
            "type": "background",
            "label": "Background",
            "file_path": background.get("layer_path"),
            "bounding_box": None,
        })
    for obj in (objects or []):
        obj_copy = obj.copy()
        obj_copy["type"] = "object"
        all_layers.append(obj_copy)
    for text in (texts or []):
        text_copy = text.copy()
        text_copy["type"] = "text"
        all_layers.append(text_copy)

    # 1. Write text_manifest.json in pixel format expected by Photoshop script
    text_manifest_rows = []
    for item in (texts or []):
        bbox = item.get("bounding_box", {})
        x = bbox.get("x", 0)
        y = bbox.get("y", 0)
        w = bbox.get("width", 0)
        h = bbox.get("height", 0)
        text_manifest_rows.append({
            "text": item.get("text_content", ""),
            "conf": int(item.get("confidence", 95)),
            "bbox": [x, y, x + w, y + h]
        })
    
    text_manifest_path = job_dir / "text_manifest.json"
    try:
        text_manifest_path.write_text(json.dumps(text_manifest_rows, indent=2), encoding="utf-8")
    except Exception:
        pass

    # 2. Copy import_text_layers.jsx to the output directory
    try:
        import shutil
        project_root = Path(__file__).resolve().parents[1]
        script_src = project_root / "utils" / "import_text_layers.jsx"
        if script_src.exists():
            shutil.copy(str(script_src), str(job_dir / "import_text_layers.jsx"))
    except Exception:
        pass

    # 3. Generate text_overlay.png for visual verification
    try:
        from PIL import ImageDraw
        if original_path.exists() and texts:
            with Image.open(original_path) as img:
                overlay = img.convert("RGBA")
                draw = ImageDraw.Draw(overlay)
                for item in texts:
                    bbox = item.get("bounding_box", {})
                    x = bbox.get("x", 0)
                    y = bbox.get("y", 0)
                    w = bbox.get("width", 0)
                    h = bbox.get("height", 0)
                    draw.rectangle([x, y, x + w, y + h], outline="red", width=2)
                overlay.save(job_dir / "text_overlay.png", format="PNG")
    except Exception:
        pass

    manifest_rows = []
    for layer in all_layers:
        layer_id = layer.get("layer_id")
        layer_type = layer.get("type")
        label = layer.get("label")
        bbox = layer.get("bounding_box")
        source_path = Path(layer.get("file_path"))

        # Convert bounding box pixels to percentages for frontend display
        normalized_bbox = {"x": 0, "y": 0, "width": 100, "height": 100}
        if bbox:
            normalized_bbox = {
                "x": round((bbox.get("x", 0) / img_width) * 100, 2),
                "y": round((bbox.get("y", 0) / img_height) * 100, 2),
                "width": round((bbox.get("width", 0) / img_width) * 100, 2),
                "height": round((bbox.get("height", 0) / img_height) * 100, 2),
            }

        thumbnail_path = thumbnails_dir / f"{layer_id}.png"
        # Relative to job outputs folder, will be prefixed by /api/outputs/{job_id}/ in router
        thumbnail_url = f"thumbnails/{layer_id}.png"

        try:
            with Image.open(source_path) as img:
                thumb = img.convert("RGBA")
                thumb.thumbnail((100, 100), Image.LANCZOS)
                thumb.save(thumbnail_path, format="PNG")
        except Exception:
            placeholder = Image.new("RGBA", (100, 100), (255, 255, 255, 0))
            placeholder.save(thumbnail_path, format="PNG")

        manifest_rows.append(
            {
                "layer_id": layer_id,
                "type": layer_type,
                "label": label,
                "bounding_box": normalized_bbox,
                "thumbnail_url": thumbnail_url,
                "file_path": str(source_path.as_posix()),
            }
        )

    manifest_path = job_dir / "layers.json"
    manifest_path.write_text(json.dumps(manifest_rows, indent=2), encoding="utf-8")

    return manifest_rows
