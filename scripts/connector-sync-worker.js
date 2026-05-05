#!/usr/bin/env node

/**
 * Connector Sync Worker
 * Background process that polls for queued connector sync jobs and processes them.
 * 
 * Usage:
 *   SYNC_PROCESS_URL=http://localhost:3000/api/integrations/connectors/sync/process node scripts/connector-sync-worker.js
 * 
 * Environment Variables:
 *   SYNC_PROCESS_URL: URL to the sync process endpoint (required)
 *   AUTH_TOKEN: Bearer token for authentication (required)
 *   POLL_INTERVAL: Initial poll interval in ms (default: 5000)
 */

const http = require('http');
const https = require('https');

const SYNC_URL = process.env.SYNC_PROCESS_URL;
const AUTH_TOKEN = process.env.AUTH_TOKEN;
const INITIAL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '5000', 10);

if (!SYNC_URL || !AUTH_TOKEN) {
  console.error('Error: SYNC_PROCESS_URL and AUTH_TOKEN environment variables are required');
  process.exit(1);
}

console.log('[Connector Sync Worker] Starting...');
console.log(`[Connector Sync Worker] Process URL: ${SYNC_URL}`);

let backoffMs = INITIAL_INTERVAL;
const MAX_BACKOFF = 30000;

async function fetchWithRetry(url, method = 'POST') {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const urlObj = new URL(url);

    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = protocol.request(urlObj, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: { error: data } });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function processNextJob() {
  try {
    const result = await fetchWithRetry(SYNC_URL, 'POST');
    
    if (result.status === 200) {
      const { processed, jobId, status, message } = result.body;
      if (processed > 0) {
        console.log(`[${new Date().toISOString()}] ✓ Processed job ${jobId} (${status})`);
        backoffMs = INITIAL_INTERVAL; // Reset backoff on success
      } else {
        console.log(`[${new Date().toISOString()}] No jobs available`);
        // Increase backoff if nothing to process
        backoffMs = Math.min(backoffMs * 1.5, MAX_BACKOFF);
      }
    } else {
      console.error(`[${new Date().toISOString()}] ✗ Error: ${result.body.error || 'Unknown error'}`);
      backoffMs = Math.min(backoffMs * 1.5, MAX_BACKOFF);
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ✗ Fetch error:`, err.message);
    backoffMs = Math.min(backoffMs * 1.5, MAX_BACKOFF);
  }

  console.log(`[${new Date().toISOString()}] Waiting ${backoffMs / 1000}s before next poll...`);
  setTimeout(processNextJob, backoffMs);
}

// Start polling
processNextJob();
