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
      .from("employees")
      .select("id, employee_no, first_name, last_name, email, phone, department, job_title, hire_date, base_salary, pay_frequency, is_active, created_at")
      .eq("company_id", companyId)
      .order("employee_no", { ascending: true });

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
    const { companyId, employeeNo, firstName, lastName } = body;

    if (!companyId || !employeeNo || !firstName || !lastName) {
      return NextResponse.json({ error: "companyId, employeeNo, firstName, and lastName are required" }, { status: 400 });
    }

    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("employees")
      .insert({
        company_id: companyId,
        branch_id: body.branchId || null,
        employee_no: employeeNo.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        department: body.department?.trim() || null,
        job_title: body.jobTitle?.trim() || null,
        hire_date: body.hireDate || null,
        base_salary: Number(body.baseSalary || 0),
        pay_frequency: body.payFrequency || "monthly",
        is_active: body.isActive ?? true
      })
      .select("id, employee_no, first_name, last_name, email, phone, department, job_title, hire_date, base_salary, pay_frequency, is_active, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
