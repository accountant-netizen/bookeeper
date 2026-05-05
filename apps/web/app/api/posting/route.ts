import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import {
  validatePostingRequest,
  type PostJournalEntryRequest,
  type PostJournalEntryResponse
} from "@accountant/accounting-core";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const authUser = await getAuthUser(authHeader);
    const user = requireAuthUser(authUser);

    const body: PostJournalEntryRequest = await request.json();

    // Validate posting request structure
    const validation = validatePostingRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error } as PostJournalEntryResponse,
        { status: 400 }
      );
    }

    // Ensure company_id matches tenant
    if (body.companyId !== user.companyId) {
      return NextResponse.json(
        { success: false, error: "Company mismatch" } as PostJournalEntryResponse,
        { status: 403 }
      );
    }

    const supabase = createServerClient();

    // Create journal entry with 'draft' status initially
    const { data: entryData, error: entryError } = await supabase
      .from("journal_entries")
      .insert({
        company_id: user.companyId,
        branch_id: body.branchId,
        reference_no: body.referenceNo,
        entry_date: body.entryDate,
        status: "draft",
        total_debit: 0,
        total_credit: 0,
        created_by: user.id
      })
      .select("id")
      .single();

    if (entryError || !entryData) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create journal entry"
        } as PostJournalEntryResponse,
        { status: 500 }
      );
    }

    // Insert journal lines
    const lines = body.lines.map((line: { accountId: string; description?: string; debit: string; credit: string }) => ({
      journal_entry_id: entryData.id,
      company_id: user.companyId,
      account_id: line.accountId,
      description: line.description || null,
      debit: parseFloat(line.debit || "0"),
      credit: parseFloat(line.credit || "0")
    }));

    const { error: linesError } = await supabase
      .from("journal_lines")
      .insert(lines);

    if (linesError) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to insert journal lines"
        } as PostJournalEntryResponse,
        { status: 500 }
      );
    }

    // Update entry status to 'posted' (will trigger balance check)
    const { data: postedEntry, error: postError } = await supabase
      .from("journal_entries")
      .update({ status: "posted" })
      .eq("id", entryData.id)
      .select("id")
      .single();

    if (postError) {
      // If posting fails (likely balance issue), delete the entry and return error
      await supabase
        .from("journal_entries")
        .delete()
        .eq("id", entryData.id);

      return NextResponse.json(
        {
          success: false,
          error: postError.message || "Failed to post entry (balance check failed)"
        } as PostJournalEntryResponse,
        { status: 400 }
      );
    }

    // Log audit trail
    await supabase.from("audit_logs").insert({
      company_id: user.companyId,
      actor_user_id: user.id,
      action: "journal_entry_posted",
      entity_name: "journal_entries",
      entity_id: entryData.id,
      payload: { lines_count: body.lines.length }
    });

    return NextResponse.json(
      { success: true, entryId: entryData.id } as PostJournalEntryResponse,
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message } as PostJournalEntryResponse,
      { status: 500 }
    );
  }
}
