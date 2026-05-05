import { NextResponse } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// POST /api/documents/ocr/jobs/[id]/rerun -> re-queue a failed job
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const authHeader = (req as any).headers?.get?.("authorization");
    const authUser = await getAuthUser(authHeader);
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const id = params.id;

    // Verify job belongs to user's company
    const { data: job, error: fetchErr } = await supabase
      .from("document_ocr_jobs")
      .select("id, status")
      .eq("company_id", user.companyId)
      .eq("id", id)
      .single();

    if (fetchErr || !job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Reset status to queued
    const { error } = await supabase
      .from("document_ocr_jobs")
      .update({ status: "queued", last_error: null, attempts: 0 })
      .eq("id", id)
      .eq("company_id", user.companyId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
