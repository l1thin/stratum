import os
from pathlib import Path
from PIL import Image
from services.png_exporter import generate_pngs_from_manifest
from services.svg_exporter import build as svg_build

def test_exporters(tmp_path: Path):
    job_dir = tmp_path / "job"
    job_dir.mkdir()
    
    # Create dummy images
    bg_path = job_dir / "bg.png"
    Image.new("RGBA", (100, 100), "white").save(bg_path)
    
    obj_path = job_dir / "obj.png"
    Image.new("RGBA", (100, 100), "red").save(obj_path)

    manifest = {
        "layers": [
            {"layer_id": "bg", "type": "background", "label": "BG", "file_path": str(bg_path)},
            {"layer_id": "obj", "type": "object", "label": "OBJ", "file_path": str(obj_path)}
        ]
    }

    # Test PNG Exporter
    png_dir = tmp_path / "png_export"
    generate_pngs_from_manifest(manifest, str(png_dir), job_dir)
    assert (png_dir / "00_BG.png").exists()
    assert (png_dir / "01_OBJ.png").exists()
    assert (png_dir / "layout.json").exists()

    # Test SVG Exporter
    svg_path = svg_build(job_dir, manifest)
    assert Path(svg_path).exists()
    
    svg_content = Path(svg_path).read_text(encoding="utf-8")
    assert "<svg" in svg_content
    assert "<image" in svg_content
