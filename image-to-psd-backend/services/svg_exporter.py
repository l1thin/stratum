import json
import base64
from pathlib import Path
from typing import List
from PIL import Image

def build(job_dir: Path, manifest: dict) -> str:
    layers: List[dict] = manifest.get("layers") if isinstance(manifest, dict) else manifest
    if not layers:
        raise ValueError("Manifest contains no layers")

    def resolve_path(layer: dict) -> Path:
        for k in ("file_path", "path", "source_path"):
            p = layer.get(k)
            if p:
                p_path = Path(p)
                if not p_path.is_absolute():
                    return job_dir / p_path
                return p_path
        raise FileNotFoundError(f"No image path found for layer")

    pick = next((l for l in layers if l.get("type") == "background"), layers[0] if layers else None)
    canvas_width, canvas_height = 0, 0
    if pick:
        try:
            with Image.open(resolve_path(pick)) as img:
                canvas_width, canvas_height = img.size
        except Exception:
            pass

    svg_elements = []
    
    # Add raster layers as embedded base64
    for layer in layers:
        if layer.get("type") == "text":
            continue
        try:
            src = resolve_path(layer)
            with open(src, "rb") as f:
                b64_data = base64.b64encode(f.read()).decode("utf-8")
            
            label = layer.get("label", "layer")
            svg_elements.append(f'  <!-- {label} -->')
            svg_elements.append(f'  <image x="0" y="0" width="{canvas_width}" height="{canvas_height}" href="data:image/png;base64,{b64_data}" />')
        except Exception:
            continue

    # Add text layers from text_manifest.json if available
    text_manifest_path = job_dir / "text_manifest.json"
    if text_manifest_path.exists():
        try:
            texts = json.loads(text_manifest_path.read_text(encoding="utf-8"))
            for text_obj in texts:
                content = text_obj.get("text", "")
                bbox = text_obj.get("bbox", [0,0,0,0])
                x, y = bbox[0], bbox[1]
                h = bbox[3] - bbox[1]
                font_size = max(h, 12)
                # y in SVG text is the baseline, so y + font_size is a good approximation
                svg_elements.append(f'  <text x="{x}" y="{y + font_size}" font-family="sans-serif" font-size="{font_size}px" fill="black">{content}</text>')
        except Exception:
            pass

    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {canvas_width} {canvas_height}" width="{canvas_width}" height="{canvas_height}">
{chr(10).join(svg_elements)}
</svg>'''

    svg_path = job_dir / "result.svg"
    svg_path.write_text(svg_content, encoding="utf-8")
    return str(svg_path)
