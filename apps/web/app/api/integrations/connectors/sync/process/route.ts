export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { performConnectorSync } from "@/lib/connectorProviders";

export async function POST(req: Request) {
  try {
    const authHeader = (req as any).headers?.get?.("authorization");
    const authUser = await getAuthUser(authHeader);
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

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

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    const payload = (job.payload as any) || {};

    // mark running
    const { error: updateErr } = await supabase
      .from("connector_sync_jobs")
      .update({
        status: "running",
        attempts: Number(job.attempts ?? 0) + 1,
      })
      .eq("id", job.id)
      .eq("company_id", user.companyId);

    if (updateErr) throw new Error(updateErr.message);

    const { data: config, error: configErr } = await supabase
      .from("connector_configs")
      .select("id, provider, settings")
      .eq("id", job.connector_config_id)
      .eq("company_id", user.companyId)
      .single();

    if (configErr || !config) {
      return NextResponse.json(
        { error: "Connector config not found" },
        { status: 404 }
      );
    }

    try {
      const result = await performConnectorSync({
        connectorId: config.id,
        provider: config.provider,
        settings: config.settings,
        lastSyncTime: payload.lastSyncTime,
      });

      await supabase
        .from("connector_sync_jobs")
        .update({
          status: "succeeded",
          payload: {
            ...payload,
            itemsProcessed: result.itemsProcessed,
            lastSyncTime: new Date().toISOString(),
            message: result.message,
          },
        })
        .eq("id", job.id)
        .eq("company_id", user.companyId);

      return NextResponse.json({
        processed: 1,
        jobId: job.id,
        status: "succeeded",
      });
    } catch (syncErr: any) {
      const errorMsg = syncErr.message || String(syncErr);

      await supabase
        .from("connector_sync_jobs")
        .update({
          status: "failed",
          last_error: errorMsg,
          payload: {
            ...payload,
            failedAt: new Date().toISOString(),
          },
        })
        .eq("id", job.id)
        .eq("company_id", user.companyId);

      return NextResponse.json({
        processed: 1,
        jobId: job.id,
        status: "failed",
        error: errorMsg,
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err.message || err) },
      { status: 500 }
    );
  }
}