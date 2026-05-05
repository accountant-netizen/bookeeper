import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

type ArAgingBucketTotals = {
  bucket_0_30: string;
  bucket_31_60: string;
  bucket_61_90: string;
  bucket_90_plus: string;
  total_open: string;
};

type ArAgingItem = {
  invoiceId: string;
  invoiceNo: string;
  customerId: string;
  invoiceDate: string;
  dueDate: string | null;
  amount: string;
  originalAmount: string;
  settledAmount: string;
  daysOverdue: number;
  bucket: "0-30" | "31-60" | "61-90" | "90+";
};

function startOfTodayUtc() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function getDaysOverdue(dueDate: string | null, invoiceDate: string) {
  const baseDate = dueDate || invoiceDate;
  const d = new Date(baseDate);
  if (Number.isNaN(d.getTime())) {
    return 0;
  }

  const dueUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const diffDays = Math.floor((startOfTodayUtc() - dueUtc) / (1000 * 60 * 60 * 24));
  return Math.max(diffDays, 0);
}

function getBucket(daysOverdue: number): "0-30" | "31-60" | "61-90" | "90+" {
  if (daysOverdue <= 30) {
    return "0-30";
  }
  if (daysOverdue <= 60) {
    return "31-60";
  }
  if (daysOverdue <= 90) {
    return "61-90";
  }
  return "90+";
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const companyId = request.nextUrl.searchParams.get("companyId") || user.companyId;
    const branchId = request.nextUrl.searchParams.get("branchId");

    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    let query = supabase
      .from("sales_invoices")
      .select("id, invoice_no, customer_id, invoice_date, due_date, total_amount, status")
      .eq("company_id", companyId)
      .eq("status", "posted");

    if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    const { data, error } = await query.order("invoice_date", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const invoiceRows = data || [];
    const invoiceIds = invoiceRows.map((row: any) => row.id);

    const settledByInvoice = new Map<string, number>();

    if (invoiceIds.length > 0) {
      let postedReceiptsQuery = supabase
        .from("receipts")
        .select("id")
        .eq("company_id", companyId)
        .eq("status", "posted");

      if (branchId) {
        postedReceiptsQuery = postedReceiptsQuery.eq("branch_id", branchId);
      }

      const { data: postedReceipts, error: postedReceiptsError } =
        await postedReceiptsQuery;

      if (postedReceiptsError) {
        return NextResponse.json({ error: postedReceiptsError.message }, { status: 500 });
      }

      const postedReceiptIds = new Set((postedReceipts || []).map((r: any) => r.id));

      if (postedReceiptIds.size > 0) {
        const { data: allocations, error: allocationsError } = await supabase
          .from("receipt_allocations")
          .select("invoice_id, receipt_id, amount")
          .eq("company_id", companyId)
          .in("invoice_id", invoiceIds);

        if (allocationsError) {
          return NextResponse.json({ error: allocationsError.message }, { status: 500 });
        }

        for (const allocation of allocations || []) {
          if (!postedReceiptIds.has((allocation as any).receipt_id)) {
            continue;
          }
          const invoiceId = (allocation as any).invoice_id as string;
          const amount = Number.parseFloat((allocation as any).amount || "0");
          const prev = settledByInvoice.get(invoiceId) || 0;
          settledByInvoice.set(invoiceId, prev + amount);
        }
      }
    }

    const totals = {
      bucket_0_30: 0,
      bucket_31_60: 0,
      bucket_61_90: 0,
      bucket_90_plus: 0,
      total_open: 0
    };

    const items: ArAgingItem[] = invoiceRows
      .map((row: any) => {
      const originalAmount = Number.parseFloat(row.total_amount || "0");
      const settledAmount = settledByInvoice.get(row.id) || 0;
      const openAmount = Math.max(originalAmount - settledAmount, 0);
      const daysOverdue = getDaysOverdue(row.due_date, row.invoice_date);
      const bucket = getBucket(daysOverdue);

      totals.total_open += openAmount;
      if (bucket === "0-30") {
        totals.bucket_0_30 += openAmount;
      } else if (bucket === "31-60") {
        totals.bucket_31_60 += openAmount;
      } else if (bucket === "61-90") {
        totals.bucket_61_90 += openAmount;
      } else {
        totals.bucket_90_plus += openAmount;
      }

      return {
        invoiceId: row.id,
        invoiceNo: row.invoice_no,
        customerId: row.customer_id,
        invoiceDate: row.invoice_date,
        dueDate: row.due_date,
        amount: openAmount.toFixed(2),
        originalAmount: originalAmount.toFixed(2),
        settledAmount: settledAmount.toFixed(2),
        daysOverdue,
        bucket
      };
    })
      .filter((item: ArAgingItem) => Number.parseFloat(item.amount) > 0);

    const bucketTotals: ArAgingBucketTotals = {
      bucket_0_30: totals.bucket_0_30.toFixed(2),
      bucket_31_60: totals.bucket_31_60.toFixed(2),
      bucket_61_90: totals.bucket_61_90.toFixed(2),
      bucket_90_plus: totals.bucket_90_plus.toFixed(2),
      total_open: totals.total_open.toFixed(2)
    };

    return NextResponse.json({
      companyId,
      branchId: branchId || null,
      generatedAt: new Date().toISOString(),
      bucketTotals,
      items
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
