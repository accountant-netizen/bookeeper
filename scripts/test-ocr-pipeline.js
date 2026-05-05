const fetch = require('node-fetch');
const fs = require('fs');

async function run() {
  // Read sample text file and upload as base64
  const sample = 'Hello OCR test from sample text file.';
  const b64 = Buffer.from(sample, 'utf8').toString('base64');

  const payload = { companyId: '00000000-0000-0000-0000-000000000000', filename: 'sample.txt', mimeType: 'text/plain', contentBase64: b64 };

  console.log('Uploading document... (note: use a valid auth token in production)');
  const res = await fetch('http://localhost:3000/api/documents/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const j = await res.json();
  console.log('Upload response:', j);

  if (!j.jobId) return console.log('Upload failed, cannot proceed');

  console.log('Processing OCR job...');
  const p = await fetch('http://localhost:3000/api/documents/ocr/process', { method: 'POST' });
  const r = await p.json();
  console.log('Process response:', r);
}

run().catch(e=>{ console.error(e); process.exit(2); });
