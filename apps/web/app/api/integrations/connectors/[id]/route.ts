import { NextResponse } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// GET /api/integrations/connectors/[id] -> fetch single connector config
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const authHeader = (req as any).headers?.get?.("authorization");
    const authUser = await getAuthUser(authHeader);
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const { data: config, error } = await supabase
      .from("connector_configs")
      .select("id, provider, name, status, settings, created_at")
      .eq("id", params.id)
      .eq("company_id", user.companyId)
      .single();

    if (error || !config) {
      return NextResponse.json({ error: "Connector not found" }, { status: 404 });
    }

    return NextResponse.json({ item: config });
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}

// PUT /api/integrations/connectors/[id] -> update connector config
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const authHeader = (req as any).headers?.get?.("authorization");
    const authUser = await getAuthUser(authHeader);
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const body = await req.json();
    const { name, status, settings } = body;

    // Verify connector exists and belongs to user's company
    const { data: existing, error: checkErr } = await supabase
      .from("connector_configs")
      .select("id, name, provider")
      .eq("id", params.id)
      .eq("company_id", user.companyId)
      .single();

    if (checkErr || !existing) {
      return NextResponse.json({ error: "Connector not found" }, { status: 404 });
    }

    // If name changed, check unique constraint
    if (name && name !== existing.name) {
      const { data: duplicate } = await supabase
        .from("connector_configs")
        .select("id")
        .eq("company_id", user.companyId)
        .eq("provider", existing.provider)
        .eq("name", name)
        .single();

      if (duplicate) {
        return NextResponse.json(
          { error: `Connector with name "${name}" already exists for ${existing.provider}` },
          { status: 409 }
        );
      }
    }

    const updates: any = {};
    if (name) updates.name = name;
    if (status) updates.status = status;
    if (settings) updates.settings = settings;

    const { data, error } = await supabase
      .from("connector_configs")
      .update(updates)
      .eq("id", params.id)
      .eq("company_id", user.companyId)
      .select("id, provider, name, status, settings, created_at")
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ item: data });
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}

// DELETE /api/integrations/connectors/[id] -> delete connector config
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const authHeader = (req as any).headers?.get?.("authorization");
    const authUser = await getAuthUser(authHeader);
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    // Verify connector exists and belongs to user's company
    const { data: existing, error: checkErr } = await supabase
      .from("connector_configs")
      .select("id")
      .eq("id", params.id)
      .eq("company_id", user.companyId)
      .single();

    if (checkErr || !existing) {
      return NextResponse.json({ error: "Connector not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("connector_configs")
      .delete()
      .eq("id", params.id)
      .eq("company_id", user.companyId);

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
