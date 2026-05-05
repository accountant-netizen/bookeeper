import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { runMatchForImport } from "@/lib/bankMatcher";

export async function POST(request: NextRequest, { params }: { params: { importId: string } }) {
  try {
    const authUser = await getAuthUser(request.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const importId = params.importId;
    if (!importId) return NextResponse.json({ error: "Missing importId" }, { status: 400 });

    const res = await runMatchForImport(importId, user.companyId, user.id);
    return NextResponse.json({ success: true, result: res });
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuthUser, requireAuthUser } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: { importId: string } }) {
  try {
    const authUser = await getAuthUser(request.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const body = await request.json();
    const { companyId, bankStatementLineId, journalLineId } = body;

    if (!companyId || !bankStatementLineId || !journalLineId) {
      return NextResponse.json({ error: "companyId, bankStatementLineId, and journalLineId are required" }, { status: 400 });
    }
    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    const { error } = await supabase
      .from("bank_statement_lines")
      .update({ matched_journal_line_id: journalLineId, match_status: "matched" })
      .eq("id", bankStatementLineId)
      .eq("import_id", params.importId)
      .eq("company_id", companyId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
