import { NextRequest, NextResponse } from "next/server";
import { searchAccounts } from "@/lib/apollo";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await searchAccounts(body);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
