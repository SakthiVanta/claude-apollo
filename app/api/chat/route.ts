import { NextRequest } from "next/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, stepCountIs, convertToModelMessages, zodSchema } from "ai";
import { z } from "zod";
import {
  searchPeople,
  enrichPerson,
  bulkMatchPeople,
  searchCompanies,
  enrichOrganization,
  bulkEnrichOrganizations,
  searchContacts,
  createContact,
  updateContact,
  searchSequences,
  addContactsToSequence,
  removeContactsFromSequence,
  listEmailAccounts,
  searchAccounts,
  getUserInfo,
} from "@/lib/apollo";

export const runtime = "nodejs";
export const maxDuration = 60;

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY!,
});

const SYSTEM_PROMPT = `You are an Apollo.io CRM assistant helping a user manage their saved contacts and accounts.

## What works on this FREE plan (confirmed via live API calls):
- search_contacts — search YOUR saved Apollo CRM contacts (FREE, no credits)
- search_accounts — search YOUR saved Apollo company accounts (FREE, no credits)

## What is BLOCKED on free plan (confirmed 403 errors):
- enrich_person / people/match — 403: api/v1/people/match is not accessible with this api_key on a free plan
- bulk_match — same endpoint, same 403
- search_people / mixed_people/search — 403: API_INACCESSIBLE on free plan
- search_companies / mixed_companies/search — 403: API_INACCESSIBLE on free plan
- enrich_organization — blocked on free plan
- list_email_accounts — requires Master API key
- list_sequences / add_to_sequence — requires Master API key

## Guidelines
- The user has 25 contacts saved in their Apollo CRM. Use search_contacts to find them.
- For ANY question about people → call search_contacts immediately
- For ANY question about companies → call search_accounts immediately
- NEVER call enrich_person, bulk_match, search_people, or search_companies — they will all 403
- NEVER ask for permission or warn before searching — just call search_contacts or search_accounts
- If search returns empty, say the contact/account was not found in the user's CRM
- Format results as compact markdown tables
- The user can ask things like: "Show all my contacts", "Find Mathan", "Show contacts at [company]"`;


// ─── Schemas ──────────────────────────────────────────────────────────────────

const seniority = z.enum(["c_suite", "vp", "director", "manager", "senior", "entry", "founder", "owner", "partner"]);

const searchPeopleSchema = z.object({
  person_titles: z.array(z.string()).optional().describe("Job titles e.g. ['VP Engineering']"),
  person_seniorities: z.array(seniority).optional().describe("Seniority levels"),
  q_organization_keyword_tags: z.array(z.string()).optional().describe("Industry/vertical keywords"),
  organization_num_employees_ranges: z.array(z.string()).optional().describe("Employee ranges e.g. ['201,500']"),
  organization_locations: z.array(z.string()).optional().describe("Company locations"),
  person_locations: z.array(z.string()).optional().describe("Person locations"),
  q_organization_domains_list: z.array(z.string()).optional().describe("Specific company domains"),
  q_keywords: z.string().optional().describe("General keyword search"),
  per_page: z.number().min(1).max(50).default(10).optional(),
  page: z.number().min(1).default(1).optional(),
});

const enrichPersonSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  organization_name: z.string().optional().describe("Company name"),
  domain: z.string().optional().describe("Company domain e.g. stripe.com"),
  email: z.string().optional(),
  linkedin_url: z.string().optional(),
});

const bulkMatchSchema = z.object({
  people: z.array(z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    domain: z.string().optional(),
    email: z.string().optional(),
    organization_name: z.string().optional(),
  })).max(10).describe("Up to 10 people to enrich. Each costs 1 credit."),
});

const searchCompaniesSchema = z.object({
  q_organization_keyword_tags: z.array(z.string()).optional(),
  organization_num_employees_ranges: z.array(z.string()).optional(),
  organization_locations: z.array(z.string()).optional(),
  q_keywords: z.string().optional(),
  per_page: z.number().min(1).max(50).default(10).optional(),
  page: z.number().min(1).default(1).optional(),
});

const enrichOrgSchema = z.object({
  domain: z.string().describe("Company domain e.g. stripe.com"),
});

const bulkEnrichOrgsSchema = z.object({
  domains: z.array(z.string()).max(10).describe("Company domains to enrich (max 10)"),
});

const searchContactsSchema = z.object({
  q_keywords: z.string().optional(),
  person_titles: z.array(z.string()).optional(),
  per_page: z.number().min(1).max(50).default(25).optional(),
  page: z.number().min(1).default(1).optional(),
});

const createContactSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().optional(),
  title: z.string().optional(),
  organization_name: z.string().optional(),
  direct_phone: z.string().optional(),
  linkedin_url: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

const updateContactSchema = z.object({
  id: z.string().describe("Contact ID to update"),
  email: z.string().optional(),
  title: z.string().optional(),
  organization_name: z.string().optional(),
  direct_phone: z.string().optional(),
});

const listSequencesSchema = z.object({
  q_name: z.string().optional().describe("Filter by name"),
  active: z.boolean().optional().describe("Filter active sequences only"),
});

const addToSequenceSchema = z.object({
  sequence_id: z.string().describe("The sequence ID"),
  contact_ids: z.array(z.string()).describe("Contact IDs to add"),
  email_account_id: z.string().describe("Email account ID to send from"),
});

const removeFromSequenceSchema = z.object({
  sequence_id: z.string().describe("The sequence ID"),
  contact_ids: z.array(z.string()).describe("Contact IDs to remove"),
});

const searchAccountsSchema = z.object({
  q_keywords: z.string().optional(),
  per_page: z.number().min(1).max(50).default(25).optional(),
  page: z.number().min(1).default(1).optional(),
});

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages, sessionId } = body;
  console.log("[chat] POST received, messages:", messages?.length, "sessionId:", sessionId);

  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: {
      // ── People ──────────────────────────────────────────────────────────────
      search_people: {
        description: "Search for people/leads on Apollo.io. FREE. Returns names, titles, companies (no email).",
        inputSchema: zodSchema(searchPeopleSchema),
        execute: async (params: z.infer<typeof searchPeopleSchema>) => {
          console.log("[tool:search_people] params:", JSON.stringify(params));
          try {
            const res = await searchPeople(params);
            console.log("[tool:search_people] total:", res.pagination?.total_entries);
            return {
              success: true,
              total: res.pagination?.total_entries ?? 0,
              page: res.pagination?.page ?? 1,
              people: res.people?.slice(0, params.per_page ?? 10).map((p) => ({
                id: p.id,
                name: p.name,
                first_name: p.first_name,
                last_name: p.last_name,
                title: p.title,
                seniority: p.seniority,
                company: p.organization?.name,
                domain: p.organization?.primary_domain,
                industry: p.organization?.industry,
                employees: p.organization?.estimated_num_employees,
                location: [p.city, p.country].filter(Boolean).join(", "),
                linkedin_url: p.linkedin_url,
                email_status: p.email_status,
              })),
            };
          } catch (e) {
            const msg = String(e);
            console.error("[tool:search_people] ERROR:", msg);
            const isPlan = msg.includes("free plan") || msg.includes("API_INACCESSIBLE");
            return {
              success: false,
              error: msg,
              plan_restriction: isPlan,
              suggestion: isPlan
                ? "People search requires a paid Apollo plan. Use enrich_person for specific lookups instead."
                : undefined,
            };
          }
        },
      },

      enrich_person: {
        description: "Look up a person by name + company/domain/email/linkedin. Returns email, phone, title, company. Available on free plan (uses 1 credit per lookup).",
        inputSchema: zodSchema(enrichPersonSchema),
        execute: async (params: z.infer<typeof enrichPersonSchema>) => {
          console.log("[tool:enrich_person] params:", JSON.stringify(params));
          try {
            const res = await enrichPerson({ ...params, reveal_personal_emails: true });
            console.log("[tool:enrich_person] found:", !!res.person, "email:", res.person?.email);
            if (!res.person) return { success: false, error: "Person not found" };
            const p = res.person;
            const org = res.organization ?? p.organization;
            return {
              success: true,
              person: {
                id: p.id,
                name: p.name,
                title: p.title,
                email: p.email,
                personal_emails: p.personal_emails,
                phone: p.phone_numbers?.[0]?.raw_number,
                linkedin_url: p.linkedin_url,
                company: org?.name,
                domain: org?.primary_domain,
                industry: org?.industry,
                employees: org?.estimated_num_employees,
                revenue: org?.annual_revenue_printed,
                location: [p.city, p.state, p.country].filter(Boolean).join(", "),
              },
            };
          } catch (e) {
            console.error("[tool:enrich_person] ERROR:", String(e));
            return { success: false, error: String(e) };
          }
        },
      },

      bulk_match: {
        description: "Enrich up to 10 people at once (1 credit each). Always warn user about total credit cost.",
        inputSchema: zodSchema(bulkMatchSchema),
        execute: async ({ people }: z.infer<typeof bulkMatchSchema>) => {
          try {
            const res = await bulkMatchPeople(people);
            return {
              success: true,
              credits_used: people.length,
              matches: res.matches?.map((m) => ({
                found: !!m.person,
                name: m.person?.name,
                email: m.person?.email,
                personal_emails: m.person?.personal_emails,
                phone: m.person?.phone_numbers?.[0]?.raw_number,
                title: m.person?.title,
                company: m.organization?.name ?? m.person?.organization?.name,
              })),
            };
          } catch (e) {
            return { success: false, error: String(e) };
          }
        },
      },

      // ── Companies ────────────────────────────────────────────────────────────
      search_companies: {
        description: "Search for companies on Apollo.io. FREE to call.",
        inputSchema: zodSchema(searchCompaniesSchema),
        execute: async (params: z.infer<typeof searchCompaniesSchema>) => {
          try {
            const res = await searchCompanies(params);
            return {
              success: true,
              total: res.pagination?.total_entries ?? 0,
              companies: res.organizations?.slice(0, params.per_page ?? 10).map((o) => ({
                id: o.id,
                name: o.name,
                domain: o.primary_domain,
                industry: o.industry,
                employees: o.estimated_num_employees,
                revenue: o.annual_revenue_printed,
                funding: o.total_funding_printed,
                website: o.website_url,
              })),
            };
          } catch (e) {
            return { success: false, error: String(e) };
          }
        },
      },

      enrich_organization: {
        description: "Get deep company intel by domain (technology stack, funding, description). Costs credits.",
        inputSchema: zodSchema(enrichOrgSchema),
        execute: async ({ domain }: z.infer<typeof enrichOrgSchema>) => {
          try {
            const res = await enrichOrganization(domain);
            const o = res.organization;
            if (!o) return { success: false, error: "Company not found" };
            return {
              success: true,
              company: {
                name: o.name,
                domain: o.primary_domain,
                industry: o.industry,
                employees: o.estimated_num_employees,
                revenue: o.annual_revenue_printed,
                funding: o.total_funding_printed,
                latest_stage: o.latest_funding_stage,
                founded_year: o.founded_year,
                description: o.description,
                technologies: o.technology_names?.slice(0, 10),
                keywords: o.keywords?.slice(0, 10),
                linkedin: o.linkedin_url,
                website: o.website_url,
              },
            };
          } catch (e) {
            return { success: false, error: String(e) };
          }
        },
      },

      bulk_enrich_orgs: {
        description: "Enrich up to 10 companies by domain at once.",
        inputSchema: zodSchema(bulkEnrichOrgsSchema),
        execute: async ({ domains }: z.infer<typeof bulkEnrichOrgsSchema>) => {
          try {
            const res = await bulkEnrichOrganizations(domains);
            return {
              success: true,
              organizations: res.organizations?.map((o) => ({
                name: o.name,
                domain: o.primary_domain,
                industry: o.industry,
                employees: o.estimated_num_employees,
                revenue: o.annual_revenue_printed,
                funding: o.total_funding_printed,
              })),
            };
          } catch (e) {
            return { success: false, error: String(e) };
          }
        },
      },

      // ── Contacts ─────────────────────────────────────────────────────────────
      search_contacts: {
        description: "Search your saved Apollo CRM contacts. FREE.",
        inputSchema: zodSchema(searchContactsSchema),
        execute: async (params: z.infer<typeof searchContactsSchema>) => {
          try {
            const res = await searchContacts(params);
            const contacts = (res.people ?? res.contacts ?? []);
            return {
              success: true,
              total: res.pagination?.total_entries ?? 0,
              contacts: contacts.slice(0, params.per_page ?? 25).map((c) => ({
                id: c.id,
                name: c.name,
                email: c.email,
                title: c.title,
                company: c.organization?.name,
                location: [c.city, c.country].filter(Boolean).join(", "),
              })),
            };
          } catch (e) {
            return { success: false, error: String(e) };
          }
        },
      },

      create_contact: {
        description: "Save a lead as a contact in your Apollo CRM.",
        inputSchema: zodSchema(createContactSchema),
        execute: async (params: z.infer<typeof createContactSchema>) => {
          try {
            const res = await createContact(params);
            return { success: true, contact_id: res.contact?.id, name: res.contact?.name };
          } catch (e) {
            return { success: false, error: String(e) };
          }
        },
      },

      update_contact: {
        description: "Update a saved Apollo contact by ID.",
        inputSchema: zodSchema(updateContactSchema),
        execute: async ({ id, ...params }: z.infer<typeof updateContactSchema>) => {
          try {
            const res = await updateContact(id, params);
            return { success: true, contact_id: res.contact?.id };
          } catch (e) {
            return { success: false, error: String(e) };
          }
        },
      },

      // ── Sequences ────────────────────────────────────────────────────────────
      list_sequences: {
        description: "List available email outreach sequences.",
        inputSchema: zodSchema(listSequencesSchema),
        execute: async (params: z.infer<typeof listSequencesSchema>) => {
          try {
            const res = await searchSequences(params);
            return {
              success: true,
              sequences: res.emailer_campaigns?.map((s) => ({
                id: s.id,
                name: s.name,
                active: s.active,
                steps: s.num_steps,
              })),
            };
          } catch (e) {
            return { success: false, error: String(e) };
          }
        },
      },

      add_to_sequence: {
        description: "Enroll Apollo contacts into an outreach sequence.",
        inputSchema: zodSchema(addToSequenceSchema),
        execute: async ({ sequence_id, contact_ids, email_account_id }: z.infer<typeof addToSequenceSchema>) => {
          try {
            const res = await addContactsToSequence(sequence_id, contact_ids, email_account_id);
            return { success: true, enrolled: res.contacts?.length ?? 0 };
          } catch (e) {
            return { success: false, error: String(e) };
          }
        },
      },

      remove_from_sequence: {
        description: "Remove contacts from an outreach sequence.",
        inputSchema: zodSchema(removeFromSequenceSchema),
        execute: async ({ sequence_id, contact_ids }: z.infer<typeof removeFromSequenceSchema>) => {
          try {
            await removeContactsFromSequence(sequence_id, contact_ids);
            return { success: true, removed: contact_ids.length };
          } catch (e) {
            return { success: false, error: String(e) };
          }
        },
      },

      list_email_accounts: {
        description: "List linked email accounts available for sending outreach.",
        inputSchema: zodSchema(z.object({})),
        execute: async () => {
          try {
            const res = await listEmailAccounts();
            return {
              success: true,
              accounts: res.email_accounts?.map((a) => ({
                id: a.id,
                email: a.email,
                active: a.active,
                default: a.default,
              })),
            };
          } catch (e) {
            return { success: false, error: String(e) };
          }
        },
      },

      // ── Accounts ─────────────────────────────────────────────────────────────
      search_accounts: {
        description: "Search saved company accounts in your Apollo CRM.",
        inputSchema: zodSchema(searchAccountsSchema),
        execute: async (params: z.infer<typeof searchAccountsSchema>) => {
          try {
            const res = await searchAccounts(params);
            return {
              success: true,
              total: res.pagination?.total_entries ?? 0,
              accounts: res.accounts?.slice(0, params.per_page ?? 25).map((a) => ({
                id: a.id,
                name: a.name,
                domain: a.domain,
                industry: a.industry,
                employees: a.estimated_num_employees,
                location: [a.city, a.country].filter(Boolean).join(", "),
              })),
            };
          } catch (e) {
            return { success: false, error: String(e) };
          }
        },
      },

      // ── User Info ────────────────────────────────────────────────────────────
      get_user_info: {
        description: "Show Apollo API plan capabilities — what is free vs paid.",
        inputSchema: zodSchema(z.object({})),
        execute: async () => {
          // Try to get user list; if it fails (free plan may block), return static plan info
          let users: { email: string; name: string }[] = [];
          try {
            const res = await getUserInfo();
            users = res.users?.slice(0, 5).map((u) => ({ email: u.email, name: u.name })) ?? [];
          } catch {
            // GET /users may not work on all plans — that's fine
          }
          return {
            success: true,
            users,
            free_plan: {
              available: [
                "search_contacts — search your saved CRM contacts (FREE)",
                "search_accounts — search your saved company accounts (FREE)",
              ],
              blocked_403: [
                "enrich_person / people/match — 403 on free plan",
                "bulk_match — 403 on free plan",
                "search_people / mixed_people/search — 403 on free plan",
                "search_companies / mixed_companies/search — 403 on free plan",
                "enrich_organization — 403 on free plan",
                "list_email_accounts — requires Master API key",
                "list_sequences — requires Master API key",
              ],
            },
          };
        },
      },
    },
    stopWhen: stepCountIs(8),
    onError: (err: unknown) => {
      console.error("[chat] streamText error:", err);
    },
    onFinish: async ({ text }: { text: string }) => {
      console.log("[chat] onFinish, text length:", text?.length);
      if (sessionId) {
        try {
          const { default: prisma } = await import("@/lib/prisma");
          const lastUserMsg = messages?.[messages.length - 1];
          const userText =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            lastUserMsg?.parts?.find((p: any) => p.type === "text")?.text ??
            lastUserMsg?.content ??
            "";
          await prisma.chatMessage.createMany({
            data: [
              { sessionId, role: "user", content: String(userText) },
              { sessionId, role: "assistant", content: text },
            ],
          });
        } catch {
          // non-critical, don't fail the response
        }
      }
    },
  });

  console.log("[chat] streamText created, returning UI message stream");
  return result.toUIMessageStreamResponse();
}
