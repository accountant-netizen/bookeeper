import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuthUser, requireAuthUser } from "@/lib/auth";

type VaultSource = "document" | "tax_export" | "payroll_filing";

type VaultItem = {
  id: string;
  source: VaultSource;
  title: string;
  category: string;
  mimeType: string | null;
  status: string;
  createdAt: string;
  downloadUrl: string;
};

function mapDocumentToVaultItem(doc: any): VaultItem {
  const category = String(doc.metadata?.vault_category || doc.related_entity_type || "document");
  return {
    id: doc.id,
    source: "document",
    title: doc.filename,
    category,
    mimeType: doc.mime_type || "application/octet-stream",
    status: doc.ocr_status || "stored",
    createdAt: doc.created_at,
    downloadUrl: `/api/vault/download?source=document&id=${doc.id}`,
  };
}

function mapTaxExportToVaultItem(row: any): VaultItem {
  const title = `${row.export_type} (${row.period_start} to ${row.period_end})`;
  return {
    id: row.id,
    source: "tax_export",
    title,
    category: "tax",
    mimeType: "application/json",
    status: "stored",
    createdAt: row.created_at,
    downloadUrl: `/api/vault/download?source=tax_export&id=${row.id}`,
  };
}

function mapPayrollFilingToVaultItem(row: any): VaultItem {
  const title = `${row.filing_type} filing (${row.period_start} to ${row.period_end})`;
  return {
    id: row.id,
    source: "payroll_filing",
    title,
    category: "payroll-tax",
    mimeType: "application/json",
    status: row.status || "draft",
    createdAt: row.created_at,
    downloadUrl: `/api/vault/download?source=payroll_filing&id=${row.id}`,
  };
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const companyId = request.nextUrl.searchParams.get("companyId") || user.companyId;
    const sourceFilter = (request.nextUrl.searchParams.get("source") || "all").toLowerCase();
    const search = (request.nextUrl.searchParams.get("search") || "").trim().toLowerCase();

    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    const loadDocuments = sourceFilter === "all" || sourceFilter === "document";
    const loadTaxExports = sourceFilter === "all" || sourceFilter === "tax_export";
    const loadPayrollFilings = sourceFilter === "all" || sourceFilter === "payroll_filing";

    const [documentsResult, taxExportsResult, payrollResult] = await Promise.all([
      loadDocuments
        ? supabase
            .from("documents")
            .select("id, filename, mime_type, related_entity_type, ocr_status, metadata, created_at")
            .eq("company_id", companyId)
            .eq("related_entity_type", "vault_item")
        : Promise.resolve({ data: [], error: null } as any),
      loadTaxExports
        ? supabase
            .from("tax_exports")
            .select("id, export_type, period_start, period_end, created_at")
            .eq("company_id", companyId)
        : Promise.resolve({ data: [], error: null } as any),
      loadPayrollFilings
        ? supabase
            .from("payroll_tax_filings")
            .select("id, filing_type, period_start, period_end, status, created_at")
            .eq("company_id", companyId)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    if (documentsResult.error) {
      return NextResponse.json({ error: documentsResult.error.message }, { status: 500 });
    }
    if (taxExportsResult.error) {
      return NextResponse.json({ error: taxExportsResult.error.message }, { status: 500 });
    }
    if (payrollResult.error) {
      return NextResponse.json({ error: payrollResult.error.message }, { status: 500 });
    }

    let items: VaultItem[] = [
      ...(documentsResult.data || []).map(mapDocumentToVaultItem),
      ...(taxExportsResult.data || []).map(mapTaxExportToVaultItem),
      ...(payrollResult.data || []).map(mapPayrollFilingToVaultItem),
    ];

    if (search) {
      items = items.filter((item) => {
        return (
          item.title.toLowerCase().includes(search) ||
          item.category.toLowerCase().includes(search) ||
          item.source.toLowerCase().includes(search)
        );
      });
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const body = await request.json();
    const companyId = body.companyId || user.companyId;
    const filename = String(body.filename || "").trim();
    const mimeType = body.mimeType ? String(body.mimeType) : "text/plain";
    const contentBase64 = body.contentBase64 ? String(body.contentBase64) : "";
    const category = body.category ? String(body.category) : "document";

    if (!filename || !contentBase64) {
      return NextResponse.json({ error: "filename and contentBase64 are required" }, { status: 400 });
    }
    if (companyId !== user.companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    const metadata = {
      vault_category: category,
      vault_content_base64: contentBase64,
      vault_uploaded_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("documents")
      .insert({
        company_id: companyId,
        related_entity_type: "vault_item",
        related_entity_id: null,
        filename,
        mime_type: mimeType,
        storage_path: null,
        extracted_text: null,
        ocr_status: "completed",
        metadata,
        created_by: user.id,
      })
      .select("id, filename, mime_type, related_entity_type, ocr_status, metadata, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: mapDocumentToVaultItem(data) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request.headers.get("authorization"));
    const user = requireAuthUser(authUser);
    const supabase = createServerClient();

    const source = request.nextUrl.searchParams.get("source");
    const id = request.nextUrl.searchParams.get("id");

    if (!source || !id) {
      return NextResponse.json({ error: "source and id are required" }, { status: 400 });
    }

    if (source === "document") {
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", id)
        .eq("company_id", user.companyId)
        .eq("related_entity_type", "vault_item");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (source === "tax_export") {
      const { error } = await supabase
        .from("tax_exports")
        .delete()
        .eq("id", id)
        .eq("company_id", user.companyId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Only source=document and source=tax_export are currently deletable." },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
