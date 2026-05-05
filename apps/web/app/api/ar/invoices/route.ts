import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

type InvoiceLineInput = {
  description: string;
  qty: string;
  unitPrice: string;
};

type CreateInvoiceRequest = {
  companyId: string;
  branchId?: string;
  customerId: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate?: string;
  arAccountId: string;
  salesAccountId: string;
  lines: InvoiceLineInput[];
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
      .from("sales_invoices")
      .select("id, invoice_no, invoice_date, due_date, status, subtotal, tax_amount, total_amount, customer_id, created_at")
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

    const body = (await request.json()) as CreateInvoiceRequest;
    if (
      !body.companyId ||
      !body.customerId ||
      !body.invoiceNo ||
      !body.invoiceDate ||
      !body.arAccountId ||
      !body.salesAccountId ||
      !body.lines?.length
    ) {
      return NextResponse.json(
        {
          error:
            "companyId, customerId, invoiceNo, invoiceDate, arAccountId, salesAccountId, and lines are required"
        },
        { status: 400 }
      );
    }

    if (body.companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    const parsedLines = body.lines.map((line) => {
      const qty = Number.parseFloat(line.qty || "0");
      const unitPrice = Number.parseFloat(line.unitPrice || "0");
      const lineAmount = qty * unitPrice;
      return {
        description: line.description.trim(),
        qty,
        unitPrice,
        lineAmount
      };
    });

    const invalidLine = parsedLines.find(
      (line) => !line.description || line.qty <= 0 || line.unitPrice < 0
    );
    if (invalidLine) {
      return NextResponse.json(
        { error: "Each line requires description, qty > 0, and unitPrice >= 0" },
        { status: 400 }
      );
    }

    const subtotal = parsedLines.reduce((sum, line) => sum + line.lineAmount, 0);
    const totalAmount = Number.parseFloat(subtotal.toFixed(2));

    const { data: invoice, error: invoiceError } = await supabase
      .from("sales_invoices")
      .insert({
        company_id: body.companyId,
        branch_id: body.branchId || null,
        customer_id: body.customerId,
        invoice_no: body.invoiceNo.trim(),
        invoice_date: body.invoiceDate,
        due_date: body.dueDate || null,
        status: "draft",
        subtotal: totalAmount,
        tax_amount: 0,
        total_amount: totalAmount,
        created_by: user.id
      })
      .select("id")
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: invoiceError?.message || "Failed to create invoice" },
        { status: 500 }
      );
    }

    const { error: lineError } = await supabase.from("sales_invoice_lines").insert(
      parsedLines.map((line) => ({
        invoice_id: invoice.id,
        company_id: body.companyId,
        description: line.description,
        qty: line.qty,
        unit_price: line.unitPrice,
        line_amount: line.lineAmount
      }))
    );

    if (lineError) {
      await supabase.from("sales_invoices").delete().eq("id", invoice.id);
      return NextResponse.json({ error: lineError.message }, { status: 500 });
    }

    const { data: journalEntry, error: jeError } = await supabase
      .from("journal_entries")
      .insert({
        company_id: body.companyId,
        branch_id: body.branchId || null,
        reference_no: body.invoiceNo.trim(),
        entry_date: body.invoiceDate,
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
        account_id: body.arAccountId,
        description: `Invoice ${body.invoiceNo} receivable`,
        debit: totalAmount,
        credit: 0
      },
      {
        journal_entry_id: journalEntry.id,
        company_id: body.companyId,
        account_id: body.salesAccountId,
        description: `Invoice ${body.invoiceNo} sales`,
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

    const { error: invoiceUpdateError } = await supabase
      .from("sales_invoices")
      .update({ status: "posted", journal_entry_id: journalEntry.id })
      .eq("id", invoice.id);

    if (invoiceUpdateError) {
      return NextResponse.json({ error: invoiceUpdateError.message }, { status: 500 });
    }

    await supabase.from("audit_logs").insert({
      company_id: user.companyId,
      actor_user_id: user.id,
      action: "sales_invoice_posted",
      entity_name: "sales_invoices",
      entity_id: invoice.id,
      payload: { invoiceNo: body.invoiceNo, totalAmount }
    });

    return NextResponse.json(
      {
        success: true,
        invoiceId: invoice.id,
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
