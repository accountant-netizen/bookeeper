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
      .from("bank_accounts")
      .select("id, code, name, bank_name, account_number, currency_code, opening_balance, current_balance, ledger_account_id, is_active, created_at")
      .eq("company_id", companyId)
      .order("code", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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
    const { companyId, code, name } = body;

    if (!companyId || !code || !name) {
      return NextResponse.json({ error: "companyId, code, and name are required" }, { status: 400 });
    }

    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    const openingBalance = Number(body.openingBalance || 0);
    const { data, error } = await supabase
      .from("bank_accounts")
      .insert({
        company_id: companyId,
        branch_id: body.branchId || null,
        ledger_account_id: body.ledgerAccountId || null,
        code: code.trim(),
        name: name.trim(),
        bank_name: body.bankName || null,
        account_number: body.accountNumber || null,
        currency_code: body.currencyCode || "PHP",
        opening_balance: openingBalance,
        current_balance: openingBalance,
        is_active: body.isActive ?? true,
        created_by: user.id
      })
      .select("id, code, name, bank_name, account_number, currency_code, opening_balance, current_balance, ledger_account_id, is_active, created_at")
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
