import { NextResponse } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { generateTaxFiling, validateFilingData } from "@/lib/taxFilingGenerator";

// POST /api/payroll/tax-filings/generate -> generate tax filing from payslips
export async function POST(req: Request) {
  try {
    const authHeader = (req as any).headers?.get?.("authorization");
    const authUser = await getAuthUser(authHeader);
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const body = await req.json();
    const { filingType, jurisdiction, periodStart, periodEnd } = body;

    if (!jurisdiction || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: "Missing jurisdiction, periodStart, or periodEnd" },
        { status: 400 }
      );
    }

    // Parse dates
    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    // Fetch payslips for the period
    const { data: payslips, error: payslipsErr } = await supabase
      .from("payslips")
      .select("id, employee_id, gross_pay, tax_withheld, deductions")
      .eq("company_id", user.companyId)
      .gte("pay_period_start", start.toISOString())
      .lte("pay_period_end", end.toISOString());

    if (payslipsErr) throw new Error(payslipsErr.message);

    // Fetch employee details
    const { data: employees, error: employeesErr } = await supabase
      .from("employees")
      .select("id, employee_no, first_name, last_name")
      .eq("company_id", user.companyId);

    if (employeesErr) throw new Error(employeesErr.message);

    // Build employee map for quick lookup
    const employeeMap = new Map(employees?.map((e: any) => [e.id, e]) || []);

    // Aggregate payslip data by employee
    const aggregated = new Map();
    let totalGross = 0;
    let totalTax = 0;
    let totalDeductions = 0;

    (payslips || []).forEach((slip: any) => {
      const emp = employeeMap.get(slip.employee_id);
      if (!emp) return;

      const key = slip.employee_id;
      if (!aggregated.has(key)) {
        aggregated.set(key, {
          employeeNo: emp.employee_no,
          firstName: emp.first_name,
          lastName: emp.last_name,
          grossPay: 0,
          taxWithheld: 0,
          deductions: 0,
        });
      }

      const agg = aggregated.get(key);
      agg.grossPay += slip.gross_pay || 0;
      agg.taxWithheld += slip.tax_withheld || 0;
      agg.deductions += slip.deductions || 0;

      totalGross += slip.gross_pay || 0;
      totalTax += slip.tax_withheld || 0;
      totalDeductions += slip.deductions || 0;
    });

    const filingData = {
      companyId: user.companyId,
      filingType: filingType || "monthly",
      jurisdiction,
      periodStart: start,
      periodEnd: end,
      employeeCount: aggregated.size,
      grossPay: totalGross,
      taxWithheld: totalTax,
      employees: Array.from(aggregated.values()),
    };

    // Validate filing data
    const validation = validateFilingData(filingData);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join("; ") }, { status: 400 });
    }

    // Generate filing
    const filing = await generateTaxFiling(filingData);
    if (!filing.success) {
      return NextResponse.json({ error: "Failed to generate tax filing" }, { status: 500 });
    }

    // Store filing record in database
    const { data: record, error: saveErr } = await supabase
      .from("payroll_tax_filings")
      .insert({
        company_id: user.companyId,
        filing_type: filingType || "monthly",
        period_start: start,
        period_end: end,
        employee_count: aggregated.size,
        gross_pay: totalGross,
        tax_withheld: totalTax,
        payload: {
          format: filing.format,
          generatedAt: new Date().toISOString(),
          content: filing.content,
          employees: Array.from(aggregated.values()),
        },
        status: "draft",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (saveErr) throw new Error(saveErr.message);

    return NextResponse.json({
      filingId: record.id,
      format: filing.format,
      filename: filing.filename,
      content: filing.content,
      preview: filing.content.split("\n").slice(0, 20).join("\n") + "\n...",
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
