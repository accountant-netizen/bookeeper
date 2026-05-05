import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseCSV } from "@/lib/bankParser";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// POST /api/banking/statements/import
// Expects JSON: { content: string, name?: string, format?: 'csv' }
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const body = await req.json();
    const { content, format, name } = body || {};
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    if (format && format !== "csv") {
      return NextResponse.json({ error: "Only csv format supported in this endpoint" }, { status: 400 });
    }

    const parsed = parseCSV(content);

    // Persist import and lines
    const importRow = {
      company_id: user.companyId,
      name: name || `Import ${new Date().toISOString()}`,
      format: format || "csv",
      raw_content: content,
      created_by: user.id
    };

    const { data: importData, error: importError } = await supabase
      .from("bank_statement_imports")
      .insert(importRow)
      .select("id")
      .single();

    if (importError || !importData) {
      return NextResponse.json({ error: importError?.message || "Failed to create import" }, { status: 500 });
    }

    const importId = importData.id;

    // Bulk insert lines
    const linesToInsert = parsed.map((l: any) => ({
      import_id: importId,
      txn_date: l.txn_date || null,
      description: l.description || null,
      amount: l.amount,
      currency: l.currency || null
    }));

    if (linesToInsert.length > 0) {
      const { error: linesError } = await supabase.from("bank_statement_lines").insert(linesToInsert);
      if (linesError) {
        return NextResponse.json({ error: linesError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ importId, count: linesToInsert.length });
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
