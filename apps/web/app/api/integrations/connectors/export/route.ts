import { NextResponse } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// GET /api/integrations/connectors/export -> export connectors as CSV or JSON
export async function GET(req: Request) {
  try {
    const authHeader = (req as any).headers?.get?.("authorization");
    const authUser = await getAuthUser(authHeader);
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json"; // json or csv
    const provider = searchParams.get("provider");
    const status = searchParams.get("status");

    let query = supabase
      .from("connector_configs")
      .select("id, provider, name, status, settings, created_at")
      .eq("company_id", user.companyId);

    if (provider) query = query.eq("provider", provider);
    if (status) query = query.eq("status", status);

    const { data: connectors, error } = await query.order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    if (format === "csv") {
      // Generate CSV
      const headers = ["ID", "Provider", "Name", "Status", "Created"];
      const rows = (connectors || []).map((c: any) => [
        c.id,
        c.provider,
        c.name,
        c.status,
        new Date(c.created_at).toISOString(),
      ]);

      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="connectors_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    } else {
      // JSON format
      const json = JSON.stringify(
        { items: connectors || [], exported_at: new Date().toISOString(), total: connectors?.length || 0 },
        null,
        2
      );

      return new NextResponse(json, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="connectors_${new Date().toISOString().split("T")[0]}.json"`,
        },
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
