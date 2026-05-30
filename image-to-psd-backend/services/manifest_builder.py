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

    all_layers = []
    if background:
        all_layers.append(background)
    all_layers.extend(objects or [])
    all_layers.extend(texts or [])

    manifest_rows = []
    for layer in all_layers:
        layer_id = layer.get("layer_id")
        layer_type = layer.get("type")
        label = layer.get("label")
        bbox = layer.get("bounding_box")
        source_path = Path(layer.get("file_path"))

        thumbnail_path = thumbnails_dir / f"{layer_id}.png"
        thumbnail_url = f"/outputs/{job_id}/thumbnails/{layer_id}.png"

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
                "bounding_box": bbox,
                "thumbnail_url": thumbnail_url,
            }
        )

    manifest_path = job_dir / "layers.json"
    manifest_path.write_text(json.dumps(manifest_rows, indent=2), encoding="utf-8")

    return manifest_rows
