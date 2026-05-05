import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuthUser, requireAuthUser } from "@/lib/auth";

async function fetchTaxSummary(supabase: ReturnType<typeof createServerClient>, companyId: string, startDate: string, endDate: string, branchId?: string | null) {
  let salesQuery = supabase
    .from("sales_invoices")
    .select("tax_amount")
    .eq("company_id", companyId)
    .eq("status", "posted")
    .gte("invoice_date", startDate)
    .lte("invoice_date", endDate);

  let billsQuery = supabase
    .from("vendor_bills")
    .select("withholding_tax_amount")
    .eq("company_id", companyId)
    .eq("status", "posted")
    .gte("bill_date", startDate)
    .lte("bill_date", endDate);

  if (branchId) {
    salesQuery = salesQuery.eq("branch_id", branchId);
    billsQuery = billsQuery.eq("branch_id", branchId);
  }

  const [{ data: sales, error: salesError }, { data: bills, error: billsError }] = await Promise.all([
    salesQuery,
    billsQuery
  ]);

  if (salesError) throw new Error(salesError.message);
  if (billsError) throw new Error(billsError.message);

  const outputTax = (sales || []).reduce((sum, row: any) => sum + Number(row.tax_amount || 0), 0);
  const withholdingTax = (bills || []).reduce((sum, row: any) => sum + Number(row.withholding_tax_amount || 0), 0);

  return {
    exportType: "bir-summary",
    periodStart: startDate,
    periodEnd: endDate,
    outputTax: outputTax.toFixed(2),
    withholdingTax: withholdingTax.toFixed(2),
    netTaxDue: (outputTax - withholdingTax).toFixed(2)
  };
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const companyId = request.nextUrl.searchParams.get("companyId") || user.companyId;
    const branchId = request.nextUrl.searchParams.get("branchId");
    const startDate = request.nextUrl.searchParams.get("startDate");
    const endDate = request.nextUrl.searchParams.get("endDate");
    const format = (request.nextUrl.searchParams.get("format") || "json").toLowerCase();

    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }
    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
    }

    const summary = await fetchTaxSummary(supabase, companyId, startDate, endDate, branchId);

    if (format === "csv") {
      const csv = [
        "metric,value",
        `output_tax,${summary.outputTax}`,
        `withholding_tax,${summary.withholdingTax}`,
        `net_tax_due,${summary.netTaxDue}`
      ].join("\n");
      return new NextResponse(csv, {
        status: 200,
        headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename=bir-summary-${startDate}-${endDate}.csv` }
      });
    }

    return NextResponse.json({ companyId, branchId: branchId || null, generatedAt: new Date().toISOString(), ...summary });
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
    const { companyId, startDate, endDate, exportType } = body;

    if (!companyId || !startDate || !endDate) {
      return NextResponse.json({ error: "companyId, startDate, and endDate are required" }, { status: 400 });
    }
    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    const summary = await fetchTaxSummary(supabase, companyId, startDate, endDate, body.branchId || null);
    const { data, error } = await supabase
      .from("tax_exports")
      .insert({
        company_id: companyId,
        export_type: exportType || "bir-summary",
        period_start: startDate,
        period_end: endDate,
        payload: summary,
        created_by: user.id
      })
      .select("id, export_type, period_start, period_end, payload, created_at")
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
