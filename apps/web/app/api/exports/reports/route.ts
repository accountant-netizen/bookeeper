import { NextRequest, NextResponse } from "next/server";

type ExportRow = Record<string, unknown>;

function escapeCsv(value: unknown) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function rowsToCsv(rows: ExportRow[]) {
  if (!rows || rows.length === 0) return "";

  const firstRow = rows[0];
  if (!firstRow) return "";

  const headers = Object.keys(firstRow);

  const lines = [headers.join(",")];

  for (const row of rows) {
    lines.push(
      headers
        .map((header) => escapeCsv((row as Record<string, unknown>)[header]))
        .join(",")
    );
  }

  return lines.join("\n");
}

function escapePdfText(value: unknown) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function buildSimplePdf(title: string, lines: string[]) {
  const contentLines = [
    "BT",
    "/F1 12 Tf",
    "50 780 Td",
    `(${escapePdfText(title)}) Tj`,
  ];

  for (const line of lines.slice(0, 45)) {
    contentLines.push("T*", `(${escapePdfText(line)}) Tj`);
  }

  contentLines.push("ET");

  const content = contentLines.join("\n");

  const objects: Record<number, string> = {
    1: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`,
    2: `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`,
    3: `<< /Type /Page /Parent 4 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 1 0 R >> >> /Contents 2 0 R >>`,
    4: `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    5: `<< /Type /Catalog /Pages 4 0 R >>`,
  };

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (let i = 1; i <= 5; i++) {
    offsets[i] = Buffer.byteLength(pdf, "utf8");
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, "utf8");

  pdf += `xref\n0 6\n0000000000 65535 f \n`;

  for (let i = 1; i <= 5; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size 6 /Root 5 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const reportName = String(body?.reportName ?? "Report");
    const format = String(body?.format ?? "csv").toLowerCase();

    const rows: ExportRow[] = Array.isArray(body?.rows) ? body.rows : [];

    if (format === "pdf") {
      const lines = rows.map((row) =>
        Object.values(row ?? {})
          .map((value) => String(value ?? ""))
          .join(" | ")
      );

      const pdf = buildSimplePdf(
        reportName,
        lines.length > 0 ? lines : ["No rows provided."]
      );

      return new NextResponse(pdf, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${reportName
            .toLowerCase()
            .replace(/\s+/g, "-")}.pdf"`,
        },
      });
    }

    const csv = rowsToCsv(rows);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${reportName
          .toLowerCase()
          .replace(/\s+/g, "-")}.csv"`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}