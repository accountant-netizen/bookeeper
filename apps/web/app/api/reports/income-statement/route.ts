import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuthUser, requireAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const companyId = request.nextUrl.searchParams.get("companyId") || user.companyId;
    const branchId = request.nextUrl.searchParams.get("branchId");
    const startDate = request.nextUrl.searchParams.get("startDate");
    const endDate = request.nextUrl.searchParams.get("endDate");

    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
    }

    // Fetch accounts
    const { data: accounts, error: accountsError } = await supabase
      .from("accounts")
      .select("id, code, name, account_type")
      .eq("company_id", companyId)
      .order("code", { ascending: true });

    if (accountsError) return NextResponse.json({ error: accountsError.message }, { status: 500 });

    // Fetch posted journal entries within the period
    let entriesQuery = supabase
      .from("journal_entries")
      .select("id, entry_date")
      .eq("company_id", companyId)
      .eq("status", "posted")
      .gte("entry_date", startDate)
      .lte("entry_date", endDate);

    if (branchId) entriesQuery = entriesQuery.eq("branch_id", branchId);

    const { data: entries, error: entriesError } = await entriesQuery;
    if (entriesError) return NextResponse.json({ error: entriesError.message }, { status: 500 });

    const entryIds = (entries || []).map((e: any) => e.id);

    const { data: lines, error: linesError } = entryIds.length
      ? await supabase
          .from("journal_lines")
          .select("account_id, debit, credit")
          .in("journal_entry_id", entryIds)
          .eq("company_id", companyId)
      : { data: [], error: null };

    if (linesError) return NextResponse.json({ error: linesError.message }, { status: 500 });

    const revenueAccounts = [] as Array<any>;
    const expenseAccounts = [] as Array<any>;
    const sumsByAccount: Record<string, { debit: number; credit: number }> = {};

    for (const a of accounts || []) {
      sumsByAccount[a.id] = { debit: 0, credit: 0 };
    }

    for (const l of lines || []) {
      if (!sumsByAccount[l.account_id]) continue;
      sumsByAccount[l.account_id].debit += Number(l.debit || 0);
      sumsByAccount[l.account_id].credit += Number(l.credit || 0);
    }

    for (const a of accounts || []) {
      const type = (a.account_type || "").toLowerCase();
      const s = sumsByAccount[a.id] || { debit: 0, credit: 0 };
      if (type === "revenue" || type === "income") {
        revenueAccounts.push({ accountId: a.id, code: a.code, name: a.name, amount: (s.credit - s.debit).toFixed(2) });
      } else if (type === "expense") {
        expenseAccounts.push({ accountId: a.id, code: a.code, name: a.name, amount: (s.debit - s.credit).toFixed(2) });
      }
    }

    const total = (arr: any[]) => arr.reduce((s: number, r: any) => s + parseFloat(r.amount || "0"), 0).toFixed(2);

    const totalRevenue = parseFloat(total(revenueAccounts));
    const totalExpenses = parseFloat(total(expenseAccounts));
    const netProfit = (totalRevenue - totalExpenses).toFixed(2);

    return NextResponse.json({
      companyId,
      branchId: branchId || null,
      startDate,
      endDate,
      generatedAt: new Date().toISOString(),
      revenueAccounts,
      expenseAccounts,
      totals: {
        revenue: totalRevenue.toFixed(2),
        expenses: totalExpenses.toFixed(2),
        netProfit
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
