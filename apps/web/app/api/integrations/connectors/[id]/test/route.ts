import { NextResponse } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { performConnectorSync } from "@/lib/connectorProviders";

// POST /api/integrations/connectors/[id]/test -> test connector connection
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const authHeader = (req as any).headers?.get?.("authorization");
    const authUser = await getAuthUser(authHeader);
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    // Fetch connector config
    const { data: config, error: configErr } = await supabase
      .from("connector_configs")
      .select("id, provider, settings, name")
      .eq("id", params.id)
      .eq("company_id", user.companyId)
      .single();

    if (configErr || !config) {
      return NextResponse.json({ error: "Connector not found" }, { status: 404 });
    }

    // Test the connector by performing a sync
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
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
