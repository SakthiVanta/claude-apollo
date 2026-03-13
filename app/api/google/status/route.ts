import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const configured =
    !!process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID_HERE";

  if (!configured) {
    return NextResponse.json({ connected: false, configured: false });
  }

  const cookieStore = await cookies();
  const raw = cookieStore.get("google_tokens")?.value;
  if (!raw) return NextResponse.json({ connected: false, configured: true });

  try {
    const tokens = JSON.parse(raw);
    const connected = !!tokens?.access_token;
    return NextResponse.json({ connected, configured: true });
  } catch {
    return NextResponse.json({ connected: false, configured: true });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("google_tokens");
  return NextResponse.json({ ok: true });
}
