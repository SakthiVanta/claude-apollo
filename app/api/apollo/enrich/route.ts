import { NextRequest, NextResponse } from "next/server";
import { enrichPerson, EnrichPersonInput } from "@/lib/apollo";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const input = await req.json() as EnrichPersonInput & { save?: boolean };
    const { save, ...enrichInput } = input;

    const result = await enrichPerson(enrichInput);

    if (save && result.person) {
      const p = result.person;
      const org = result.organization ?? p.organization;
      const phone = p.phone_numbers?.[0]?.raw_number ?? null;

      await prisma.lead.upsert({
        where: { apolloId: p.id },
        update: {
          email: p.email ?? undefined,
          personalEmail: p.personal_emails?.[0] ?? undefined,
          phone: phone ?? undefined,
          enriched: true,
          rawData: result as object,
          updatedAt: new Date(),
        },
        create: {
          apolloId: p.id,
          firstName: p.first_name,
          lastName: p.last_name,
          email: p.email ?? undefined,
          personalEmail: p.personal_emails?.[0] ?? undefined,
          phone: phone ?? undefined,
          title: p.title ?? undefined,
          seniority: p.seniority ?? undefined,
          companyName: org?.name ?? undefined,
          companyDomain: org?.primary_domain ?? undefined,
          industry: org?.industry ?? undefined,
          employees: org?.estimated_num_employees ?? undefined,
          revenue: org?.annual_revenue_printed ?? undefined,
          linkedinUrl: p.linkedin_url ?? undefined,
          city: p.city ?? undefined,
          state: p.state ?? undefined,
          country: p.country ?? undefined,
          enriched: true,
          rawData: result as object,
        },
      });
    }

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
