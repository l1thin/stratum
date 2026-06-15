import logging
import threading
from typing import List

from models.job import update_job
from services.segmentor import segment_background
from services.object_detector import detect_objects
from services.ocr_service import detect_text
from services.manifest_builder import assemble_manifest
from services.psd_generator import generate_psd
from services import export_manager

logger = logging.getLogger(__name__)


def _safe_call(func, *args, stage_name: str = "", job_id: str = "", **kwargs):
    try:
        return func(*args, **kwargs)
    except Exception as exc:
        logger.exception("Stage %s failed for job %s: %s", stage_name, job_id, exc)
        update_job(job_id, status="failed", error=str(exc))
        raise


def run_pipeline(job_id: str, formats: List[str] = None) -> None:
    """Run the full AI pipeline for a job_id in sequence.

    Stages:
    1. Preprocessing (already done at upload) — status: preprocessing
    2. Background segmentation — status: segmenting
    3. Object detection — status: segmenting
    4. Text/OCR detection — status: ocr
    5. Layer manifest assembly — status: assembling
    6. Export generation (PSD/PNG/SVG) — status: done | failed
    """
    if formats is None:
        formats = ["psd"]
    thread_name = threading.current_thread().name
    logger.info("Starting pipeline thread %s for job %s", thread_name, job_id)

    try:
        update_job(job_id, status="preprocessing", progress=5)

        # 2. Background segmentation
        update_job(job_id, status="segmenting", progress=10)
        bg_result = _safe_call(segment_background, job_id, stage_name="segment_background", job_id=job_id)
        if not bg_result or not bg_result.get("success"):
            # segment_background already sets failed status when it returns failure
            return

        # 3. Object detection
        update_job(job_id, status="segmenting", progress=50)
        objects = _safe_call(detect_objects, job_id, stage_name="detect_objects", job_id=job_id)

        # 4. Text/OCR detection
        update_job(job_id, status="ocr", progress=70)
        texts = _safe_call(detect_text, job_id, stage_name="detect_text", job_id=job_id)

        # 5. Assemble manifest
        update_job(job_id, status="assembling", progress=85)
        manifest = _safe_call(assemble_manifest, job_id, bg_result if isinstance(bg_result, dict) else {}, objects, texts, stage_name="assemble_manifest", job_id=job_id)

        # 6. Generate Exports
        update_job(job_id, status="assembling", progress=92)
        import json
        from utils.file_utils import get_job_dir
        job_dir_str = get_job_dir(job_id)
        manifest_path = Path(job_dir_str) / "layers.json"
        
        # fallback to assembled manifest if file read fails
        try:
            manifest_data = json.loads(manifest_path.read_text(encoding="utf-8"))
        except Exception:
            manifest_data = manifest
            
        export_result = _safe_call(export_manager.assemble, job_dir_str, manifest_data, formats, stage_name="export_manager", job_id=job_id)

        # evaluate export_result
        success = False
        if isinstance(export_result, dict):
            # If any requested format succeeded, we consider the pipeline done
            success = any(res.get("success") for res in export_result.values())

        if success:
            update_job(job_id, status="done", progress=100)
            logger.info("Pipeline completed successfully for job %s", job_id)
        else:
            update_job(job_id, status="failed", error="All exports failed")
            logger.error("Export generation reported failure for job %s: %s", job_id, export_result)

    except Exception as exc:
        # _safe_call already logged and updated job status; ensure final status is failed
        logger.exception("Pipeline aborted for job %s: %s", job_id, exc)
        update_job(job_id, status="failed", error=str(exc))
