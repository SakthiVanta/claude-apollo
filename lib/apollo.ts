const APOLLO_BASE = "https://api.apollo.io/api/v1";

function getApiKey() {
  const key = process.env.API_KEY_APOLLO;
  if (!key) throw new Error("API_KEY_APOLLO not configured");
  return key;
}

async function apolloPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${APOLLO_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getApiKey(),
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apollo ${res.status}: ${text}`);
  }
  return res.json();
}

async function apolloGet<T>(path: string): Promise<T> {
  const res = await fetch(`${APOLLO_BASE}${path}`, {
    headers: {
      "x-api-key": getApiKey(),
      "Cache-Control": "no-cache",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apollo ${res.status}: ${text}`);
  }
  return res.json();
}

async function apolloPut<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${APOLLO_BASE}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getApiKey(),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apollo ${res.status}: ${text}`);
  }
  return res.json();
}

async function apolloDelete<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${APOLLO_BASE}${path}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getApiKey(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apollo ${res.status}: ${text}`);
  }
  return res.json();
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ApolloPerson {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  linkedin_url: string | null;
  title: string | null;
  email: string | null;
  email_status: string | null;
  photo_url: string | null;
  phone_numbers: Array<{ raw_number: string; sanitized_number?: string; type: string }>;
  organization_id: string | null;
  organization: ApolloOrg | null;
  account_id: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  seniority: string | null;
  departments: string[];
  subdepartments?: string[];
  functions?: string[];
  personal_emails: string[];
  revealed_for_current_team: boolean;
  is_likely_to_engage?: boolean;
  intent_strength?: string | null;
}

export interface ApolloOrg {
  id: string;
  name: string;
  website_url: string | null;
  primary_domain: string | null;
  industry: string | null;
  estimated_num_employees: number | null;
  annual_revenue_printed: string | null;
  annual_revenue?: number | null;
  total_funding_printed: string | null;
  total_funding?: number | null;
  logo_url: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
  phone?: string | null;
  description?: string | null;
  keywords?: string[];
  technology_names?: string[];
  latest_funding_stage?: string | null;
  latest_funding_round_date?: string | null;
  headquarters_address?: string | null;
  founded_year?: number | null;
}

export interface ApolloContact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  email: string | null;
  title: string | null;
  organization_name: string | null;
  linkedin_url: string | null;
  phone: string | null;
  mobile_phone: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  label_names?: string[];
  account_id?: string | null;
  owner_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ApolloSequence {
  id: string;
  name: string;
  active: boolean;
  creation_type?: string;
  num_steps?: number;
  user_id?: string;
  label_ids?: string[];
}

export interface ApolloEmailAccount {
  id: string;
  email: string;
  active: boolean;
  default: boolean;
  provider?: string;
}

export interface ApolloAccount {
  id: string;
  name: string;
  domain: string | null;
  website_url: string | null;
  industry: string | null;
  estimated_num_employees: number | null;
  annual_revenue_printed: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  linkedin_url: string | null;
}

// ─── Filter Types ─────────────────────────────────────────────────────────────

export interface PeopleSearchFilters {
  person_titles?: string[];
  person_seniorities?: string[];
  q_organization_keyword_tags?: string[];
  organization_num_employees_ranges?: string[];
  organization_locations?: string[];
  person_locations?: string[];
  q_organization_domains_list?: string[];
  q_keywords?: string;
  contact_label_ids?: string[];
  contact_stage_ids?: string[];
  organization_ids?: string[];
  account_ids?: string[];
  per_page?: number;
  page?: number;
}

export interface PeopleSearchResult {
  people: ApolloPerson[];
  contacts?: ApolloPerson[];
  pagination: { page: number; per_page: number; total_entries: number; total_pages: number };
}

export interface EnrichPersonInput {
  first_name?: string;
  last_name?: string;
  name?: string;
  organization_name?: string;
  domain?: string;
  email?: string;
  linkedin_url?: string;
  reveal_personal_emails?: boolean;
}

export interface EnrichPersonResult {
  person: ApolloPerson | null;
  organization: ApolloOrg | null;
}

export interface CompanySearchFilters {
  q_organization_keyword_tags?: string[];
  organization_num_employees_ranges?: string[];
  organization_locations?: string[];
  q_keywords?: string;
  organization_ids?: string[];
  per_page?: number;
  page?: number;
}

export interface CompanySearchResult {
  organizations: ApolloOrg[];
  accounts?: ApolloAccount[];
  pagination: { page: number; per_page: number; total_entries: number; total_pages: number };
}

export interface ContactCreateInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  title?: string;
  organization_name?: string;
  direct_phone?: string;
  mobile_phone?: string;
  linkedin_url?: string;
  city?: string;
  state?: string;
  country?: string;
  run_dedupe?: boolean;
}

export interface BulkMatchPerson {
  first_name?: string;
  last_name?: string;
  domain?: string;
  email?: string;
  linkedin_url?: string;
  organization_name?: string;
}

// ─── People API ───────────────────────────────────────────────────────────────

export async function searchPeople(filters: PeopleSearchFilters): Promise<PeopleSearchResult> {
  return apolloPost("/mixed_people/search", { per_page: 25, page: 1, ...filters });
}

export async function enrichPerson(input: EnrichPersonInput): Promise<EnrichPersonResult> {
  return apolloPost("/people/match", { reveal_personal_emails: true, reveal_phone_number: false, ...input });
}

export async function bulkMatchPeople(
  details: BulkMatchPerson[],
  reveal_personal_emails = true
): Promise<{ matches: EnrichPersonResult[] }> {
  return apolloPost("/people/bulk_match", {
    details,
    reveal_personal_emails,
    reveal_phone_number: false,
  });
}

// ─── Contacts API ─────────────────────────────────────────────────────────────

export async function searchContacts(filters: PeopleSearchFilters): Promise<PeopleSearchResult> {
  return apolloPost("/contacts/search", { per_page: 25, page: 1, ...filters });
}

export async function createContact(input: ContactCreateInput): Promise<{ contact: ApolloContact }> {
  return apolloPost("/contacts", { ...input, run_dedupe: input.run_dedupe ?? true });
}

export async function updateContact(
  id: string,
  input: Partial<ContactCreateInput>
): Promise<{ contact: ApolloContact }> {
  return apolloPut(`/contacts/${id}`, input as Record<string, unknown>);
}

export async function deleteContact(id: string): Promise<{ message: string }> {
  return apolloDelete(`/contacts/${id}`);
}

// ─── Organizations API ────────────────────────────────────────────────────────

export async function searchCompanies(filters: CompanySearchFilters): Promise<CompanySearchResult> {
  return apolloPost("/mixed_companies/search", { per_page: 25, page: 1, ...filters });
}

export async function enrichOrganization(domain: string): Promise<{ organization: ApolloOrg | null }> {
  return apolloGet(`/organizations/enrich?domain=${encodeURIComponent(domain)}`);
}

export async function bulkEnrichOrganizations(
  domains: string[]
): Promise<{ organizations: ApolloOrg[] }> {
  return apolloPost("/organizations/bulk_enrich", { domains });
}

// ─── Accounts API (saved companies) ──────────────────────────────────────────

export async function searchAccounts(filters: {
  q_keywords?: string;
  account_ids?: string[];
  organization_ids?: string[];
  per_page?: number;
  page?: number;
}): Promise<{ accounts: ApolloAccount[]; pagination: { total_entries: number; page: number; per_page: number } }> {
  return apolloPost("/accounts/search", { per_page: 25, page: 1, ...filters });
}

export async function createAccount(input: {
  name: string;
  domain?: string;
  phone?: string;
  raw_address?: string;
}): Promise<{ account: ApolloAccount }> {
  return apolloPost("/accounts", input as Record<string, unknown>);
}

// ─── Sequences API ────────────────────────────────────────────────────────────

export async function searchSequences(params?: {
  q_name?: string;
  active?: boolean;
  per_page?: number;
}): Promise<{ emailer_campaigns: ApolloSequence[] }> {
  return apolloPost("/emailer_campaigns/search", { per_page: 50, ...params });
}

export async function addContactsToSequence(
  sequenceId: string,
  contactIds: string[],
  emailAccountId: string,
  options?: { sequence_active_in_other_campaigns?: boolean }
): Promise<{ contacts: ApolloContact[] }> {
  return apolloPost(`/emailer_campaigns/${sequenceId}/add_contact_ids`, {
    emailer_campaign_id: sequenceId,
    contact_ids: contactIds,
    send_email_from_email_account_id: emailAccountId,
    sequence_active_in_other_campaigns: options?.sequence_active_in_other_campaigns ?? false,
  });
}

export async function removeContactsFromSequence(
  sequenceId: string,
  contactIds: string[]
): Promise<{ message: string }> {
  return apolloPost(`/emailer_campaigns/${sequenceId}/remove_or_stop_contact_ids`, {
    emailer_campaign_id: sequenceId,
    contact_ids: contactIds,
    stop_and_remove: true,
  });
}

// ─── Email Accounts API ───────────────────────────────────────────────────────

export async function listEmailAccounts(): Promise<{ email_accounts: ApolloEmailAccount[] }> {
  return apolloGet("/email_accounts");
}

// ─── User / Credits API ───────────────────────────────────────────────────────

/**
 * Returns current user info via GET /users (paginated, first result = self).
 * NOTE: Apollo v1 has no /users/me endpoint. We use /users to list org members.
 */
export async function getUserInfo(): Promise<{
  users: Array<{ id: string; email: string; name: string; is_current_user?: boolean }>;
  pagination?: { total_entries: number };
}> {
  return apolloGet("/users");
}

// ─── Connection Check ─────────────────────────────────────────────────────────
// Uses GET /email_accounts — lightweight, works on free plan, confirms API key.
// /users/me does NOT exist in Apollo v1 (returns 422 "me is not a valid ID").

export async function checkConnection(): Promise<{
  ok: boolean;
  error?: string;
  emailAccounts?: number;
  planRestriction?: boolean;
}> {
  try {
    const data = await listEmailAccounts();
    return { ok: true, emailAccounts: data.email_accounts?.length ?? 0 };
  } catch (e) {
    const msg = String(e);
    const isPlanError = msg.includes("free plan") || msg.includes("API_INACCESSIBLE");
    return { ok: false, error: msg, planRestriction: isPlanError };
  }
}

// ─── NLP Filter Extractor ────────────────────────────────────────────────────

const SENIORITY_MAP: Record<string, string> = {
  ceo: "c_suite", cto: "c_suite", coo: "c_suite", cfo: "c_suite", cpo: "c_suite",
  "c-suite": "c_suite", "c suite": "c_suite", csuite: "c_suite",
  vp: "vp", "vice president": "vp", svp: "vp", evp: "vp",
  director: "director",
  manager: "manager",
  senior: "senior", sr: "senior", lead: "senior",
  founder: "founder", "co-founder": "founder", cofounder: "founder",
  owner: "owner",
  partner: "partner",
  entry: "entry", junior: "entry", jr: "entry",
};

const EMPLOYEE_RANGES: Array<{ keywords: string[]; range: string }> = [
  { keywords: ["1-10", "tiny", "micro"], range: "1,10" },
  { keywords: ["11-50", "very small", "seed"], range: "11,50" },
  { keywords: ["51-200", "small startup", "small company"], range: "51,200" },
  { keywords: ["201-500", "mid", "midsize", "200-500", "startup"], range: "201,500" },
  { keywords: ["501-1000", "medium", "500-1000"], range: "501,1000" },
  { keywords: ["1001-5000", "large", "1000+", "1k+", "enterprise small"], range: "1001,5000" },
  { keywords: ["5001-10000", "big", "5000+"], range: "5001,10000" },
  { keywords: ["10001+", "massive", "huge", "fortune 500", "enterprise"], range: "10001,1000000" },
];

export function parseQueryToFilters(query: string): {
  filters: PeopleSearchFilters;
  isEnrichQuery: boolean;
  enrichInput?: EnrichPersonInput;
} {
  const q = query.toLowerCase();

  const emailMatch = q.match(/\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/);
  const linkedinMatch = q.match(/linkedin\.com\/in\/[\w-]+/i);
  const atPattern = /^(?:find|get|enrich|lookup|who is|search for)?\s*(.+?)\s+(?:at|@|from)\s+(.+?)(?:\s|$)/i.exec(query);

  if (emailMatch || linkedinMatch) {
    return {
      isEnrichQuery: true,
      filters: {},
      enrichInput: {
        email: emailMatch?.[0],
        linkedin_url: linkedinMatch
          ? `https://www.linkedin.com/in/${linkedinMatch[0].split("/in/")[1]}`
          : undefined,
        reveal_personal_emails: true,
      },
    };
  }

  if (atPattern && !q.includes("find me") && !q.includes("show me") && !q.includes("search for")) {
    const [, namePart, companyPart] = atPattern;
    const nameParts = namePart.trim().split(" ");
    return {
      isEnrichQuery: true,
      filters: {},
      enrichInput: {
        first_name: nameParts[0],
        last_name: nameParts.slice(1).join(" ") || undefined,
        organization_name: companyPart.trim(),
        reveal_personal_emails: true,
      },
    };
  }

  const filters: PeopleSearchFilters = {};

  const senioritySet = new Set<string>();
  for (const [kw, val] of Object.entries(SENIORITY_MAP)) {
    if (q.includes(kw)) senioritySet.add(val);
  }
  if (senioritySet.size > 0) filters.person_seniorities = [...senioritySet];

  const ranges: string[] = [];
  for (const { keywords, range } of EMPLOYEE_RANGES) {
    if (keywords.some((k) => q.includes(k))) ranges.push(range);
  }
  if (ranges.length > 0) filters.organization_num_employees_ranges = ranges;

  const cleanQuery = query
    .replace(/\b(find|search|show|get|me|all|some|a few|the)\b/gi, "")
    .replace(/\b(company|companies|startup|enterprise)\b/gi, "")
    .trim();
  if (cleanQuery.length > 2) filters.q_keywords = cleanQuery;

  return { isEnrichQuery: false, filters };
}
