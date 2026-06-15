import logging
from pathlib import Path
from typing import List

from services import psd_generator, png_exporter, svg_exporter

logger = logging.getLogger(__name__)

EXPORTERS = {
    "psd": psd_generator.generate_psd_from_manifest,
    "png": png_exporter.build,
    "svg": svg_exporter.build,
}

def assemble(job_dir_str: str, manifest: dict, formats: List[str]) -> dict:
    """Run all requested exporters.
    Returns: { format_name: { "success": bool, "path": str, "error": str } }
    """
    job_dir = Path(job_dir_str)
    results = {}
    
    if "all" in formats:
        formats = ["psd", "png", "svg"]

    for fmt in set(formats):
        fmt = fmt.lower().strip()
        if fmt not in EXPORTERS:
            results[fmt] = {"success": False, "error": f"Unknown format {fmt}"}
            continue

        try:
            if fmt == "psd":
                psd_path = str(job_dir / "result.psd")
                EXPORTERS[fmt](manifest, psd_path)
                results[fmt] = {"success": True, "path": psd_path}
            else:
                out_path = EXPORTERS[fmt](job_dir, manifest)
                results[fmt] = {"success": True, "path": out_path}
        except Exception as e:
            logger.exception("Export failed for format %s: %s", fmt, e)
            results[fmt] = {"success": False, "error": str(e)}

    return results
