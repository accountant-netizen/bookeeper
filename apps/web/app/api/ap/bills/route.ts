import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

type BillLineInput = {
  description: string;
  qty: string;
  unitCost: string;
};

type CreateBillRequest = {
  companyId: string;
  branchId?: string;
  supplierId: string;
  billNo: string;
  billDate: string;
  dueDate?: string;
  expenseAccountId: string;
  apAccountId: string;
  lines: BillLineInput[];
  withholdingTaxAmount?: string;
};

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
      .from("vendor_bills")
      .select("id, bill_no, bill_date, due_date, status, subtotal, withholding_tax_amount, total_amount, supplier_id, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data ?? [] });
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

    const body = (await request.json()) as CreateBillRequest;
    if (
      !body.companyId ||
      !body.supplierId ||
      !body.billNo ||
      !body.billDate ||
      !body.expenseAccountId ||
      !body.apAccountId ||
      !body.lines?.length
    ) {
      return NextResponse.json(
        {
          error:
            "companyId, supplierId, billNo, billDate, expenseAccountId, apAccountId, and lines are required"
        },
        { status: 400 }
      );
    }

    if (body.companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    const parsedLines = body.lines.map((line) => {
      const qty = Number.parseFloat(line.qty || "0");
      const unitCost = Number.parseFloat(line.unitCost || "0");
      const lineAmount = qty * unitCost;
      return {
        description: line.description.trim(),
        qty,
        unitCost,
        lineAmount
      };
    });

    const invalidLine = parsedLines.find(
      (line) => !line.description || line.qty <= 0 || line.unitCost < 0
    );
    if (invalidLine) {
      return NextResponse.json(
        { error: "Each line requires description, qty > 0, and unitCost >= 0" },
        { status: 400 }
      );
    }

    const subtotal = Number.parseFloat(
      parsedLines.reduce((sum, line) => sum + line.lineAmount, 0).toFixed(2)
    );
    const withholdingTaxAmount = Number.parseFloat(body.withholdingTaxAmount || "0");
    if (Number.isNaN(withholdingTaxAmount) || withholdingTaxAmount < 0) {
      return NextResponse.json(
        { error: "withholdingTaxAmount must be a non-negative number" },
        { status: 400 }
      );
    }
    const totalAmount = Number.parseFloat((subtotal - withholdingTaxAmount).toFixed(2));

    if (totalAmount < 0) {
      return NextResponse.json(
        { error: "totalAmount cannot be negative after withholding tax" },
        { status: 400 }
      );
    }

    const { data: bill, error: billError } = await supabase
      .from("vendor_bills")
      .insert({
        company_id: body.companyId,
        branch_id: body.branchId || null,
        supplier_id: body.supplierId,
        bill_no: body.billNo.trim(),
        bill_date: body.billDate,
        due_date: body.dueDate || null,
        status: "draft",
        subtotal,
        withholding_tax_amount: withholdingTaxAmount,
        total_amount: totalAmount,
        created_by: user.id
      })
      .select("id")
      .single();

    if (billError || !bill) {
      return NextResponse.json(
        { error: billError?.message || "Failed to create bill" },
        { status: 500 }
      );
    }

    const { error: lineError } = await supabase.from("vendor_bill_lines").insert(
      parsedLines.map((line) => ({
        bill_id: bill.id,
        company_id: body.companyId,
        description: line.description,
        qty: line.qty,
        unit_cost: line.unitCost,
        line_amount: line.lineAmount
      }))
    );

    if (lineError) {
      await supabase.from("vendor_bills").delete().eq("id", bill.id);
      return NextResponse.json({ error: lineError.message }, { status: 500 });
    }

    const { data: journalEntry, error: jeError } = await supabase
      .from("journal_entries")
      .insert({
        company_id: body.companyId,
        branch_id: body.branchId || null,
        reference_no: body.billNo.trim(),
        entry_date: body.billDate,
        status: "draft",
        created_by: user.id
      })
      .select("id")
      .single();

    if (jeError || !journalEntry) {
      return NextResponse.json(
        { error: jeError?.message || "Failed to create journal entry" },
        { status: 500 }
      );
    }

    const { error: jeLinesError } = await supabase.from("journal_lines").insert([
      {
        journal_entry_id: journalEntry.id,
        company_id: body.companyId,
        account_id: body.expenseAccountId,
        description: `Bill ${body.billNo} expense`,
        debit: subtotal,
        credit: 0
      },
      {
        journal_entry_id: journalEntry.id,
        company_id: body.companyId,
        account_id: body.apAccountId,
        description: `Bill ${body.billNo} payable`,
        debit: 0,
        credit: totalAmount
      }
    ]);

    if (jeLinesError) {
      return NextResponse.json({ error: jeLinesError.message }, { status: 500 });
    }

    const { error: postError } = await supabase
      .from("journal_entries")
      .update({ status: "posted" })
      .eq("id", journalEntry.id);

    if (postError) {
      return NextResponse.json({ error: postError.message }, { status: 400 });
    }

    const { error: billUpdateError } = await supabase
      .from("vendor_bills")
      .update({ status: "posted", journal_entry_id: journalEntry.id })
      .eq("id", bill.id);

    if (billUpdateError) {
      return NextResponse.json({ error: billUpdateError.message }, { status: 500 });
    }

    await supabase.from("audit_logs").insert({
      company_id: user.companyId,
      actor_user_id: user.id,
      action: "vendor_bill_posted",
      entity_name: "vendor_bills",
      entity_id: bill.id,
      payload: { billNo: body.billNo, totalAmount }
    });

    return NextResponse.json(
      {
        success: true,
        billId: bill.id,
        journalEntryId: journalEntry.id,
        totalAmount: totalAmount.toFixed(2)
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
