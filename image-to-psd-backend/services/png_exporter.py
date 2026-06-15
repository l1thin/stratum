import json
import shutil
from pathlib import Path
from typing import List
from PIL import Image

def generate_pngs_from_manifest(manifest: dict, output_dir: str, job_dir: Path) -> str:
    """Generate separated PNGs and a layout.json from the manifest."""
    layers: List[dict] = manifest.get("layers") if isinstance(manifest, dict) else manifest
    if not layers:
        raise ValueError("Manifest contains no layers")

    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    def resolve_path(layer: dict) -> Path:
        for k in ("file_path", "path", "source_path"):
            p = layer.get(k)
            if p:
                p_path = Path(p)
                if not p_path.is_absolute():
                    return job_dir / p_path
                return p_path
        # fallback to thumbnail
        thumb = layer.get("thumbnail_url")
        if thumb and isinstance(thumb, str) and "/thumbnails/" in thumb:
            layer_id = layer.get("layer_id")
            if layer_id:
                return job_dir / "thumbnails" / f"{layer_id}.png"
        raise FileNotFoundError(f"No image path found for layer: {layer.get('label')}")

    canvas_width, canvas_height = 0, 0
    pick = next((l for l in layers if l.get("type") == "background"), layers[0] if layers else None)
    if pick:
        try:
            first_path = resolve_path(pick)
            with Image.open(first_path) as img:
                canvas_width, canvas_height = img.size
        except Exception:
            pass

    layout_data = {
        "canvas": {"width": canvas_width, "height": canvas_height},
        "layers": []
    }

    for idx, layer in enumerate(layers):
        try:
            src = resolve_path(layer)
            label = layer.get("label") or layer.get("layer_id") or f"Layer_{idx}"
            safe_label = "".join([c if c.isalnum() else "_" for c in label])
            dst_filename = f"{idx:02d}_{safe_label}.png"
            dst_path = out_dir / dst_filename
            
            shutil.copy2(src, dst_path)
            
            # Since files are canvas-sized, offset is 0,0
            layout_data["layers"].append({
                "filename": dst_filename,
                "label": label,
                "x": 0,
                "y": 0,
                "width": canvas_width,
                "height": canvas_height,
                "z_index": idx
            })
        except Exception:
            continue
            
    (out_dir / "layout.json").write_text(json.dumps(layout_data, indent=2), encoding="utf-8")
    return str(out_dir)

def build(job_dir: Path, manifest: dict) -> str:
    png_dir = job_dir / "png_export"
    generate_pngs_from_manifest(manifest, str(png_dir), job_dir)
    return str(png_dir)
