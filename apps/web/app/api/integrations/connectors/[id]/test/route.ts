import { NextResponse } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { performConnectorSync } from "@/lib/connectorProviders";

// POST /api/integrations/connectors/[id]/test
export async function POST(req: Request, context: any) {
  try {
    const authHeader = (req as any).headers?.get?.("authorization");
    const authUser = await getAuthUser(authHeader);
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const id = context.params.id;

    // Fetch connector config
    const { data: config, error: configErr } = await supabase
      .from("connector_configs")
      .select("id, provider, settings, name")
      .eq("id", id)
      .eq("company_id", user.companyId)
      .single();

    if (configErr || !config) {
      return NextResponse.json(
        { error: "Connector not found" },
        { status: 404 }
      );
    }

    // Test connector
    try {
      const result = await performConnectorSync({
        connectorId: config.id,
        provider: config.provider,
        settings: config.settings,
      });

      return NextResponse.json({
        success: true,
        message: `Connection successful. ${result.message}`,
        itemsProcessed: result.itemsProcessed,
        provider: config.provider,
      });
    } catch (syncErr: any) {
      return NextResponse.json(
        {
          success: false,
          message: `Connection failed: ${syncErr.message}`,
          provider: config.provider,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}