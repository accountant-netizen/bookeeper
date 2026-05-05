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
      .from("recurring_transactions")
      .select("id, name, template_type, template_payload, frequency, next_run_date, last_run_at, is_active, created_at")
      .eq("company_id", companyId)
      .order("next_run_date", { ascending: true });

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
    const { companyId, name, templateType, templatePayload, frequency, nextRunDate } = body;

    if (!companyId || !name || !templateType || !frequency || !nextRunDate) {
      return NextResponse.json(
        { error: "companyId, name, templateType, frequency, and nextRunDate are required" },
        { status: 400 }
      );
    }

    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("recurring_transactions")
      .insert({
        company_id: companyId,
        branch_id: body.branchId || null,
        name: name.trim(),
        template_type: templateType,
        template_payload: templatePayload || {},
        frequency,
        next_run_date: nextRunDate,
        last_run_at: body.lastRunAt || null,
        is_active: body.isActive ?? true,
        created_by: user.id
      })
      .select("id, name, template_type, template_payload, frequency, next_run_date, last_run_at, is_active, created_at")
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
