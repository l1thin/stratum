import json
import os
from pathlib import Path
from typing import List

from PIL import Image
from psd_tools import PSDImage

from models.job import update_job
from utils.file_utils import get_job_dir


def generate_psd_from_manifest(manifest: dict, output_path: str) -> str:
    """Generate a PSD file from the provided manifest and return the file path.

    This helper accepts a manifest (list of layer dicts) and writes a PSD to
    `output_path` using psd-tools. Each layer dict is expected to include a
    path to a PNG under the key `file_path` and a human-readable `label`.
    """
    # manifest may be a dict with 'layers' or a list
    layers: List[dict] = manifest.get("layers") if isinstance(manifest, dict) else manifest
    if not layers:
        raise ValueError("Manifest contains no layers")

    # Resolve canvas size from the first available image (prefer background)
    def resolve_path(layer: dict, job_dir: Path) -> Path:
        # Preferred keys that might contain the PNG path
        for k in ("file_path", "path", "source_path", "thumbnail_path"):
            p = layer.get(k)
            if p:
                p = Path(p)
                if not p.is_absolute():
                    p = job_dir / p
                return p
        # Fallback to thumbnail_url -> thumbnails/{id}.png
        thumb = layer.get("thumbnail_url")
        if thumb and isinstance(thumb, str) and "/thumbnails/" in thumb:
            # expected format: /outputs/{job_id}/thumbnails/{layer_id}.png
            layer_id = layer.get("layer_id")
            if layer_id:
                return job_dir / "thumbnails" / f"{layer_id}.png"
        raise FileNotFoundError("No image path found for layer: %s" % layer.get("label"))

    job_dir = Path(output_path).resolve().parent

    # pick canvas size
    canvas_size = None
    # prefer a layer with type 'background'
    background_layer = next((l for l in layers if l.get("type") == "background"), None)
    pick = background_layer or (layers[0] if layers else None)
    if pick is None:
        raise ValueError("No layers to create PSD from")
    first_path = resolve_path(pick, job_dir)
    with Image.open(first_path) as img:
        base_img = img.convert("RGBA")
        canvas_size = base_img.size

    # Create PSD document from PIL base image mode
    psd = PSDImage.new(base_img.mode, canvas_size)

    # Add layers in provided order (background first -> topmost last)
    for layer in layers:
        try:
            src = resolve_path(layer, job_dir)
            with Image.open(src) as im:
                pil_im = im.convert("RGBA")
                label = layer.get("label") or layer.get("layer_id") or "Layer"
                psd.create_pixel_layer(pil_im, name=label, top=0, left=0)
        except Exception:
            # Skip layers that cannot be opened; continue building PSD
            continue

    # Ensure parent exists
    Path(output_path).resolve().parent.mkdir(parents=True, exist_ok=True)
    psd.save(output_path)
    return output_path


def generate_psd(job_id: str) -> dict:
    """Generate a PSD for the given job_id using /outputs/{job_id}/layers.json.

    Returns dict: { success: bool, psd_path: str, layer_count: int, file_size_kb: float }
    Updates job status to 'done' on success or 'failed' on error.
    
    Generates raster layers from image manifest. If text_manifest.json exists,
    it is preserved for manual text layer creation via Photoshop script.
    """
    try:
        job_dir = Path(get_job_dir(job_id))
        manifest_path = job_dir / "layers.json"
        if not manifest_path.exists():
            raise FileNotFoundError(f"Manifest not found: {manifest_path}")

        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

        psd_path = job_dir / "result.psd"
        output_path = str(psd_path)

        # generate PSD with raster layers only
        generate_psd_from_manifest(manifest, output_path)

        # quick validation: re-open and count layers
        reopened = PSDImage.open(output_path)
        layer_count = sum(1 for _ in reopened)

        file_size_kb = os.path.getsize(output_path) / 1024.0

        update_job(job_id, status="done", progress=100)

        return {"success": True, "psd_path": output_path, "layer_count": layer_count, "file_size_kb": file_size_kb}
    except Exception as e:
        import traceback
        traceback.print_exc()
        update_job(job_id, status="failed", error=str(e))
        return {"success": False, "psd_path": "", "layer_count": 0, "file_size_kb": 0.0}
