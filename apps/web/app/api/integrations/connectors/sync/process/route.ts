import { NextResponse } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { performConnectorSync } from "@/lib/connectorProviders";

// POST /api/integrations/connectors/sync/process -> pick next queued job and process it
export async function POST(req: Request) {
  try {
    const authHeader = (req as any).headers?.get?.("authorization");
    const authUser = await getAuthUser(authHeader);
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    // Get next queued job (ordered by created_at)
    const { data: jobs, error: fetchErr } = await supabase
      .from("connector_sync_jobs")
      .select("id, connector_config_id, job_name, payload, status, attempts")
      .eq("company_id", user.companyId)
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(1);

    if (fetchErr) throw new Error(fetchErr.message);
    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ processed: 0, message: "No queued jobs" });
    }

    const job = jobs[0];

    // Mark as running
    const { error: updateErr } = await supabase
      .from("connector_sync_jobs")
      .update({ status: "running", attempts: (job.attempts || 0) + 1 })
      .eq("id", job.id)
      .eq("company_id", user.companyId);

    if (updateErr) throw new Error(updateErr.message);

    // Fetch connector config to get provider and settings
    const { data: config, error: configErr } = await supabase
      .from("connector_configs")
      .select("id, provider, settings")
      .eq("id", job.connector_config_id)
      .eq("company_id", user.companyId)
      .single();

    if (configErr) throw new Error("Connector config not found");

    // Perform sync
    try {
      const result = await performConnectorSync({
        connectorId: config.id,
        provider: config.provider,
        settings: config.settings,
        lastSyncTime: job.payload?.lastSyncTime,
      });

      // Update job status to succeeded
      await supabase
        .from("connector_sync_jobs")
        .update({
          status: "succeeded",
          payload: {
            ...job.payload,
            itemsProcessed: result.itemsProcessed,
            lastSyncTime: new Date().toISOString(),
            message: result.message,
          },
        })
        .eq("id", job.id)
        .eq("company_id", user.companyId);

      return NextResponse.json({ processed: 1, jobId: job.id, status: "succeeded" });
    } catch (syncErr: any) {
      // Update job status to failed
      const errorMsg = syncErr.message || String(syncErr);
      await supabase
        .from("connector_sync_jobs")
        .update({
          status: "failed",
          last_error: errorMsg,
          payload: {
            ...job.payload,
            failedAt: new Date().toISOString(),
          },
        })
        .eq("id", job.id)
        .eq("company_id", user.companyId);

      return NextResponse.json({ processed: 1, jobId: job.id, status: "failed", error: errorMsg });
    }
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
