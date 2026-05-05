**OCR Pipeline (overview & run instructions)**

- Worker: `scripts/ocr-worker.js` polls `POST /api/documents/ocr/process` and processes queued jobs.
- Adapter: `apps/web/lib/ocrProviders.ts` — tries `tesseract.js` then falls back to configured provider (`OCR_PROVIDER=mock` recommended for development).

Quick start (development):

1. Install optional dependency for local OCR (Tesseract):

```bash
npm install tesseract.js
```

2. Run the app and worker (worker polls process endpoint):

```bash
# in one terminal
npm run dev

# in another terminal
OCR_PROCESS_URL=http://localhost:3000/api/documents/ocr/process node scripts/ocr-worker.js
```

Notes:
- For production OCR, configure `OCR_PROVIDER` and appropriate credentials (not implemented here — add adapter in `apps/web/lib/ocrProviders.ts`).
- The worker uses a simple backoff strategy; consider running under a process manager (pm2/systemd) or a job platform for durability.
