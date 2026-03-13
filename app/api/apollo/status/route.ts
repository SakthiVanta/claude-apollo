import { NextResponse } from "next/server";
import { checkConnection } from "@/lib/apollo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Apollo Free Plan — confirmed via live API calls:
 *   ✅ POST /contacts/search         — search your own saved CRM contacts
 *   ✅ POST /accounts/search         — search your saved company accounts
 *   ❌ POST /people/match            — 403: not accessible on free plan
 *   ❌ POST /people/bulk_match       — 403: same endpoint restriction
 *   ❌ GET  /organizations/enrich    — 403: not accessible on free plan
 *   ❌ POST /mixed_people/search     — 403: API_INACCESSIBLE on free plan
 *   ❌ POST /mixed_companies/search  — 403: API_INACCESSIBLE on free plan
 *   ❌ POST /organizations/bulk_enrich — 403: paid only
 *   ❌ GET  /email_accounts          — requires Master API key
 *   ❌ POST /emailer_campaigns/search — requires Master API key
 */
export async function GET() {
  const result = await checkConnection();
  return NextResponse.json(
    {
      ...result,
      freeFeatures: [
        "Search your saved CRM contacts",
        "Search your saved company accounts",
      ],
      paidFeatures: [
        "Enrich individual contacts (people/match)",
        "Enrich companies by domain",
        "Bulk people search",
        "Bulk company search",
        "Bulk enrichment",
        "Email sequences (requires Master API key)",
        "Email accounts (requires Master API key)",
      ],
    },
    { status: result.ok ? 200 : 503 }
  );
}
