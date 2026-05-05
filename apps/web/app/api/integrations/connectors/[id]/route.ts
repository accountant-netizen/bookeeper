import { NextResponse } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// GET
export async function GET(req: Request, context: any) {
  try {
    const authHeader = (req as any).headers?.get?.("authorization");
    const authUser = await getAuthUser(authHeader);
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const id = context.params.id;

    const { data: config, error } = await supabase
      .from("connector_configs")
      .select("id, provider, name, status, settings, created_at")
      .eq("id", id)
      .eq("company_id", user.companyId)
      .single();

    if (error || !config) {
      return NextResponse.json(
        { error: "Connector not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ item: config });

  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// PUT
export async function PUT(req: Request, context: any) {
  try {
    const authHeader = (req as any).headers?.get?.("authorization");
    const authUser = await getAuthUser(authHeader);
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const id = context.params.id;

    const body = await req.json();
    const { name, status, settings } = body;

    const { data: existing, error: checkErr } = await supabase
      .from("connector_configs")
      .select("id, name, provider")
      .eq("id", id)
      .eq("company_id", user.companyId)
      .single();

    if (checkErr || !existing) {
      return NextResponse.json(
        { error: "Connector not found" },
        { status: 404 }
      );
    }

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
          {
            error: `Connector with name "${name}" already exists for ${existing.provider}`,
          },
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
      .eq("id", id)
      .eq("company_id", user.companyId)
      .select("id, provider, name, status, settings, created_at")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ item: data });

  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// DELETE
export async function DELETE(req: Request, context: any) {
  try {
    const authHeader = (req as any).headers?.get?.("authorization");
    const authUser = await getAuthUser(authHeader);
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const id = context.params.id;

    const { data: existing, error: checkErr } = await supabase
      .from("connector_configs")
      .select("id")
      .eq("id", id)
      .eq("company_id", user.companyId)
      .single();

    if (checkErr || !existing) {
      return NextResponse.json(
        { error: "Connector not found" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("connector_configs")
      .delete()
      .eq("id", id)
      .eq("company_id", user.companyId);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });

  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}