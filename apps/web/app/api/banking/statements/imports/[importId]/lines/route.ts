import { NextResponse } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: Request, context: any) {
  try {
    const authHeader = (request as any).headers?.get?.("authorization");
    const authUser = await getAuthUser(authHeader);
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const importId = context.params.importId;

    if (!importId) {
      return NextResponse.json(
        { error: "missing importId" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("bank_statement_lines")
      .select(
        "id, txn_date, description, amount, currency, matched_transaction_id, created_at"
      )
      .eq("import_id", importId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ items: data || [] });

  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}