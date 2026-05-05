import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// GET -> list rules, POST -> create rule
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("bank_statement_match_rules")
      .select("id, name, pattern, priority, created_at, created_by")
      .eq("company_id", user.companyId)
      .order("priority", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const body = await req.json();
    const { name, pattern, priority } = body || {};
    if (!name || !pattern) return NextResponse.json({ error: "name and pattern are required" }, { status: 400 });

    const row = {
      company_id: user.companyId,
      name,
      pattern,
      priority: priority ?? 100,
      created_by: user.id
    };

    const { data, error } = await supabase.from("bank_statement_match_rules").insert(row).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data?.id });
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
