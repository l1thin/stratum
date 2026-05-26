from fastapi import APIRouter

router = APIRouter(prefix="/api")


@router.post("/upload")
async def upload():
    return {"message": "not implemented"}


@router.get("/status/{job_id}")
async def status(job_id: str):
    return {"message": "not implemented"}


@router.get("/result/{job_id}")
async def result(job_id: str):
    return {"message": "not implemented"}


@router.get("/download/{job_id}")
async def download(job_id: str):
    return {"message": "not implemented"}
