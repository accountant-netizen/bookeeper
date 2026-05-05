import { NextResponse } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// GET job details
export async function GET(req: Request, context: any) {
  try {
    const authHeader = (req as any).headers?.get?.("authorization");
    const authUser = await getAuthUser(authHeader);
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const id = context.params.id;

    const { data: job, error } = await supabase
      .from("connector_sync_jobs")
      .select(
        "id, connector_config_id, job_name, payload, status, attempts, last_error, created_at"
      )
      .eq("id", id)
      .eq("company_id", user.companyId)
      .single();

    if (error || !job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ item: job });

  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// POST rerun job
export async function POST(req: Request, context: any) {
  try {
    const authHeader = (req as any).headers?.get?.("authorization");
    const authUser = await getAuthUser(authHeader);
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const id = context.params.id;

    // Verify job belongs to company
    const { data: job, error: fetchErr } = await supabase
      .from("connector_sync_jobs")
      .select("id, status")
      .eq("id", id)
      .eq("company_id", user.companyId)
      .single();

    if (fetchErr || !job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Reset job
    const { error } = await supabase
      .from("connector_sync_jobs")
      .update({
        status: "queued",
        last_error: null,
        attempts: 0,
      })
      .eq("id", id)
      .eq("company_id", user.companyId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}