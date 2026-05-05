import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuthUser, requireAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const companyId = request.nextUrl.searchParams.get("companyId") || user.companyId;
    const productId = request.nextUrl.searchParams.get("productId");

    if (companyId !== user.companyId) return NextResponse.json({ error: "Company mismatch" }, { status: 403 });

    let q = supabase
      .from("stock_movements")
      .select("id, product_id, movement_type, quantity, reference_no, notes, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (productId) q = q.eq("product_id", productId);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: data || [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const body = await request.json();
    const { productId, movementType, quantity, referenceNo, notes } = body;
    if (!productId || !movementType || quantity === undefined) {
      return NextResponse.json({ error: "productId, movementType, and quantity are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("stock_movements")
      .insert({
        company_id: user.companyId,
        product_id: productId,
        movement_type: movementType,
        quantity: quantity,
        reference_no: referenceNo || null,
        notes: notes || null
      })
      .select("id, product_id, movement_type, quantity, reference_no, notes, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
