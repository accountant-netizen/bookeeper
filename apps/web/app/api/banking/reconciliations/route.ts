import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuthUser, requireAuthUser } from "@/lib/auth";

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
      .from("bank_reconciliations")
      .select("id, bank_account_id, statement_start_date, statement_end_date, statement_balance, book_balance, difference, status, notes, created_at")
      .eq("company_id", companyId)
      .order("statement_end_date", { ascending: false });

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
    const { companyId, bankAccountId, statementStartDate, statementEndDate, statementBalance } = body;

    if (!companyId || !bankAccountId || !statementStartDate || !statementEndDate) {
      return NextResponse.json(
        { error: "companyId, bankAccountId, statementStartDate, and statementEndDate are required" },
        { status: 400 }
      );
    }

    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    const { data: bankAccount, error: bankAccountError } = await supabase
      .from("bank_accounts")
      .select("id, ledger_account_id")
      .eq("company_id", companyId)
      .eq("id", bankAccountId)
      .single();

    if (bankAccountError || !bankAccount) {
      return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
    }

    let bookBalance = Number(body.bookBalance || 0);
    if (bankAccount.ledger_account_id) {
      const { data: lines, error: linesError } = await supabase
        .from("journal_lines")
        .select("debit, credit")
        .eq("company_id", companyId)
        .eq("account_id", bankAccount.ledger_account_id)
        .lte("created_at", `${statementEndDate}T23:59:59Z`);

      if (linesError) {
        return NextResponse.json({ error: linesError.message }, { status: 500 });
      }

      bookBalance = (lines || []).reduce(
        (sum: number, row: any) => sum + Number(row.debit || 0) - Number(row.credit || 0),
        0
      );
    }

    const statementBalanceValue = Number(statementBalance || 0);
    const difference = statementBalanceValue - bookBalance;

    const { data, error } = await supabase
      .from("bank_reconciliations")
      .insert({
        company_id: companyId,
        bank_account_id: bankAccountId,
        statement_start_date: statementStartDate,
        statement_end_date: statementEndDate,
        statement_balance: statementBalanceValue,
        book_balance: bookBalance,
        difference,
        status: body.status || "draft",
        notes: body.notes || null,
        created_by: user.id
      })
      .select("id, bank_account_id, statement_start_date, statement_end_date, statement_balance, book_balance, difference, status, notes, created_at")
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
