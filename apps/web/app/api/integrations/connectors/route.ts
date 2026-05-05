import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuthUser, requireAuthUser } from "@/lib/auth";

const supportedProviders = [
  { provider: "quickbooks", name: "QuickBooks Online" },
  { provider: "xero", name: "Xero" },
  { provider: "google_sheets", name: "Google Sheets" },
  { provider: "sftp", name: "SFTP Export" },
  { provider: "email", name: "Email Delivery" }
];

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const page = parseInt(request.nextUrl.searchParams.get("page") || "1", 10);
    const pageSize = parseInt(request.nextUrl.searchParams.get("pageSize") || "10", 10);
    const provider = request.nextUrl.searchParams.get("provider");
    const status = request.nextUrl.searchParams.get("status");
    const search = request.nextUrl.searchParams.get("search");

    let query = supabase
      .from("connector_configs")
      .select("id, provider, name, status, settings, created_at", { count: "exact" })
      .eq("company_id", user.companyId);

    if (provider) query = query.eq("provider", provider);
    if (status) query = query.eq("status", status);
    if (search) query = query.or(`name.ilike.%${search}%,provider.ilike.%${search}%`);

    query = query.order("created_at", { ascending: false });

    const offset = (page - 1) * pageSize;
    const { data, count, error } = await query.range(offset, offset + pageSize - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const totalPages = count ? Math.ceil(count / pageSize) : 0;
    return NextResponse.json({
      supportedProviders,
      items: data || [],
      pagination: { page, pageSize, total: count || 0, totalPages },
    });
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
    const { provider, name, settings } = body;

    if (!provider || !name) {
      return NextResponse.json({ error: "provider and name are required" }, { status: 400 });
    }

    // Check unique constraint
    const { data: existing } = await supabase
      .from("connector_configs")
      .select("id")
      .eq("company_id", user.companyId)
      .eq("provider", provider)
      .eq("name", name)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: `Connector with name "${name}" already exists for ${provider}` },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("connector_configs")
      .insert({
        company_id: user.companyId,
        provider,
        name,
        status: "inactive",
        settings: settings || {},
        created_by: user.id
      })
      .select("id, provider, name, status, settings, created_at")
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
