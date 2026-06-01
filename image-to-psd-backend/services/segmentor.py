import logging
from io import BytesIO
from pathlib import Path

from PIL import Image

from models.job import update_job
from utils.file_utils import get_job_dir

logger = logging.getLogger(__name__)


def _grabcut_fallback(image: Image.Image) -> Image.Image:
    try:
        import cv2
        import numpy as np
    except ImportError as exc:
        raise RuntimeError("OpenCV is unavailable for fallback segmentation") from exc

    numpy_image = np.array(image.convert("RGB"))
    mask = np.zeros(numpy_image.shape[:2], np.uint8)
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)
    height, width = numpy_image.shape[:2]
    rect = (1, 1, width - 2, height - 2)

    cv2.grabCut(numpy_image, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)
    mask2 = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype("uint8")

    alpha = Image.fromarray(mask2, mode="L")
    result = image.convert("RGBA")
    result.putalpha(alpha)
    return result


def _white_fill_fallback(image: Image.Image) -> Image.Image:
    background = Image.new("RGBA", image.size, (255, 255, 255, 255))
    return background


def segment_background(job_id: str) -> dict:
    update_job(job_id, status="segmenting", progress=10)

    job_dir = Path(get_job_dir(job_id))
    original_path = job_dir / "original.png"
    layer_dir = job_dir / "layers"
    layer_dir.mkdir(parents=True, exist_ok=True)
    output_path = layer_dir / "background.png"

    if not original_path.exists():
        error_text = "Original image not found for job_id"
        update_job(job_id, status="failed", error=error_text)
        return {"success": False, "layer_path": None, "error": error_text}

    try:
        image = Image.open(original_path).convert("RGB")
    except Exception as exc:
        error_text = f"Unable to open original image: {exc}"
        update_job(job_id, status="failed", error=error_text)
        return {"success": False, "layer_path": None, "error": error_text}

    segmented = None
    try:
        from rembg import remove

        with BytesIO() as buffer:
            image.save(buffer, format="PNG")
            buffer.seek(0)
            result_bytes = remove(buffer.read())

        segmented = Image.open(BytesIO(result_bytes)).convert("RGBA")
    except BaseException as exc:
        logger.warning("rembg segmentation failed for job %s: %s", job_id, exc)
        try:
            segmented = _grabcut_fallback(image)
        except Exception as fallback_exc:
            logger.warning(
                "GrabCut fallback failed for job %s: %s. Using white fill fallback.",
                job_id,
                fallback_exc,
            )
            segmented = _white_fill_fallback(image)

    segmented.save(output_path, format="PNG")
    output_size = output_path.stat().st_size
    logger.info("Background layer saved for job %s at %s (%d bytes)", job_id, output_path, output_size)

    update_job(job_id, status="segmented", progress=50)

    return {"success": True, "layer_path": str(output_path), "error": None}
