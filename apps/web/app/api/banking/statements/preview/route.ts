import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { detectFormat, parseCSV, parseOFX, parseMT940 } from "@accountant/accounting-core";

type ParsedStatementRow = {
  txn_date?: string;
  description?: string;
  amount?: number;
  [key: string]: any;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content } = body || {};

    if (!content) {
      return NextResponse.json({ parsed: [], format: "csv" });
    }

    const format = detectFormat(content);

    let parsed: ParsedStatementRow[] = [];

    if (format === "csv") parsed = parseCSV(content);
    else if (format === "ofx") parsed = parseOFX(content);
    else if (format === "mt940") parsed = parseMT940(content);

    return NextResponse.json({ parsed, format });
  } catch (err: any) {
    return NextResponse.json(
      { parsed: [], error: String(err.message || err) },
      { status: 500 }
    );
  }
}