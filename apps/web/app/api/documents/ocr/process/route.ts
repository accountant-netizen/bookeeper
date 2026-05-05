import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { performOCR } from "@/lib/ocrProviders";

// POST /api/documents/ocr/process
// Picks next queued OCR job and processes it synchronously.
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    // Select next queued job that's ready
    const { data: jobs } = await supabase
      .from("document_ocr_jobs")
      .select("id, document_id, payload, attempts")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(1);

    const job = jobs?.[0];
    if (!job) return NextResponse.json({ processed: 0, message: "No queued jobs" });

    // mark running
    await supabase.from("document_ocr_jobs").update({ status: "running", attempts: job.attempts + 1 }).eq("id", job.id);

    // Try to extract text from payload via performOCR adapter
    try {
      const extractedText = await performOCR(job.payload || {});

      // Update document record
      await supabase.from("documents").update({ extracted_text: extractedText, ocr_status: "completed" }).eq("id", job.document_id);

      // Mark job succeeded
      await supabase.from("document_ocr_jobs").update({ status: "succeeded", payload: { ...job.payload, extractedText } }).eq("id", job.id);

      return NextResponse.json({ processed: 1, jobId: job.id });
    } catch (procErr: any) {
      // mark job failed; save last_error and set status
      const lastError = String(procErr.message || procErr);
      await supabase.from("document_ocr_jobs").update({ status: "failed", last_error: lastError }).eq("id", job.id);
      await supabase.from("documents").update({ ocr_status: "failed" }).eq("id", job.document_id);
      return NextResponse.json({ processed: 0, error: lastError }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
