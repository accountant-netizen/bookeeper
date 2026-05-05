import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// GET handled by parent; this file supports PUT (update) and DELETE
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser(req.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const id = params.id;
    const body = await req.json();
    const { name, pattern, priority } = body || {};

    const updateRow: any = {};
    if (name !== undefined) updateRow.name = name;
    if (pattern !== undefined) updateRow.pattern = pattern;
    if (priority !== undefined) updateRow.priority = priority;

    const { data, error } = await supabase
      .from("bank_statement_match_rules")
      .update(updateRow)
      .eq("id", id)
      .eq("company_id", user.companyId)
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data?.id });
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser(req.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const id = params.id;
    const { error } = await supabase.from("bank_statement_match_rules").delete().eq("id", id).eq("company_id", user.companyId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
