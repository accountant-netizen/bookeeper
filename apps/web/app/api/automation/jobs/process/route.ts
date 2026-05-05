import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuthUser, requireAuthUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const companyId = request.nextUrl.searchParams.get("companyId") || user.companyId;
    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    const nowIso = new Date().toISOString();
    const { data: jobs, error } = await supabase
      .from("job_queue")
      .select("id, job_type, payload, attempts")
      .eq("company_id", companyId)
      .eq("status", "queued")
      .or(`run_after.is.null,run_after.lte.${nowIso}`)
      .order("created_at", { ascending: true })
      .limit(25);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const processed: Array<{ jobId: string; status: string }> = [];
    for (const job of jobs || []) {
      await supabase.from("job_queue").update({ status: "running", attempts: Number(job.attempts || 0) + 1 }).eq("id", job.id);
      await supabase.from("job_queue").update({ status: "succeeded", updated_at: new Date().toISOString() }).eq("id", job.id);
      processed.push({ jobId: job.id, status: "succeeded" });
    }

    return NextResponse.json({ companyId, processedCount: processed.length, processed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
