import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

type CreateCustomerRequest = {
  companyId: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  creditTermsDays?: number;
  isActive?: boolean;
};

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
      .from("customers")
      .select("id, code, name, email, phone, credit_terms_days, is_active, created_at")
      .eq("company_id", companyId)
      .order("code", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data ?? [] });
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

    const body = (await request.json()) as CreateCustomerRequest;
    if (!body.companyId || !body.code || !body.name) {
      return NextResponse.json(
        { error: "companyId, code, and name are required" },
        { status: 400 }
      );
    }

    if (body.companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("customers")
      .insert({
        company_id: body.companyId,
        code: body.code.trim(),
        name: body.name.trim(),
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        credit_terms_days: body.creditTermsDays ?? 30,
        is_active: body.isActive ?? true,
        created_by: user.id
      })
      .select("id, code, name, email, phone, credit_terms_days, is_active, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from("audit_logs").insert({
      company_id: user.companyId,
      actor_user_id: user.id,
      action: "customer_created",
      entity_name: "customers",
      entity_id: data.id,
      payload: { code: data.code }
    });

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
