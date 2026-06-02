import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from routes.api import router as api_router

app = FastAPI()

# Dynamic CORS Configuration
origins_env = os.getenv("ALLOWED_ORIGINS", "")
if origins_env:
    if origins_env == "*":
        origins = ["*"]
        allow_credentials = False
    else:
        origins = [o.strip() for o in origins_env.split(",") if o.strip()]
        allow_credentials = True
else:
    # Allow all origins by default to prevent CORS blockage for external deployments like Netlify/Vercel
    origins = ["*"]
    allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# Serve static files from the built frontend bundle in production
FRONTEND_DIR = Path(__file__).resolve().parent / "static"
if FRONTEND_DIR.exists():
    @app.get("/{file_path:path}")
    async def serve_static(file_path: str):
        if file_path.startswith("api/"):
            return {"detail": "Not Found"}
            
        p = FRONTEND_DIR / file_path
        if p.exists() and p.is_file():
            return FileResponse(p)
            
        index_p = FRONTEND_DIR / "index.html"
        if index_p.exists():
            return FileResponse(index_p)
            
        return {"detail": "Not Found"}
