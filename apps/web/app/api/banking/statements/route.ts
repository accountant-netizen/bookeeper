import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuthUser, requireAuthUser } from "@/lib/auth";

type StatementLine = {
  transactionDate: string;
  description: string;
  amount: number;
  direction: "debit" | "credit";
  referenceNo?: string;
};

function scoreMatch(line: StatementLine, ledgerLine: { debit: string | number; credit: string | number; description: string | null; created_at?: string | null }) {
  const amount = Number(line.amount || 0);
  const ledgerAmount = line.direction === "debit" ? Number(ledgerLine.debit || 0) : Number(ledgerLine.credit || 0);
  const amountScore = Math.abs(amount - ledgerAmount) < 0.005 ? 2 : 0;
  const descriptionScore = ledgerLine.description && line.description
    ? ledgerLine.description.toLowerCase().includes(line.description.toLowerCase().slice(0, 12))
      ? 1
      : 0
    : 0;
  return amountScore + descriptionScore;
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const companyId = request.nextUrl.searchParams.get("companyId") || user.companyId;
    const bankAccountId = request.nextUrl.searchParams.get("bankAccountId");
    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    let query = supabase
      .from("bank_statement_imports")
      .select("id, bank_account_id, statement_name, statement_start_date, statement_end_date, opening_balance, closing_balance, source_format, status, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (bankAccountId) {
      query = query.eq("bank_account_id", bankAccountId);
    }

    const { data, error } = await query;
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
    const { companyId, bankAccountId, statementName, statementStartDate, statementEndDate, lines } = body;
    if (!companyId || !bankAccountId || !statementName || !statementStartDate || !statementEndDate) {
      return NextResponse.json(
        { error: "companyId, bankAccountId, statementName, statementStartDate, and statementEndDate are required" },
        { status: 400 }
      );
    }
    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    const openingBalance = Number(body.openingBalance || 0);
    const closingBalance = Number(body.closingBalance || 0);
    const statementLines = Array.isArray(lines) ? (lines as StatementLine[]) : [];

    const { data: importRow, error: importError } = await supabase
      .from("bank_statement_imports")
      .insert({
        company_id: companyId,
        bank_account_id: bankAccountId,
        statement_name: statementName,
        statement_start_date: statementStartDate,
        statement_end_date: statementEndDate,
        opening_balance: openingBalance,
        closing_balance: closingBalance,
        source_format: body.sourceFormat || "json",
        source_payload: body.sourcePayload || { lines: statementLines },
        status: statementLines.length > 0 ? "parsed" : "imported",
        created_by: user.id
      })
      .select("id, bank_account_id, statement_name, statement_start_date, statement_end_date, opening_balance, closing_balance, source_format, status, created_at")
      .single();

    if (importError || !importRow) {
      return NextResponse.json({ error: importError?.message || "Failed to create statement import" }, { status: 500 });
    }

    if (statementLines.length > 0) {
      const { data: journalLines, error: journalLinesError } = await supabase
        .from("journal_lines")
        .select("id, debit, credit, description, created_at")
        .eq("company_id", companyId);

      if (journalLinesError) {
        return NextResponse.json({ error: journalLinesError.message }, { status: 500 });
      }

      const matches = statementLines.map((line) => {
        let bestMatch: string | null = null;
        let bestScore = 0;
        for (const journalLine of journalLines || []) {
          const score = scoreMatch(line, journalLine as any);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = (journalLine as any).id;
          }
        }
        return {
          import_id: importRow.id,
          company_id: companyId,
          transaction_date: line.transactionDate,
          description: line.description,
          reference_no: line.referenceNo || null,
          amount: line.amount,
          direction: line.direction,
          matched_journal_line_id: bestMatch,
          match_status: bestScore >= 2 ? "matched" : bestScore > 0 ? "suggested" : "unmatched"
        };
      });

      const { error: linesInsertError } = await supabase.from("bank_statement_lines").insert(matches);
      if (linesInsertError) {
        return NextResponse.json({ error: linesInsertError.message }, { status: 500 });
      }

      const matchedCount = matches.filter((match) => match.match_status === "matched").length;
      await supabase
        .from("bank_statement_imports")
        .update({ status: matchedCount === matches.length && matches.length > 0 ? "matched" : "parsed" })
        .eq("id", importRow.id);
    }

    return NextResponse.json({ item: importRow }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
