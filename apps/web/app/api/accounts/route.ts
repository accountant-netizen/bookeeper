import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

type CreateAccountRequest = {
  companyId: string;
  code: string;
  name: string;
  accountType?: string;
  isActive?: boolean;
};

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();
    // Try selecting the extended account shape. If the DB schema is older and
    // doesn't have `account_type`/`is_active`, fall back to a minimal select
    // so dropdowns and listings still work.
    let accounts: any[] | null = null;
    try {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, code, name, account_type, is_active")
        .eq("company_id", user.companyId)
        .order("code");

      if (error) throw error;
      accounts = data;
    } catch (err) {
      // If the extended columns are missing, retry with a minimal projection.
      try {
        const { data: data2, error: err2 } = await supabase
          .from("accounts")
          .select("id, code, name")
          .eq("company_id", user.companyId)
          .order("code");

        if (err2) throw err2;
        accounts = data2;
      } catch (errInner) {
        return NextResponse.json({ error: (errInner as Error).message }, { status: 500 });
      }
    }

    return NextResponse.json({ items: accounts });
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const body = (await request.json()) as CreateAccountRequest;
    if (!body.companyId || !body.code || !body.name) {
      return NextResponse.json(
        { error: "Company ID, code, and name are required" },
        { status: 400 }
      );
    }

    if (body.companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("accounts")
      .insert([
        {
          company_id: body.companyId,
          code: body.code,
          name: body.name,
          account_type: body.accountType || "general",
          is_active: body.isActive ?? true
        }
      ])
      .select("id, code, name, account_type, is_active")
      .single();

    if (error) {
      // If the error indicates the DB does not have the new columns, retry
      // inserting without them so the create flow still works on older DBs.
      const msg = error.message || "";
      if (msg.includes("account_type") || msg.includes("is_active") || msg.includes("column") ) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("accounts")
          .insert([
            {
              company_id: body.companyId,
              code: body.code,
              name: body.name
            }
          ])
          .select("id, code, name")
          .single();

        if (fallbackError) {
          return NextResponse.json({ error: fallbackError.message }, { status: 500 });
        }

        return NextResponse.json({ item: fallbackData });
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: data });
  } catch (error) {
    console.error("Error creating account:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}