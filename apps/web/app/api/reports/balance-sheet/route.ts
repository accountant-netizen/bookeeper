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
    const asOf = request.nextUrl.searchParams.get("asOf"); // ISO date (inclusive)

    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    const asOfDate = asOf ? new Date(asOf) : new Date();

    // Fetch accounts
    const { data: accounts, error: accountsError } = await supabase
      .from("accounts")
      .select("id, code, name, account_type")
      .eq("company_id", companyId)
      .order("code", { ascending: true });

    if (accountsError) return NextResponse.json({ error: accountsError.message }, { status: 500 });

    // Fetch posted journal entries up to asOfDate
    let entriesQuery = supabase
      .from("journal_entries")
      .select("id, entry_date")
      .eq("company_id", companyId)
      .eq("status", "posted")
      .lte("entry_date", asOfDate.toISOString().split("T")[0]);

    if (branchId) entriesQuery = entriesQuery.eq("branch_id", branchId);

    const { data: entries, error: entriesError } = await entriesQuery;
    if (entriesError) return NextResponse.json({ error: entriesError.message }, { status: 500 });

    const entryIds = (entries || []).map((e: any) => e.id);

    // Fetch journal lines for those entries
    const { data: lines, error: linesError } = entryIds.length
      ? await supabase
          .from("journal_lines")
          .select("account_id, debit, credit")
          .in("journal_entry_id", entryIds)
          .eq("company_id", companyId)
      : { data: [], error: null };

    if (linesError) return NextResponse.json({ error: linesError.message }, { status: 500 });

    const sumsByAccount: Record<string, { debit: number; credit: number }> = {};
    for (const a of accounts || []) sumsByAccount[a.id] = { debit: 0, credit: 0 };

    for (const l of lines || []) {
      const sum = sumsByAccount[l.account_id];
      if (!sum) continue;
      sum.debit += Number(l.debit || 0);
      sum.credit += Number(l.credit || 0);
    }

    const grouped: {
      assets: Array<any>;
      liabilities: Array<any>;
      equity: Array<any>;
      other: Array<any>;
    } = {
      assets: [],
      liabilities: [],
      equity: [],
      other: []
    };

    for (const a of accounts || []) {
      const s = sumsByAccount[a.id] || { debit: 0, credit: 0 };
      const net = s.debit - s.credit; // debit-positive
      const rec = { accountId: a.id, code: a.code, name: a.name, accountType: a.account_type || null, balance: net.toFixed(2) };
      const type = (a.account_type || "").toLowerCase();
      if (type === "asset") grouped.assets.push(rec);
      else if (type === "liability") grouped.liabilities.push(rec);
      else if (type === "equity") grouped.equity.push(rec);
      else grouped.other.push(rec);
    }

    const total = (arr: any[]) => arr.reduce((s: number, r: any) => s + parseFloat(r.balance || "0"), 0).toFixed(2);

    return NextResponse.json({
      companyId,
      branchId: branchId || null,
      asOf: asOfDate.toISOString().split("T")[0],
      generatedAt: new Date().toISOString(),
      assets: grouped.assets,
      liabilities: grouped.liabilities,
      equity: grouped.equity,
      other: grouped.other,
      totals: {
        assets: total(grouped.assets),
        liabilities: total(grouped.liabilities),
        equity: total(grouped.equity),
        other: total(grouped.other)
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
