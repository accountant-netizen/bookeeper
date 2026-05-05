import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuthUser, requireAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const companyId = request.nextUrl.searchParams.get("companyId") || user.companyId;
    const bankAccountId = request.nextUrl.searchParams.get("bankAccountId");
    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    let query = supabase
      .from("checks")
      .select("id, bank_account_id, check_no, payee, amount, issue_date, cleared_at, status, notes, created_at")
      .eq("company_id", companyId)
      .order("issue_date", { ascending: false });

    if (bankAccountId) {
      query = query.eq("bank_account_id", bankAccountId);
    }

    const { data, error } = await query;
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
    const { companyId, bankAccountId, checkNo, payee, amount, issueDate } = body;

    if (!companyId || !bankAccountId || !checkNo || !payee || amount === undefined || !issueDate) {
      return NextResponse.json(
        { error: "companyId, bankAccountId, checkNo, payee, amount, and issueDate are required" },
        { status: 400 }
      );
    }

    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("checks")
      .insert({
        company_id: companyId,
        bank_account_id: bankAccountId,
        check_no: checkNo.trim(),
        payee: payee.trim(),
        amount: Number(amount),
        issue_date: issueDate,
        cleared_at: body.clearedAt || null,
        status: body.status || "issued",
        notes: body.notes || null,
        created_by: user.id
      })
      .select("id, bank_account_id, check_no, payee, amount, issue_date, cleared_at, status, notes, created_at")
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
