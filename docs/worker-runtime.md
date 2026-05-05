# Worker Runtime

The repo now includes durable job tables plus a lightweight local processor endpoint.

## Current Pieces

- `public.job_queue` for scheduled operational jobs
- `public.connector_sync_jobs` for integration sync work
- `public.document_ocr_jobs` for document OCR work
- `POST /api/automation/jobs/process` to process due jobs in a simple local loop

## Recommended Production Setup

Use a managed worker runtime such as Trigger.dev or Inngest to:

1. Poll due jobs.
2. Enforce idempotency for sync/export tasks.
3. Retry failed jobs with backoff.
4. Push OCR, reconciliation, and connector sync work off the request path.

## Remaining Gaps

- Durable retries and dead-letter handling
- Real file parsing for bank statements
- Real connector API calls and webhook callbacks
- OCR extraction using a hosted service or a background worker
