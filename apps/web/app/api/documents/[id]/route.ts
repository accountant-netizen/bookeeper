import { NextResponse } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// GET /api/documents/[id] -> fetch single document
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const authHeader = (req as any).headers?.get?.("authorization");
    const authUser = await getAuthUser(authHeader);
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const id = params.id;

    const { data: doc, error } = await supabase
      .from("documents")
      .select("id, filename, ocr_status")
      .eq("company_id", user.companyId)
      .eq("id", id)
      .single();

    if (error || !doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    return NextResponse.json({ item: doc });
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
