import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuthUser, requireAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const companyId = request.nextUrl.searchParams.get("companyId") || user.companyId;
    const employeeId = request.nextUrl.searchParams.get("employeeId");
    const startDate = request.nextUrl.searchParams.get("startDate");
    const endDate = request.nextUrl.searchParams.get("endDate");

    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    let query = supabase
      .from("payslips")
      .select("id, employee_id, pay_period_start, pay_period_end, pay_date, gross_pay, deductions, tax_withheld, net_pay, status, notes, created_at")
      .eq("company_id", companyId)
      .order("pay_date", { ascending: false });

    if (employeeId) query = query.eq("employee_id", employeeId);
    if (startDate) query = query.gte("pay_date", startDate);
    if (endDate) query = query.lte("pay_date", endDate);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
    const { companyId, employeeId, payPeriodStart, payPeriodEnd, payDate } = body;

    if (!companyId || !employeeId || !payPeriodStart || !payPeriodEnd || !payDate) {
      return NextResponse.json(
        { error: "companyId, employeeId, payPeriodStart, payPeriodEnd, and payDate are required" },
        { status: 400 }
      );
    }

    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    const grossPay = Number(body.grossPay || 0);
    const deductions = Number(body.deductions || 0);
    const taxWithheld = Number(body.taxWithheld || 0);
    const netPay = body.netPay !== undefined ? Number(body.netPay) : grossPay - deductions - taxWithheld;

    const { data, error } = await supabase
      .from("payslips")
      .insert({
        company_id: companyId,
        branch_id: body.branchId || null,
        employee_id: employeeId,
        pay_period_start: payPeriodStart,
        pay_period_end: payPeriodEnd,
        pay_date: payDate,
        gross_pay: grossPay,
        deductions,
        tax_withheld: taxWithheld,
        net_pay: netPay,
        status: body.status || "draft",
        notes: body.notes || null,
        created_by: user.id
      })
      .select("id, employee_id, pay_period_start, pay_period_end, pay_date, gross_pay, deductions, tax_withheld, net_pay, status, notes, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
