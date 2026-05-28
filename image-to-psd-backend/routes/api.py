from io import BytesIO
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image

from models.job import update_job
from utils.file_utils import get_job_dir

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


@router.get("/status/{job_id}")
async def status(job_id: str):
    job = job_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return {"job_id": job_id, **job}


@router.get("/result/{job_id}")
async def result(job_id: str):
    job = job_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    psd_path = Path(get_job_dir(job_id)) / "export.psd"
    psd_url = f"/api/download/{job_id}" if psd_path.exists() else None

    return {
        "job_id": job_id,
        "status": job["status"],
        "psd_url": psd_url,
        "layers": ["background", "foreground", "text"],
    }


@router.get("/download/{job_id}")
async def download(job_id: str):
    psd_path = Path(get_job_dir(job_id)) / "export.psd"
    if not psd_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PSD export not available")
    return FileResponse(
        str(psd_path),
        media_type="application/vnd.adobe.photoshop",
        filename=psd_path.name,
    )
