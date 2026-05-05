import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuthUser, requireAuthUser } from "@/lib/auth";

export async function POST(request: NextRequest, context: any) {
  try {
    const authUser = await getAuthUser(
      request.headers.get("authorization")
    );
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const body = await request.json();
    const companyId =
      body.companyId ||
      request.nextUrl.searchParams.get("companyId") ||
      user.companyId;

    if (companyId !== user.companyId) {
      return NextResponse.json(
        { error: "Company mismatch" },
        { status: 403 }
      );
    }

    const connectorId = context.params.id;

    const { data: connector, error: connectorError } = await supabase
      .from("connector_configs")
      .select("id, provider, name")
      .eq("company_id", companyId)
      .eq("id", connectorId)
      .single();

    if (connectorError || !connector) {
      return NextResponse.json(
        { error: "Connector not found" },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from("connector_sync_jobs")
      .insert({
        company_id: companyId,
        connector_config_id: connector.id,
        job_name:
          body.jobName || `${connector.provider}-sync`,
        payload: body.payload || {},
        status: "queued",
        run_after: body.runAfter || null,
        attempts: 0,
        created_by: user.id,
      })
      .select(
        "id, connector_config_id, job_name, payload, status, run_after, attempts, last_error, created_at"
      )
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ item: data }, { status: 201 });

  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}