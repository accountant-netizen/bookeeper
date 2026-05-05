// Simple OCR worker: polls /api/documents/ocr/process and processes queued jobs.
// Usage: OCR_PROCESS_URL=http://localhost:3000/api/documents/ocr/process AUTH_BEARER=Bearer\ <token> node scripts/ocr-worker.js

const fetchFn = (typeof fetch !== 'undefined') ? fetch : require('node-fetch');

const endpoint = process.env.OCR_PROCESS_URL || 'http://localhost:3000/api/documents/ocr/process';
const auth = process.env.AUTH_BEARER || undefined;

let backoff = 1000; // 1s
const maxBackoff = 30000;
const idleMultiplier = 1.5;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function poll() {
  while (true) {
    try {
      const res = await fetchFn(endpoint, { method: 'POST', headers: auth ? { 'Authorization': auth } : {} });
      const j = await res.json().catch(()=>({}));
      if (res.ok && j && j.processed && j.processed > 0) {
        console.log(new Date().toISOString(), 'Processed job:', j.jobId);
        backoff = 1000; // reset
        // small delay before next job to avoid tight loop
        await sleep(200);
        continue;
      }

      // No job processed or error
      if (res.ok && j && j.processed === 0) {
        // no queued jobs
        backoff = Math.min(maxBackoff, Math.floor(backoff * idleMultiplier));
        console.log(new Date().toISOString(), 'No jobs, backing off to', backoff, 'ms');
        await sleep(backoff);
        continue;
      }

      // error response
      console.warn(new Date().toISOString(), 'Processor returned error', j.error || res.status);
      backoff = Math.min(maxBackoff, Math.floor(backoff * idleMultiplier));
      await sleep(backoff);
    } catch (e) {
      console.error(new Date().toISOString(), 'Worker error', e.message || e);
      backoff = Math.min(maxBackoff, Math.floor(backoff * idleMultiplier));
      await sleep(backoff);
    }
  }
}

poll().catch(err => { console.error('Fatal worker error', err); process.exit(2); });
