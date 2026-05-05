import { NextResponse } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const authHeader = (request as any).headers?.get?.("authorization");
    const authUser = await getAuthUser(authHeader);
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("bank_statement_imports")
      .select("id, name, format, imported_at, created_by")
      .eq("company_id", user.companyId)
      .order("imported_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
