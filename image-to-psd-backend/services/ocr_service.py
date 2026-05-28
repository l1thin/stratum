import logging
from pathlib import Path

import numpy as np
from PIL import Image
from pytesseract import Output, image_to_data

from utils.file_utils import get_job_dir

logger = logging.getLogger(__name__)


def _easyocr_fallback(image: Image.Image) -> list[dict]:
    try:
        import easyocr
    except ImportError as exc:
        raise RuntimeError("EasyOCR is unavailable for fallback OCR") from exc

    reader = easyocr.Reader(["en"], gpu=False)
    raw_results = reader.readtext(np.array(image.convert("RGB")), detail=1)
    detections = []

    for index, (bbox, text, confidence) in enumerate(raw_results, start=1):
        if not text.strip() or confidence * 100 <= 60:
            continue

        xs = [int(point[0]) for point in bbox]
        ys = [int(point[1]) for point in bbox]
        x, y = min(xs), min(ys)
        w, h = max(xs) - x, max(ys) - y
        detections.append(
            {
                "label": f"text_{index}",
                "text_content": text.strip(),
                "confidence": float(confidence * 100),
                "bounding_box": {"x": x, "y": y, "width": w, "height": h},
            }
        )
    return detections


def detect_text(job_id: str) -> list[dict]:
    job_dir = Path(get_job_dir(job_id))
    original_path = job_dir / "original.png"
    layers_dir = job_dir / "layers"
    layers_dir.mkdir(parents=True, exist_ok=True)

    if not original_path.exists():
        logger.warning("Original image missing for job_id %s", job_id)
        return []

    image = Image.open(original_path).convert("RGB")
    detections = []

    try:
        data = image_to_data(image, output_type=Output.DICT, config="--psm 6")
        blocks = {}

        num_items = len(data["text"])
        for i in range(num_items):
            text = data["text"][i].strip()
            if not text:
                continue

            try:
                conf = float(data["conf"][i])
            except ValueError:
                continue

            if conf <= 60:
                continue

            key = (
                int(data["block_num"][i]),
                int(data["par_num"][i]),
                int(data["line_num"][i]),
            )
            left = int(data["left"][i])
            top = int(data["top"][i])
            width = int(data["width"][i])
            height = int(data["height"][i])

            if key not in blocks:
                blocks[key] = {
                    "text": [],
                    "confs": [],
                    "x1": left,
                    "y1": top,
                    "x2": left + width,
                    "y2": top + height,
                }

            block = blocks[key]
            block["text"].append(text)
            block["confs"].append(conf)
            block["x1"] = min(block["x1"], left)
            block["y1"] = min(block["y1"], top)
            block["x2"] = max(block["x2"], left + width)
            block["y2"] = max(block["y2"], top + height)

        for index, block in enumerate(blocks.values(), start=1):
            text_content = " ".join(block["text"]).strip()
            avg_conf = sum(block["confs"]) / len(block["confs"])
            logger.info(
                "Text block %d for job %s confidence=%.2f text=%s",
                index,
                job_id,
                avg_conf,
                text_content,
            )

            if not text_content or avg_conf <= 60:
                continue

            x, y = block["x1"], block["y1"]
            width = block["x2"] - block["x1"]
            height = block["y2"] - block["y1"]
            cropped = image.crop((x, y, x + width, y + height)).convert("RGBA")
            file_path = layers_dir / f"text_{index}.png"
            cropped.save(file_path, format="PNG")

            detections.append(
                {
                    "layer_id": f"text_{index}",
                    "label": f"text_{index}",
                    "text_content": text_content,
                    "bounding_box": {"x": x, "y": y, "width": width, "height": height},
                    "file_path": str(file_path),
                }
            )

        if detections:
            return detections
    except Exception as exc:
        logger.warning("pytesseract failed for job %s: %s", job_id, exc)

    try:
        import numpy as np

        fallback_detections = _easyocr_fallback(image)
        for index, item in enumerate(fallback_detections, start=1):
            logger.info(
                "EasyOCR text block %d for job %s confidence=%.2f text=%s",
                index,
                job_id,
                item["confidence"],
                item["text_content"],
            )
            x = item["bounding_box"]["x"]
            y = item["bounding_box"]["y"]
            width = item["bounding_box"]["width"]
            height = item["bounding_box"]["height"]
            cropped = image.crop((x, y, x + width, y + height)).convert("RGBA")
            file_path = layers_dir / f"text_{index}.png"
            cropped.save(file_path, format="PNG")
            detections.append(
                {
                    "layer_id": item["label"],
                    "label": item["label"],
                    "text_content": item["text_content"],
                    "bounding_box": {"x": x, "y": y, "width": width, "height": height},
                    "file_path": str(file_path),
                }
            )
    except Exception as exc:
        logger.warning("EasyOCR fallback failed for job %s: %s", job_id, exc)

    return detections
