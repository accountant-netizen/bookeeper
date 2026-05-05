import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuthUser, requireAuthUser } from "@/lib/auth";

export type Company = {
  id: string;
  name: string;
};

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const authUser = await getAuthUser(authHeader);
    const user = requireAuthUser(authUser);

    const supabase = createServerClient();

    // Get companies the user has access to through memberships
    const { data: memberships, error } = await supabase
      .from("memberships")
      .select(`
        company_id,
        companies!inner (
          id,
          name
        )
      `)
      .eq("user_id", user.id);

    if (error) {
      console.error("Companies query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const companies: Company[] = memberships
      ?.map((membership: any) => membership.companies)
      .filter(Boolean) || [];

    return NextResponse.json(companies);
  } catch (error) {
    console.error("Companies API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}