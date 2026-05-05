import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuthUser, requireAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const companyId = request.nextUrl.searchParams.get("companyId") || user.companyId;
    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("documents")
      .select("id, related_entity_type, related_entity_id, filename, mime_type, storage_path, extracted_text, ocr_status, metadata, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data || [] });
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
    const { companyId, filename } = body;
    if (!companyId || !filename) {
      return NextResponse.json({ error: "companyId and filename are required" }, { status: 400 });
    }
    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("documents")
      .insert({
        company_id: companyId,
        related_entity_type: body.relatedEntityType || null,
        related_entity_id: body.relatedEntityId || null,
        filename,
        mime_type: body.mimeType || null,
        storage_path: body.storagePath || null,
        extracted_text: body.extractedText || null,
        ocr_status: body.ocrStatus || "pending",
        metadata: body.metadata || {},
        created_by: user.id
      })
      .select("id, related_entity_type, related_entity_id, filename, mime_type, storage_path, extracted_text, ocr_status, metadata, created_at")
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
