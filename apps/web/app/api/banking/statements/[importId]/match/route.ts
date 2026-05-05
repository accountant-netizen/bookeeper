import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthUser, requireAuthUser } from "@/lib/auth";
import { runMatchForImport } from "@/lib/bankMatcher";

export async function POST(
  request: NextRequest,
  { params }: { params: { importId: string } }
) {
  try {
    const authUser = await getAuthUser(
      request.headers.get("authorization")
    );
    const user = requireAuthUser(authUser);

    const importId = params.importId;
    if (!importId) {
      return NextResponse.json(
        { error: "Missing importId" },
        { status: 400 }
      );
    }

    const res = await runMatchForImport(
      importId,
      user.companyId,
      user.id
    );

    return NextResponse.json({ success: true, result: res });

  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}