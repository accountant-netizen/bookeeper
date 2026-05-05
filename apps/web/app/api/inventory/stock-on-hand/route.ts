import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuthUser, requireAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const companyId = request.nextUrl.searchParams.get("companyId") || user.companyId;
    if (companyId !== user.companyId) return NextResponse.json({ error: "Company mismatch" }, { status: 403 });

    const { data: products } = await supabase.from("products").select("id, code, name").eq("company_id", companyId);

    const { data: movements } = await supabase
      .from("stock_movements")
      .select("product_id, movement_type, quantity")
      .eq("company_id", companyId);

    const map: Record<string, number> = {};
    for (const p of products || []) map[p.id] = 0;

    for (const m of movements || []) {
      if (!map.hasOwnProperty(m.product_id)) continue;
      const q = Number(m.quantity || 0);
      if ((m.movement_type || "").toLowerCase() === "in") map[m.product_id] += q;
      else map[m.product_id] -= q;
    }

    const items = (products || []).map((p: any) => ({ productId: p.id, code: p.code, name: p.name, onHand: (map[p.id] || 0).toFixed(4) }));

    return NextResponse.json({ items });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
