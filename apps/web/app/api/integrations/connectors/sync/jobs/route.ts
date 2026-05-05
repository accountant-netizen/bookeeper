import { NextResponse } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// GET /api/integrations/connectors/sync/jobs -> list all sync jobs
export async function GET(req: Request) {
  try {
    const authHeader = (req as any).headers?.get?.("authorization");
    const authUser = await getAuthUser(authHeader);
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const { data: jobs, error } = await supabase
      .from("connector_sync_jobs")
      .select("id, connector_config_id, job_name, payload, status, attempts, last_error, created_at")
      .eq("company_id", user.companyId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);
    return NextResponse.json({ items: jobs || [] });
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}

// POST /api/integrations/connectors/sync/jobs -> create new sync job
export async function POST(req: Request) {
  try {
    const authHeader = (req as any).headers?.get?.("authorization");
    const authUser = await getAuthUser(authHeader);
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const body = await req.json();
    const { connectorConfigId, jobName, payload } = body;

    if (!connectorConfigId || !jobName) {
      return NextResponse.json({ error: "Missing connectorConfigId or jobName" }, { status: 400 });
    }

    // Verify connector config belongs to user's company
    const { data: config, error: configErr } = await supabase
      .from("connector_configs")
      .select("id")
      .eq("id", connectorConfigId)
      .eq("company_id", user.companyId)
      .single();

    if (configErr || !config) {
      return NextResponse.json({ error: "Connector config not found" }, { status: 404 });
    }

    // Create job
    const { data: job, error } = await supabase
      .from("connector_sync_jobs")
      .insert({
        company_id: user.companyId,
        connector_config_id: connectorConfigId,
        job_name: jobName,
        payload: payload || {},
        status: "queued",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ item: job });
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
