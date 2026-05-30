# Stratum
AI-powered image decomposition and PSD export tool.

## Component layout
- Backend service: `image-to-psd-backend`
- Frontend: `frontend`

## Quick Start (backend)

1. Create and activate a virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install dependencies:

```powershell
pip install -r image-to-psd-backend/requirements.txt
```

3. Run the API server (from repo root):

```powershell
uvicorn image-to-psd-backend.main:app --reload --port 8000
```

## Useful docs
- API contract and reference: `docs/API_CONTRACT.md`, `docs/API_REFERENCE.md`
- PSD workflow and Photoshop import: `docs/USER_GUIDE_PSD_WORKFLOW.md`
- User guide: `docs/USER_GUIDE.md`

## Notes
- The backend uses an in-memory job store for development. For production replace it with Redis or a database and run the pipeline in a worker process.