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

    // Fetch accounts for the company
    const { data: accounts, error: accountsError } = await supabase
      .from("accounts")
      .select("id, code, name, account_type")
      .eq("company_id", companyId)
      .order("code", { ascending: true });

    if (accountsError) {
      return NextResponse.json({ error: accountsError.message }, { status: 500 });
    }

    // Fetch posted journal entries within date window (and before for opening)
    let entriesQuery = supabase
      .from("journal_entries")
      .select("id, entry_date")
      .eq("company_id", companyId)
      .eq("status", "posted");

    if (branchId) {
      entriesQuery = entriesQuery.eq("branch_id", branchId);
    }

    const { data: allEntries, error: entriesError } = await entriesQuery;

    if (entriesError) {
      return NextResponse.json({ error: entriesError.message }, { status: 500 });
    }

    const entries = (allEntries || []) as Array<{ id: string; entry_date: string }>;

    const beforeStartIds = new Set<string>();
    const inPeriodIds = new Set<string>();

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    for (const e of entries) {
      const d = new Date(e.entry_date);
      if (start && d < start) {
        beforeStartIds.add(e.id);
      }
      if (start && end) {
        if (d >= start && d <= end) {
          inPeriodIds.add(e.id);
        }
      } else if (start && !end) {
        if (d >= start) inPeriodIds.add(e.id);
      } else if (!start && end) {
        if (d <= end) inPeriodIds.add(e.id);
      } else {
        // no range provided -> treat all posted entries as period
        inPeriodIds.add(e.id);
      }
    }

    // Helper to fetch sums for a set of entry ids
    async function fetchSumsForEntryIds(entryIds: string[]) {
      if (entryIds.length === 0) return [];
      const { data, error } = await supabase
        .from("journal_lines")
        .select("account_id, debit, credit")
        .in("journal_entry_id", entryIds)
        .eq("company_id", companyId);

      if (error) throw new Error(error.message);
      return data || [];
    }

    const openingLines = await fetchSumsForEntryIds(Array.from(beforeStartIds));
    const periodLines = await fetchSumsForEntryIds(Array.from(inPeriodIds));

    const mapByAccount: Record<string, { openingDebit: number; openingCredit: number; periodDebit: number; periodCredit: number }> = {};

    for (const a of accounts || []) {
      mapByAccount[a.id] = { openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 0 };
    }

    for (const l of openingLines as any[]) {
      const acc = mapByAccount[l.account_id];
      if (!acc) continue;
      acc.openingDebit += Number(l.debit || 0);
      acc.openingCredit += Number(l.credit || 0);
    }

    for (const l of periodLines as any[]) {
      const acc = mapByAccount[l.account_id];
      if (!acc) continue;
      acc.periodDebit += Number(l.debit || 0);
      acc.periodCredit += Number(l.credit || 0);
    }

    const items = (accounts || []).map((a: any) => {
      const agg = mapByAccount[a.id] || { openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 0 };
      const opening = agg.openingDebit - agg.openingCredit;
      const period = agg.periodDebit - agg.periodCredit;
      const closing = opening + period;
      return {
        accountId: a.id,
        code: a.code,
        name: a.name,
        accountType: a.account_type || null,
        opening: opening.toFixed(2),
        periodDebit: agg.periodDebit.toFixed(2),
        periodCredit: agg.periodCredit.toFixed(2),
        periodBalance: period.toFixed(2),
        closing: closing.toFixed(2)
      };
    });

    return NextResponse.json({
      companyId,
      branchId: branchId || null,
      generatedAt: new Date().toISOString(),
      startDate: startDate || null,
      endDate: endDate || null,
      items
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
