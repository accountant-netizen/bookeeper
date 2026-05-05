import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuthUser, requireAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const companyId = request.nextUrl.searchParams.get("companyId") || user.companyId;
    if (companyId !== user.companyId) return NextResponse.json({ error: "Company mismatch" }, { status: 403 });

    const { data, error } = await supabase
      .from("products")
      .select("id, code, name, description, unit, cost, price, is_active, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: data || [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const body = await request.json();
    const { code, name, description, unit, cost, price, isActive } = body;
    if (!code || !name) {
      return NextResponse.json({ error: "code and name are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("products")
      .insert({
        company_id: user.companyId,
        code,
        name,
        description: description || null,
        unit: unit || null,
        cost: cost || 0,
        price: price || 0,
        is_active: isActive !== undefined ? isActive : true
      })
      .select("id, code, name, description, unit, cost, price, is_active, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
