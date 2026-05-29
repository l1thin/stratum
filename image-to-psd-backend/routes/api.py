from io import BytesIO
from pathlib import Path
from uuid import uuid4
import json

from fastapi import APIRouter, File, UploadFile, HTTPException, status
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image

from models.job import update_job, job_store
from utils.file_utils import get_job_dir
from services.psd_generator import generate_psd

router = APIRouter(prefix="/api")

ALLOWED_TYPES = {"image/png", "image/jpeg", "image/webp"}
MAX_FILE_SIZE = 20 * 1024 * 1024
MAX_DIMENSION = 2048


@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        return JSONResponse(status_code=400, content={"error": "Invalid file type"})

    raw_data = await file.read()
    if len(raw_data) > MAX_FILE_SIZE:
        return JSONResponse(status_code=400, content={"error": "File too large"})

    try:
        image = Image.open(BytesIO(raw_data))
    except Exception:
        return JSONResponse(status_code=400, content={"error": "Invalid file type"})

    image = image.convert("RGB")
    image.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)

    job_id = str(uuid4())
    job_dir = Path(get_job_dir(job_id))
    original_path = job_dir / "original.png"
    image.save(original_path, format="PNG")

    update_job(job_id, status="queued", progress=0)

    return {"job_id": job_id, "status": "queued"}


@router.post("/generate_psd")
async def generate_psd_endpoint(job_id: str):
    """Generate PSD from /outputs/{job_id}/layers.json.
    
    Returns: { success: bool, psd_path: str, layer_count: int, file_size_kb: float }
    """
    result = generate_psd(job_id)
    return result


@router.get("/status/{job_id}")
async def status(job_id: str):
    """Return job status and progress.

    Response: { job_id, status, progress }
    Returns 404 if job_id is unknown.
    """
    job = job_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    # Only return the requested fields
    return {"job_id": job_id, "status": job.get("status"), "progress": job.get("progress", 0)}


@router.get("/result/{job_id}")
async def result(job_id: str):
    """Return processing result summary or layers when done.

    - If job is not found -> 404
    - If job not done -> 202 { status: "processing" }
    - If done -> read layers.json and return structured layers list
    """
    job = job_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    if job.get("status") != "done":
        return JSONResponse(status_code=status.HTTP_202_ACCEPTED, content={"status": "processing"})

    job_dir = Path(get_job_dir(job_id))
    layers_manifest = job_dir / "layers.json"
    if not layers_manifest.exists():
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Layers manifest not found")

    try:
        with open(layers_manifest, "r", encoding="utf-8") as fh:
            manifest = json.load(fh)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to read layers manifest: {e}")

    layers_out = []
    for layer in manifest.get("layers", []) if isinstance(manifest, dict) else manifest:
        # Expected keys in each layer entry: id/type/label/bbox/thumbnail (not all required)
        layer_id = layer.get("id") or layer.get("layer_id")
        ltype = layer.get("type") or layer.get("layerType")
        label = layer.get("label") or layer.get("name")
        bbox = layer.get("bbox") or layer.get("bounding_box")
        thumb = layer.get("thumbnail") or layer.get("thumbnail_url")
        thumbnail_url = None
        if thumb:
            # If thumbnail is a filename, expose via /api/outputs/
            thumbnail_url = f"/api/outputs/{job_id}/{thumb}"
        layers_out.append({
            "layer_id": layer_id,
            "type": ltype,
            "label": label,
            "bounding_box": bbox,
            "thumbnail_url": thumbnail_url,
        })

    return {"job_id": job_id, "status": job.get("status"), "layers": layers_out}


@router.get("/download/{job_id}")
async def download(job_id: str):
    """Return `result.psd` as a binary download when job is done.

    - If job is unknown -> 404
    - If job not done -> 202
    - If file missing -> 404
    """
    job = job_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    if job.get("status") != "done":
        return JSONResponse(status_code=status.HTTP_202_ACCEPTED, content={"status": "processing"})

    psd_path = Path(get_job_dir(job_id)) / "result.psd"
    if not psd_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PSD export not available")

    headers = {"Content-Disposition": f"attachment; filename={psd_path.name}"}
    return FileResponse(
        str(psd_path),
        media_type="application/octet-stream",
        headers=headers,
    )


@router.get("/outputs/{job_id}/{file_path:path}")
async def serve_outputs(job_id: str, file_path: str):
    """Serve files from the outputs directory for frontend access to thumbnails and artifacts.

    Example URL: `/api/outputs/{job_id}/thumbnail.png`
    """
    outputs_root = Path(__file__).resolve().parents[1] / "outputs"
    requested = (outputs_root / job_id / file_path).resolve()

    # Prevent path traversal outside outputs
    try:
        if not str(requested).startswith(str((outputs_root / job_id).resolve())):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    except Exception:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    if not requested.exists() or not requested.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    return FileResponse(str(requested), media_type="application/octet-stream")
