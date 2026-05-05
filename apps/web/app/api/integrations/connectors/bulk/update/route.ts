import { NextResponse } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// POST /api/integrations/connectors/bulk/update -> bulk update connectors
export async function POST(req: Request) {
  try {
    const authHeader = (req as any).headers?.get?.("authorization");
    const authUser = await getAuthUser(authHeader);
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const body = await req.json();
    const { ids, action, status } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array is required and must not be empty" }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: "action is required (delete or status)" }, { status: 400 });
    }

    if (action === "status" && !status) {
      return NextResponse.json({ error: "status is required when action is status" }, { status: 400 });
    }

    // Verify all connectors belong to user's company
    const { data: connectors, error: checkErr } = await supabase
      .from("connector_configs")
      .select("id")
      .eq("company_id", user.companyId)
      .in("id", ids);

    if (checkErr) throw new Error(checkErr.message);
    if (!connectors || connectors.length !== ids.length) {
      return NextResponse.json(
        { error: "Some connectors not found or do not belong to your company" },
        { status: 403 }
      );
    }

    let result;
    if (action === "delete") {
      const { error } = await supabase.from("connector_configs").delete().eq("company_id", user.companyId).in("id", ids);
      if (error) throw new Error(error.message);
      result = { deleted: ids.length };
    } else if (action === "status") {
      const { error } = await supabase
        .from("connector_configs")
        .update({ status })
        .eq("company_id", user.companyId)
        .in("id", ids);
      if (error) throw new Error(error.message);
      result = { updated: ids.length, status };
    } else {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
