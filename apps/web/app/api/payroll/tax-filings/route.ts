import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuthUser, requireAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const companyId = request.nextUrl.searchParams.get("companyId") || user.companyId;
    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("payroll_tax_filings")
      .select("id, filing_type, period_start, period_end, employee_count, gross_pay, tax_withheld, payload, status, created_at")
      .eq("company_id", companyId)
      .order("period_end", { ascending: false });

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
    const { companyId, filingType, periodStart, periodEnd } = body;

    if (!companyId || !filingType || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: "companyId, filingType, periodStart, and periodEnd are required" },
        { status: 400 }
      );
    }
    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    const { data: payslips, error: payslipsError } = await supabase
      .from("payslips")
      .select("employee_id, gross_pay, tax_withheld")
      .eq("company_id", companyId)
      .gte("pay_date", periodStart)
      .lte("pay_date", periodEnd)
      .in("status", ["posted", "paid"]);

    if (payslipsError) {
      return NextResponse.json({ error: payslipsError.message }, { status: 500 });
    }

    const employeeIds = new Set((payslips || []).map((row: any) => row.employee_id));
    const grossPay = (payslips || []).reduce((sum: number, row: any) => sum + Number(row.gross_pay || 0), 0);
    const taxWithheld = (payslips || []).reduce((sum: number, row: any) => sum + Number(row.tax_withheld || 0), 0);
    const payload = {
      filingType,
      periodStart,
      periodEnd,
      employeeCount: employeeIds.size,
      grossPay: grossPay.toFixed(2),
      taxWithheld: taxWithheld.toFixed(2)
    };

    const { data, error } = await supabase
      .from("payroll_tax_filings")
      .insert({
        company_id: companyId,
        filing_type: filingType,
        period_start: periodStart,
        period_end: periodEnd,
        employee_count: employeeIds.size,
        gross_pay: grossPay,
        tax_withheld: taxWithheld,
        payload,
        status: body.status || "draft",
        created_by: user.id
      })
      .select("id, filing_type, period_start, period_end, employee_count, gross_pay, tax_withheld, payload, status, created_at")
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
