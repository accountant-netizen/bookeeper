import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

type RouteContext = {
  params: {
    id: string;
  };
};

// PUT
export async function PUT(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const authUser = await getAuthUser(req.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const id = context.params.id;
    const body = await req.json();
    const { name, pattern, priority } = body || {};

    const updateRow: any = {};
    if (name !== undefined) updateRow.name = name;
    if (pattern !== undefined) updateRow.pattern = pattern;
    if (priority !== undefined) updateRow.priority = priority;

    const { data, error } = await supabase
      .from("bank_statement_match_rules")
      .update(updateRow)
      .eq("id", id)
      .eq("company_id", user.companyId)
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data?.id });

  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE
export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const authUser = await getAuthUser(req.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const id = context.params.id;

    const { error } = await supabase
      .from("bank_statement_match_rules")
      .delete()
      .eq("id", id)
      .eq("company_id", user.companyId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}