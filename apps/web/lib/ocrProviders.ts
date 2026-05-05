// Lightweight OCR provider adapter.
// Exposes `performOCR` which will try local Tesseract.js first, then fall back to
// an external provider if configured via environment variables.

import fs from "fs";

type OCRPayload = { contentBase64?: string; buffer?: Buffer };

export async function performOCR(payload: OCRPayload): Promise<string> {
  let buf: Buffer | undefined = payload.buffer;
  if (!buf && payload.contentBase64) {
    buf = Buffer.from(payload.contentBase64, "base64");
  }
  if (!buf) throw new Error("No buffer or contentBase64 provided to performOCR");

  // Try local Tesseract.js if available
  try {
    // dynamic import so runtime doesn't require tesseract unless used
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createWorker } = require("tesseract.js");
    const worker = createWorker();
    await worker.load();
    await worker.loadLanguage("eng");
    await worker.initialize("eng");
    const { data } = await worker.recognize(buf);
    await worker.terminate();
    if (data && data.text) return data.text;
  } catch (e) {
    // Continue to fallback
    // console.warn('Tesseract not available or failed:', e?.message || e);
  }

  // External provider fallback (simple pluggable interface)
  const provider = process.env.OCR_PROVIDER; // e.g., 'mock' or 'none' or provider name
  if (!provider || provider === "none") {
    throw new Error("No OCR provider available (tesseract failed and no external provider configured)");
  }

  if (provider === "mock") {
    // Simple mock: if file contains printable text, return it; otherwise return placeholder
    const text = buf.toString("utf8");
    const printable = (text.match(/[\x20-\x7E]/g) || []).length;
    if (printable / Math.max(1, text.length) > 0.5) return text;
    return "[mock-ocr] (no readable text)";
  }

  // For real external providers, user can implement a custom adapter here.
  // Example: provider === 'google' with env GOOGLE_OCR_API_KEY
  if (provider === "google") {
    const key = process.env.GOOGLE_OCR_API_KEY;
    if (!key) throw new Error("GOOGLE_OCR_API_KEY not configured");
    // Minimal example: user should replace with proper Google Cloud Vision client usage.
    throw new Error("Google provider adapter not implemented. Configure a provider or use 'mock'");
  }

  throw new Error(`Unsupported OCR_PROVIDER: ${provider}`);
}

export default { performOCR };
