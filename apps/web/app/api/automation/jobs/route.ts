import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuthUser, requireAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const companyId = request.nextUrl.searchParams.get("companyId") || user.companyId;
    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("job_queue")
      .select("id, job_type, idempotency_key, payload, status, run_after, attempts, last_error, created_at, updated_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const body = await request.json();
    const { companyId, jobType } = body;

    if (!companyId || !jobType) {
      return NextResponse.json({ error: "companyId and jobType are required" }, { status: 400 });
    }

    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("job_queue")
      .insert({
        company_id: companyId,
        job_type: jobType,
        idempotency_key: body.idempotencyKey || null,
        payload: body.payload || {},
        status: body.status || "queued",
        run_after: body.runAfter || null,
        attempts: body.attempts ?? 0,
        last_error: body.lastError || null,
        created_by: user.id
      })
      .select("id, job_type, idempotency_key, payload, status, run_after, attempts, last_error, created_at, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
