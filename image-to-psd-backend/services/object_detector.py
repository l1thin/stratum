from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from utils.file_utils import get_job_dir

MIN_OBJECT_AREA = 1000


def detect_objects(job_id: str) -> list[dict]:
    job_dir = Path(get_job_dir(job_id))
    original_path = job_dir / "original.png"
    background_path = job_dir / "layers" / "background.png"
    output_dir = job_dir / "layers"
    output_dir.mkdir(parents=True, exist_ok=True)

    if not original_path.exists() or not background_path.exists():
        return []

    original = Image.open(original_path).convert("RGBA")
    background = Image.open(background_path).convert("RGBA")

    alpha = background.split()[-1]
    mask = np.array(alpha)
    _, thresh = cv2.threshold(mask, 1, 255, cv2.THRESH_BINARY)

    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    detections = []
    object_index = 1

    for contour in contours:
        area = cv2.contourArea(contour)
        if area < MIN_OBJECT_AREA:
            continue

        x, y, w, h = cv2.boundingRect(contour)
        object_mask = Image.new("L", original.size, 0)
        object_draw = np.zeros((original.height, original.width), dtype=np.uint8)
        cv2.drawContours(object_draw, [contour], -1, 255, thickness=-1)
        object_mask = Image.fromarray(object_draw)

        cropped = original.crop((x, y, x + w, y + h)).convert("RGBA")
        cropped_mask = object_mask.crop((x, y, x + w, y + h))
        cropped.putalpha(cropped_mask)

        layer_name = f"object_{object_index}"
        file_path = output_dir / f"obj_{object_index}.png"
        cropped.save(file_path, format="PNG")

        detections.append(
            {
                "layer_id": layer_name,
                "label": layer_name,
                "bounding_box": {"x": int(x), "y": int(y), "width": int(w), "height": int(h)},
                "file_path": str(file_path),
            }
        )
        object_index += 1

    return detections
