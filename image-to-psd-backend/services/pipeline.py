import logging
import threading
from typing import List

from models.job import update_job
from services.segmentor import segment_background
from services.object_detector import detect_objects
from services.ocr_service import detect_text
from services.manifest_builder import assemble_manifest
from services.psd_generator import generate_psd

logger = logging.getLogger(__name__)


def _safe_call(func, *args, stage_name: str = "", job_id: str = "", **kwargs):
    try:
        return func(*args, **kwargs)
    except Exception as exc:
        logger.exception("Stage %s failed for job %s: %s", stage_name, job_id, exc)
        update_job(job_id, status="failed", error=str(exc))
        raise


def run_pipeline(job_id: str) -> None:
    """Run the full AI pipeline for a job_id in sequence.

    Stages:
    1. Preprocessing (already done at upload) — status: preprocessing
    2. Background segmentation — status: segmenting
    3. Object detection — status: segmenting
    4. Text/OCR detection — status: ocr
    5. Layer manifest assembly — status: assembling
    6. PSD generation — status: done | failed
    """
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

        # 6. Generate PSD
        update_job(job_id, status="assembling", progress=92)
        psd_result = _safe_call(generate_psd, job_id, stage_name="generate_psd", job_id=job_id)

        # evaluate psd_result
        if isinstance(psd_result, dict) and psd_result.get("success"):
            update_job(job_id, status="done", progress=100)
            logger.info("Pipeline completed successfully for job %s", job_id)
        else:
            update_job(job_id, status="failed", error=str(psd_result))
            logger.error("PSD generation reported failure for job %s: %s", job_id, psd_result)

    except Exception as exc:
        # _safe_call already logged and updated job status; ensure final status is failed
        logger.exception("Pipeline aborted for job %s: %s", job_id, exc)
        update_job(job_id, status="failed", error=str(exc))
