import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuthUser, requireAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: { accountId: string } }) {
  try {
    const authUser = await getAuthUser(request.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const accountId = params.accountId;
    const companyId = request.nextUrl.searchParams.get("companyId") || user.companyId;
    const branchId = request.nextUrl.searchParams.get("branchId");
    const startDate = request.nextUrl.searchParams.get("startDate");
    const endDate = request.nextUrl.searchParams.get("endDate");

    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    // Verify account exists
    const { data: accountData, error: accountError } = await supabase
      .from("accounts")
      .select("id, code, name, account_type")
      .eq("company_id", companyId)
      .eq("id", accountId)
      .single();

    if (accountError || !accountData) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Fetch posted journal entries for this account
    let entriesQuery = supabase
      .from("journal_entries")
      .select("id, entry_date, reference_no")
      .eq("company_id", companyId)
      .eq("status", "posted");

    if (branchId) entriesQuery = entriesQuery.eq("branch_id", branchId);

    const { data: entries, error: entriesError } = await entriesQuery;
    if (entriesError) return NextResponse.json({ error: entriesError.message }, { status: 500 });

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const relevantEntryIds: string[] = [];
    for (const e of entries || []) {
      const d = new Date(e.entry_date);
      if (start && end) {
        if (d >= start && d <= end) relevantEntryIds.push(e.id);
      } else if (start && !end) {
        if (d >= start) relevantEntryIds.push(e.id);
      } else if (!start && end) {
        if (d <= end) relevantEntryIds.push(e.id);
      } else {
        relevantEntryIds.push(e.id);
      }
    }

    // Fetch journal lines for this account within the relevant entries
    let linesQuery = supabase
      .from("journal_lines")
      .select("id, journal_entry_id, description, debit, credit")
      .eq("company_id", companyId)
      .eq("account_id", accountId);

    if (relevantEntryIds.length > 0) {
      linesQuery = linesQuery.in("journal_entry_id", relevantEntryIds);
    } else {
      // No entries in range -> empty
      return NextResponse.json({
        account: accountData,
        items: [],
        generatedAt: new Date().toISOString()
      });
    }

    const { data: lines, error: linesError } = await linesQuery.order("id", { ascending: true });
    if (linesError) return NextResponse.json({ error: linesError.message }, { status: 500 });

    // Build a map of entry metadata
    const entryMap = new Map<string, any>();
    for (const e of entries || []) {
      entryMap.set(e.id, e);
    }

    // Compute running balance
    let running = 0;
    const items = (lines || []).map((l: any) => {
      const entry = entryMap.get(l.journal_entry_id) || {};
      const debit = Number(l.debit || 0);
      const credit = Number(l.credit || 0);
      running += debit - credit;
      return {
        lineId: l.id,
        entryId: l.journal_entry_id,
        entryDate: entry.entry_date || null,
        referenceNo: entry.reference_no || null,
        description: l.description || null,
        debit: debit.toFixed(2),
        credit: credit.toFixed(2),
        runningBalance: running.toFixed(2)
      };
    });

    return NextResponse.json({
      account: accountData,
      items,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
