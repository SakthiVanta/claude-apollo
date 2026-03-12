import { NextResponse } from "next/server";
import { checkConnection } from "@/lib/apollo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Apollo Free Plan — available endpoints:
 *   ✅ GET  /email_accounts          — list linked email accounts
 *   ✅ POST /people/match            — enrich single person (1 credit)
 *   ✅ POST /people/bulk_match       — enrich up to 10 (1 credit each)
 *   ✅ GET  /organizations/enrich    — enrich company by domain (credits)
 *   ✅ POST /emailer_campaigns/search — list sequences
 *   ✅ POST /contacts/search         — search your own saved CRM contacts
 *   ✅ POST /accounts/search         — search your saved company accounts
 *   ❌ POST /mixed_people/search     — bulk people search (paid only)
 *   ❌ POST /mixed_companies/search  — bulk company search (paid only)
 *   ❌ POST /organizations/bulk_enrich — bulk org enrich (paid only)
 */
export async function GET() {
  const result = await checkConnection();
  return NextResponse.json(
    {
      ...result,
      freeFeatures: [
        "Enrich individual contacts (1 credit each)",
        "Enrich companies by domain",
        "Search your saved CRM contacts",
        "Search your saved accounts",
        "Manage email sequences",
      ],
      paidFeatures: [
        "Bulk people search",
        "Bulk company search",
        "Bulk enrichment",
      ],
    },
    { status: result.ok ? 200 : 503 }
  );
}
