import { NextResponse } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { generateTaxFiling, validateFilingData } from "@/lib/taxFilingGenerator";

// GET /api/payroll/tax-filings/[id]/export -> export filing in jurisdiction format
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const authHeader = (req as any).headers?.get?.("authorization");
    const authUser = await getAuthUser(authHeader);
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    // Fetch filing record
    const { data: filing, error: filingErr } = await supabase
      .from("payroll_tax_filings")
      .select("id, filing_type, period_start, period_end, employee_count, gross_pay, tax_withheld, payload")
      .eq("id", params.id)
      .eq("company_id", user.companyId)
      .single();

    if (filingErr || !filing) {
      return NextResponse.json({ error: "Filing not found" }, { status: 404 });
    }

    // Infer jurisdiction from request parameter or payload
    const { searchParams } = new URL(req.url);
    const jurisdiction = searchParams.get("jurisdiction") || filing.payload?.jurisdiction || "PH";

    // Fetch payslip details for employee info
    const { data: payslips, error: payslipsErr } = await supabase
      .from("payslips")
      .select("employee_id, gross_pay, tax_withheld, deductions")
      .eq("company_id", user.companyId)
      .gte("pay_period_start", filing.period_start)
      .lte("pay_period_end", filing.period_end);

    if (payslipsErr) throw new Error(payslipsErr.message);

    // Fetch employee details
    const { data: employees, error: employeesErr } = await supabase
      .from("employees")
      .select("id, employee_no, first_name, last_name")
      .eq("company_id", user.companyId);

    if (employeesErr) throw new Error(employeesErr.message);

    // Build employee map
    const employeeMap = new Map(employees?.map((e: any) => [e.id, e]) || []);

    // Aggregate payslip data
    const aggregated = new Map();
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
    });

    const filingData = {
      companyId: user.companyId,
      filingType: filing.filing_type,
      jurisdiction,
      periodStart: new Date(filing.period_start),
      periodEnd: new Date(filing.period_end),
      employeeCount: filing.employee_count,
      grossPay: filing.gross_pay,
      taxWithheld: filing.tax_withheld,
      employees: Array.from(aggregated.values()),
    };

    // Generate filing
    const result = await generateTaxFiling(filingData);
    if (!result.success) {
      return NextResponse.json({ error: "Failed to generate tax filing" }, { status: 500 });
    }

    // Return file download
    return new NextResponse(result.content, {
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
