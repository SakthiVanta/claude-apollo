import { NextRequest, NextResponse } from "next/server";
import { searchContacts, createContact, ContactCreateInput, PeopleSearchFilters } from "@/lib/apollo";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const per_page = Number(searchParams.get("per_page") ?? 25);
  try {
    const result = await searchContacts({ q_keywords: q, page, per_page } as PeopleSearchFilters);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as ContactCreateInput;
    const result = await createContact(body);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
