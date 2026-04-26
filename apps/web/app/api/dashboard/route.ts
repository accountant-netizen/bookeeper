import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import type { DashboardMetrics } from "@accountant/shared-types";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const authUser = await getAuthUser(authHeader);
    const user = requireAuthUser(authUser);

    const supabase = createServerClient();

    // Get today's date
    const today = new Date().toISOString().split("T")[0];
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split("T")[0];

    const yearStart = new Date();
    yearStart.setMonth(0, 1);
    const yearStartStr = yearStart.toISOString().split("T")[0];

    // Query sales (AR) for today, month, year
    // Sales are CR to Sales account; we sum credit amounts for today
    const salesTodayData = await supabase
      .from("journal_lines")
      .select("credit")
      .eq("company_id", user.companyId)
      .gte("created_at", `${today}T00:00:00Z`)
      .lt("created_at", `${today}T23:59:59Z`);

    const salesMonthData = await supabase
      .from("journal_lines")
      .select("credit")
      .eq("company_id", user.companyId)
      .gte("created_at", `${monthStartStr}T00:00:00Z`);

    const salesYearData = await supabase
      .from("journal_lines")
      .select("credit")
      .eq("company_id", user.companyId)
      .gte("created_at", `${yearStartStr}T00:00:00Z`);

    const totalSalesToday = (salesTodayData.data || [])
      .reduce((sum: number, row: any) => sum + (parseFloat(row.credit) || 0), 0)
      .toFixed(2);

    const totalSalesMonth = (salesMonthData.data || [])
      .reduce((sum: number, row: any) => sum + (parseFloat(row.credit) || 0), 0)
      .toFixed(2);

    const totalSalesYear = (salesYearData.data || [])
      .reduce((sum: number, row: any) => sum + (parseFloat(row.credit) || 0), 0)
      .toFixed(2);

    // Query expenses (AP/Expense) - DR side
    const expensesTodayData = await supabase
      .from("journal_lines")
      .select("debit")
      .eq("company_id", user.companyId)
      .gte("created_at", `${today}T00:00:00Z`)
      .lt("created_at", `${today}T23:59:59Z`);

    const totalExpensesToday = (expensesTodayData.data || [])
      .reduce((sum: number, row: any) => sum + (parseFloat(row.debit) || 0), 0)
      .toFixed(2);

    // Net profit for month = sales - expenses
    const expensesMonthData = await supabase
      .from("journal_lines")
      .select("debit")
      .eq("company_id", user.companyId)
      .gte("created_at", `${monthStartStr}T00:00:00Z`);

    const totalExpensesMonth = (expensesMonthData.data || [])
      .reduce((sum: number, row: any) => sum + (parseFloat(row.debit) || 0), 0)
      .toFixed(2);

    const netProfitMonth = (
      parseFloat(totalSalesMonth) - parseFloat(totalExpensesMonth)
    ).toFixed(2);

    // Cash balance (sum of all cash/bank account balances)
    // For now, simplified as all debit postings (inflows) minus credit postings (outflows) for cash accounts
    const cashData = await supabase
      .from("journal_lines")
      .select("debit, credit")
      .eq("company_id", user.companyId);

    const cashBalance = (
      (cashData.data || []).reduce((sum: number, row: any) => {
        return sum + (parseFloat(row.debit) || 0) - (parseFloat(row.credit) || 0);
      }, 0)
    ).toFixed(2);

    const metrics: DashboardMetrics = {
      companyId: user.companyId,
      totalSalesToday,
      totalSalesMonth,
      totalSalesYear,
      totalExpensesToday,
      netProfitMonth,
      cashBalance,
      currencyCode: "PHP"
    };

    return NextResponse.json(metrics);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
