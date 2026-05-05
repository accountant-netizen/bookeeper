import { NextResponse } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// GET /api/integrations/connectors/sync/jobs/[id] -> get job details
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const authHeader = (req as any).headers?.get?.("authorization");
    const authUser = await getAuthUser(authHeader);
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const { data: job, error } = await supabase
      .from("connector_sync_jobs")
      .select("id, connector_config_id, job_name, payload, status, attempts, last_error, created_at")
      .eq("id", params.id)
      .eq("company_id", user.companyId)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ item: job });
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}

// POST /api/integrations/connectors/sync/jobs/[id]/rerun -> re-queue a failed job
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const authHeader = (req as any).headers?.get?.("authorization");
    const authUser = await getAuthUser(authHeader);
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    // Verify job belongs to user's company
    const { data: job, error: fetchErr } = await supabase
      .from("connector_sync_jobs")
      .select("id, status")
      .eq("id", params.id)
      .eq("company_id", user.companyId)
      .single();

    if (fetchErr || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Reset status to queued
    const { error } = await supabase
      .from("connector_sync_jobs")
      .update({ status: "queued", last_error: null, attempts: 0 })
      .eq("id", params.id)
      .eq("company_id", user.companyId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
