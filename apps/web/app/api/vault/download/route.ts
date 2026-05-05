import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuthUser, requireAuthUser } from "@/lib/auth";

function makeCsvFromObject(obj: Record<string, any>) {
  const rows = Object.entries(obj || {}).map(([key, value]) => `${key},${JSON.stringify(value ?? "")}`);
  return ["key,value", ...rows].join("\n");
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const source = request.nextUrl.searchParams.get("source");
    const id = request.nextUrl.searchParams.get("id");
    const format = (request.nextUrl.searchParams.get("format") || "json").toLowerCase();

    if (!source || !id) {
      return NextResponse.json({ error: "source and id are required" }, { status: 400 });
    }

    if (source === "document") {
      const { data: doc, error } = await supabase
        .from("documents")
        .select("id, filename, mime_type, metadata")
        .eq("id", id)
        .eq("company_id", user.companyId)
        .single();

      if (error || !doc) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }

      const base64Content = doc.metadata?.vault_content_base64;
      if (!base64Content || typeof base64Content !== "string") {
        return NextResponse.json(
          { error: "No downloadable content stored for this document." },
          { status: 404 }
        );
      }

      const bytes = Buffer.from(base64Content, "base64");
      return new NextResponse(bytes, {
        status: 200,
        headers: {
          "Content-Type": doc.mime_type || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${doc.filename}"`,
        },
      });
    }

    if (source === "tax_export") {
      const { data: taxExport, error } = await supabase
        .from("tax_exports")
        .select("id, export_type, period_start, period_end, payload")
        .eq("id", id)
        .eq("company_id", user.companyId)
        .single();

      if (error || !taxExport) {
        return NextResponse.json({ error: "Tax export not found" }, { status: 404 });
      }

      if (format === "csv") {
        const csv = makeCsvFromObject(taxExport.payload || {});
        return new NextResponse(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="tax-export-${taxExport.period_start}-${taxExport.period_end}.csv"`,
          },
        });
      }

      return new NextResponse(JSON.stringify(taxExport.payload || {}, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="tax-export-${taxExport.period_start}-${taxExport.period_end}.json"`,
        },
      });
    }

    if (source === "payroll_filing") {
      const { data: filing, error } = await supabase
        .from("payroll_tax_filings")
        .select("id, filing_type, period_start, period_end, employee_count, gross_pay, tax_withheld, payload, status")
        .eq("id", id)
        .eq("company_id", user.companyId)
        .single();

      if (error || !filing) {
        return NextResponse.json({ error: "Payroll filing not found" }, { status: 404 });
      }

      const exportPayload = {
        id: filing.id,
        filingType: filing.filing_type,
        periodStart: filing.period_start,
        periodEnd: filing.period_end,
        employeeCount: filing.employee_count,
        grossPay: filing.gross_pay,
        taxWithheld: filing.tax_withheld,
        status: filing.status,
        payload: filing.payload,
      };

      if (format === "csv") {
        const csv = makeCsvFromObject(exportPayload as Record<string, any>);
        return new NextResponse(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="payroll-filing-${filing.period_start}-${filing.period_end}.csv"`,
          },
        });
      }

      return new NextResponse(JSON.stringify(exportPayload, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="payroll-filing-${filing.period_start}-${filing.period_end}.json"`,
        },
      });
    }

    return NextResponse.json({ error: `Unsupported source: ${source}` }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
