# Stratum — API Contract
Status: FROZEN after Sprint 1. No changes without mutual agreement.

## Endpoints
| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| POST | /api/upload | multipart image file | { job_id, status } |
| GET | /api/status/:job_id | — | { job_id, status, progress } |
| GET | /api/result/:job_id | — | { layers: [...] } |
| GET | /api/download/:job_id | — | binary .psd file |

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
