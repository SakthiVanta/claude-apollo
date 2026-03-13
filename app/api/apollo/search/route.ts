import { NextRequest, NextResponse } from "next/server";
import { searchPeople, PeopleSearchFilters } from "@/lib/apollo";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as PeopleSearchFilters & { save?: boolean };
    const { save, ...filters } = body;

    const result = await searchPeople(filters);

    if (save) {
      await prisma.searchSession.create({
        data: {
          filters: filters as object,
          totalResults: result.pagination?.total_entries ?? 0,
        },
      });
    }

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isPlanError = msg.includes("free plan") || msg.includes("API_INACCESSIBLE");
    return NextResponse.json(
      { error: isPlanError ? "People search requires a paid Apollo plan (mixed_people/search is blocked on the free plan)." : msg, planRestriction: isPlanError },
      { status: isPlanError ? 403 : 500 }
    );
  }
}
