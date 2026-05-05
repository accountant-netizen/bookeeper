import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuthUser, requireAuthUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const body = await request.json();
    const { companyId, documentId } = body;
    if (!companyId || !documentId) {
      return NextResponse.json({ error: "companyId and documentId are required" }, { status: 400 });
    }
    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    const { data: documentRow, error: documentError } = await supabase
      .from("documents")
      .select("id, filename, extracted_text, ocr_status")
      .eq("company_id", companyId)
      .eq("id", documentId)
      .single();

    if (documentError || !documentRow) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const extractedText = body.extractedText || documentRow.extracted_text || "";

    await supabase.from("documents").update({ ocr_status: "completed", extracted_text: extractedText }).eq("id", documentId).eq("company_id", companyId);

    const { data, error } = await supabase
      .from("document_ocr_jobs")
      .insert({
        company_id: companyId,
        document_id: documentId,
        engine: body.engine || "manual",
        payload: { extractedText },
        status: "succeeded",
        attempts: 1,
        created_by: user.id
      })
      .select("id, document_id, engine, payload, status, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
