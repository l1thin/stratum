# Stratum — API Contract
Status: FROZEN after Sprint 1. No changes without mutual agreement.

## Endpoints
| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| POST | /api/upload | multipart image file | { job_id, status } |
| GET | /api/status/:job_id | — | { job_id, status, progress } |
| GET | /api/result/:job_id | — | 202 when processing; 200 with `{ job_id, status, layers }` when done |
| GET | /api/download/:job_id | — | 202 when processing; 200 binary .psd file when done |
| GET | /api/outputs/:job_id/:file_path | — | static file (thumbnail, intermediate PNGs, text_manifest.json) |

## Layer Object Schema
{
  layer_id: string,
  type: "background" | "text" | "object",
  label: string,
  bounding_box: { x, y, width, height },
  thumbnail_url: string
}

## Status Values
queued | preprocessing | segmenting | ocr | assembling | done | failed

## Error Response
{ error: string, code: number }

### Notes
- Thumbnail URLs in manifest are exposed to the frontend under `/api/outputs/{job_id}/thumbnails/{layer_id}.png`.
- The backend returns `202` (Accepted) when a resource is not yet ready to indicate asynchronous processing.
