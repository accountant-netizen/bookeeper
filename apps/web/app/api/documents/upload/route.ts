import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// POST /api/documents/upload
// Body: { companyId, filename, mimeType, contentBase64 }
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const body = await req.json();
    const { companyId, filename, mimeType, contentBase64 } = body || {};
    if (!companyId || !filename || !contentBase64) {
      return NextResponse.json({ error: "companyId, filename, and contentBase64 are required" }, { status: 400 });
    }
    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    // Create document record
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .insert({
        company_id: companyId,
        filename,
        mime_type: mimeType || null,
        storage_path: null,
        ocr_status: "queued",
        metadata: {}
      })
      .select("id")
      .single();

    if (docErr || !doc) return NextResponse.json({ error: docErr?.message || "Failed to create document" }, { status: 500 });

    const documentId = doc.id;

    // Enqueue OCR job with payload containing base64 content (small files only)
    const { data: job, error: jobErr } = await supabase
      .from("document_ocr_jobs")
      .insert({
        company_id: companyId,
        document_id: documentId,
        engine: "tesseract",
        payload: { contentBase64 },
        status: "queued",
        attempts: 0,
        created_by: user.id
      })
      .select("id")
      .single();

    if (jobErr || !job) {
      return NextResponse.json({ error: jobErr?.message || "Failed to create OCR job" }, { status: 500 });
    }

    return NextResponse.json({ documentId, jobId: job.id }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
