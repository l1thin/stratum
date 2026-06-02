# Stratum — API Reference

This document describes the backend HTTP API implemented by the image-to-psd backend.

Base path: `/api`

Endpoints

- POST `/api/upload`
	- Multipart form upload: `file` (image/png | image/jpeg | image/webp)
	- Response: `200` `{ "job_id": "<uuid>", "status": "queued" }`
	- Starts a background pipeline that performs segmentation, detection, OCR, manifest assembly and PSD generation.

- POST `/api/generate_psd`
	- Query parameter: `job_id` (string)
	- Response: `200` `{ "success": true, "psd_path": "<path>", "layer_count": <int>, "file_size_kb": <float> }`
	- Manually triggers PSD assembly and compilation from the compiled `layers.json` manifest.

- GET `/api/status/{job_id}`
	- Response: `200` `{ "job_id": "<id>", "status": "queued|preprocessing|segmenting|segmented|ocr|assembling|done|failed", "progress": <0-100> }`
	- `404` if job not found

- GET `/api/result/{job_id}`
	- If processing not finished: `202` `{ "status": "processing" }`
	- If done: `200` `{ "job_id": "<id>", "status": "done", "layers": [ { layer objects... } ] }`
	- Each layer object: `{ "layer_id", "type", "label", "bounding_box", "thumbnail_url" }`
	- `404` if job not found

- GET `/api/download/{job_id}`
	- If processing not finished: `202` `{ "status": "processing" }`
	- If done: `200` — returns `result.psd` as binary with header `Content-Disposition: attachment; filename=result.psd` and media type `application/octet-stream`.
	- `404` if file is missing or job not found

- GET `/api/outputs/{job_id}/{file_path}`
	- Serves static artifacts produced by the pipeline (thumbnails, intermediate PNGs, `text_manifest.json`, etc.).
	- `404` if file not found, `403` for forbidden/path traversal attempts.

- GET `/api/health`
	- Response: `200` `{ "status": "ok" }`
	- Service health check endpoint.

Notes

- The API is implemented in `image-to-psd-backend/routes/api.py`.
- Pipeline stages live under `image-to-psd-backend/services/` and are executed in a background thread started by `/api/upload`.
- For production use you should replace the in-memory `job_store` with a persistent store (Redis/DB) and run the pipeline as a proper worker (Celery/RQ) rather than threads.
