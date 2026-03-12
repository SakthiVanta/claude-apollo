import { NextRequest, NextResponse } from "next/server";
import { searchSequences, listEmailAccounts } from "@/lib/apollo";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;
  try {
    const [sequences, emailAccounts] = await Promise.all([
      searchSequences({ q_name: q }),
      listEmailAccounts(),
    ]);
    return NextResponse.json({ sequences, emailAccounts });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
