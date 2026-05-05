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

    // Fetch accounts for company to identify cash/accounts named like bank/cash
    const { data: accounts, error: accountsError } = await supabase
      .from("accounts")
      .select("id, code, name, account_type")
      .eq("company_id", companyId);

    if (accountsError) return NextResponse.json({ error: accountsError.message }, { status: 500 });

    const cashCandidates = (accounts || []).filter((a: any) => {
      const name = (a.name || "").toLowerCase();
      const code = (a.code || "").toLowerCase();
      return /cash|bank/.test(name) || /cash|bank/.test(code);
    });

    const cashAccounts = cashCandidates.length > 0
      ? cashCandidates
      : (accounts || []).filter((a: any) => (a.account_type || "").toLowerCase() === "asset");

    const cashAccountIds = (cashAccounts || []).map((c: any) => c.id);

    // Helper to sum lines up to a cutoff date
    async function sumLinesUpTo(cutoffIso: string) {
      if (!cashAccountIds.length) return 0;
      const { data, error } = await supabase
        .from("journal_lines")
        .select("debit, credit")
        .eq("company_id", companyId)
        .in("account_id", cashAccountIds)
        .lte("created_at", `${cutoffIso}T23:59:59Z`);
      if (error) throw new Error(error.message);
      return (data || []).reduce((s: number, r: any) => s + (Number(r.debit || 0) - Number(r.credit || 0)), 0);
    }

    // Helper to sum inflows/outflows within period for cash accounts
    async function sumInPeriod(startIso: string, endIso: string) {
      if (!cashAccountIds.length) return { inflows: 0, outflows: 0 };
      const { data, error } = await supabase
        .from("journal_lines")
        .select("debit, credit")
        .eq("company_id", companyId)
        .in("account_id", cashAccountIds)
        .gte("created_at", `${startIso}T00:00:00Z`)
        .lte("created_at", `${endIso}T23:59:59Z`);
      if (error) throw new Error(error.message);
      const inflows = (data || []).reduce((s: number, r: any) => s + Number(r.debit || 0), 0);
      const outflows = (data || []).reduce((s: number, r: any) => s + Number(r.credit || 0), 0);
      return { inflows, outflows };
    }

    const opening = await sumLinesUpTo(
      new Date(new Date(startDate).getTime() - 86400000).toISOString().slice(0, 10)
    );
    const closing = await sumLinesUpTo(endDate);
    const { inflows, outflows } = await sumInPeriod(startDate, endDate);

    return NextResponse.json({
      companyId,
      branchId: branchId || null,
      startDate,
      endDate,
      generatedAt: new Date().toISOString(),
      cashAccounts: cashAccounts.map((c: any) => ({ accountId: c.id, code: c.code, name: c.name })),
      opening: opening.toFixed(2),
      inflows: inflows.toFixed(2),
      outflows: outflows.toFixed(2),
      netChange: (closing - opening).toFixed(2),
      closing: closing.toFixed(2)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
