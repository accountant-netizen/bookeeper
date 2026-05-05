import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

type ApAgingBucketTotals = {
  current: string;
  bucket_1_30: string;
  bucket_31_60: string;
  bucket_61_90: string;
  bucket_90_plus: string;
  total_open: string;
};

type ApAgingItem = {
  billId: string;
  billNo: string;
  supplierId: string;
  billDate: string;
  dueDate: string | null;
  amount: string;
  originalAmount: string;
  settledAmount: string;
  daysOverdue: number;
  bucket: "current" | "1-30" | "31-60" | "61-90" | "90+";
};

function startOfTodayUtc() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function getDaysOverdue(dueDate: string | null, billDate: string) {
  const baseDate = dueDate || billDate;
  const d = new Date(baseDate);
  if (Number.isNaN(d.getTime())) {
    return 0;
  }

  const dueUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((startOfTodayUtc() - dueUtc) / (1000 * 60 * 60 * 24));
}

function getBucket(daysOverdue: number): "current" | "1-30" | "31-60" | "61-90" | "90+" {
  if (daysOverdue <= 0) {
    return "current";
  }
  if (daysOverdue <= 30) {
    return "1-30";
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
      .from("vendor_bills")
      .select("id, bill_no, supplier_id, bill_date, due_date, total_amount, status")
      .eq("company_id", companyId)
      .eq("status", "posted");

    if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    const { data, error } = await query.order("bill_date", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const billRows = data || [];
    const billIds = billRows.map((row: any) => row.id);

    const settledByBill = new Map<string, number>();

    if (billIds.length > 0) {
      let paymentsQuery = supabase
        .from("payment_vouchers")
        .select("bill_id, amount")
        .eq("company_id", companyId)
        .eq("status", "posted")
        .in("bill_id", billIds);

      if (branchId) {
        paymentsQuery = paymentsQuery.eq("branch_id", branchId);
      }

      const { data: payments, error: paymentsError } = await paymentsQuery;
      if (paymentsError) {
        return NextResponse.json({ error: paymentsError.message }, { status: 500 });
      }

      for (const payment of payments || []) {
        const billId = (payment as any).bill_id as string | null;
        if (!billId) {
          continue;
        }
        const amount = Number.parseFloat((payment as any).amount || "0");
        const prev = settledByBill.get(billId) || 0;
        settledByBill.set(billId, prev + amount);
      }
    }

    const totals = {
      current: 0,
      bucket_1_30: 0,
      bucket_31_60: 0,
      bucket_61_90: 0,
      bucket_90_plus: 0,
      total_open: 0
    };

    const items: ApAgingItem[] = billRows
      .map((row: any) => {
      const originalAmount = Number.parseFloat(row.total_amount || "0");
      const settledAmount = settledByBill.get(row.id) || 0;
      const openAmount = Math.max(originalAmount - settledAmount, 0);
      const daysOverdue = getDaysOverdue(row.due_date, row.bill_date);
      const bucket = getBucket(daysOverdue);

      totals.total_open += openAmount;
      if (bucket === "current") {
        totals.current += openAmount;
      } else if (bucket === "1-30") {
        totals.bucket_1_30 += openAmount;
      } else if (bucket === "31-60") {
        totals.bucket_31_60 += openAmount;
      } else if (bucket === "61-90") {
        totals.bucket_61_90 += openAmount;
      } else {
        totals.bucket_90_plus += openAmount;
      }

      return {
        billId: row.id,
        billNo: row.bill_no,
        supplierId: row.supplier_id,
        billDate: row.bill_date,
        dueDate: row.due_date,
        amount: openAmount.toFixed(2),
        originalAmount: originalAmount.toFixed(2),
        settledAmount: settledAmount.toFixed(2),
        daysOverdue: Math.max(daysOverdue, 0),
        bucket
      };
    })
      .filter((item) => Number.parseFloat(item.amount) > 0);

    const bucketTotals: ApAgingBucketTotals = {
      current: totals.current.toFixed(2),
      bucket_1_30: totals.bucket_1_30.toFixed(2),
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
