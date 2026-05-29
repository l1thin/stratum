# Stratum — User Guide

This repository contains the backend services used to create layered PSDs from uploaded images.

Quick workflow for an end user

1. Upload an image to `POST /api/upload` (multipart `file`). The endpoint returns a `job_id`.
2. The server runs processing in the background: segmentation, object detection, OCR, manifest assembly, PSD generation.
3. Poll `GET /api/status/{job_id}` to monitor progress; when `status` becomes `done` the output artifacts are available.
4. Retrieve layer metadata via `GET /api/result/{job_id}` and download the PSD via `GET /api/download/{job_id}`.

See `docs/USER_GUIDE_PSD_WORKFLOW.md` for additional details about the PSD + Photoshop text import workflow and prerequisites (Tesseract, Photoshop for text layer import).
