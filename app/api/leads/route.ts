import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const per_page = Math.min(100, parseInt(searchParams.get("per_page") ?? "25"));
  const q = searchParams.get("q")?.trim() ?? "";
  const enriched = searchParams.get("enriched");

  const where = {
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { companyName: { contains: q, mode: "insensitive" as const } },
            { title: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(enriched === "true" ? { enriched: true } : enriched === "false" ? { enriched: false } : {}),
  };

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * per_page,
      take: per_page,
      select: {
        id: true,
        apolloId: true,
        firstName: true,
        lastName: true,
        email: true,
        personalEmail: true,
        phone: true,
        title: true,
        seniority: true,
        companyName: true,
        companyDomain: true,
        industry: true,
        employees: true,
        linkedinUrl: true,
        city: true,
        state: true,
        country: true,
        enriched: true,
        createdAt: true,
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({
    leads,
    pagination: {
      total,
      page,
      per_page,
      total_pages: Math.ceil(total / per_page),
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const lead = await prisma.lead.create({
    data: {
      firstName: body.firstName || null,
      lastName: body.lastName || null,
      email: body.email || null,
      phone: body.phone || null,
      title: body.title || null,
      companyName: body.companyName || null,
      companyDomain: body.companyDomain || null,
      linkedinUrl: body.linkedinUrl || null,
      city: body.city || null,
      state: body.state || null,
      country: body.country || null,
      enriched: false,
    },
  });
  return NextResponse.json({ lead }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { ids } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0)
    return NextResponse.json({ error: "ids required" }, { status: 400 });

  const { count } = await prisma.lead.deleteMany({ where: { id: { in: ids } } });
  return NextResponse.json({ deleted: count });
}
