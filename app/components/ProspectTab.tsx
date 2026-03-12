"use client";

import { useState } from "react";
import { FilterPanel, Filters, EMPTY_FILTERS } from "./FilterPanel";
import { LeadsTable } from "./LeadsTable";
import { EnrichModal } from "./EnrichModal";
import { ApolloPerson } from "@/lib/apollo";
import { useToast } from "./Toast";

interface SearchResult {
  people: ApolloPerson[];
  pagination: { total_entries: number; page: number; per_page: number; total_pages: number };
}

interface EnrichResult {
  person: ApolloPerson;
  organization: import("@/lib/apollo").ApolloOrg | null;
}

export function ProspectTab() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const { success, error: toastError, warning } = useToast();
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planRestriction, setPlanRestriction] = useState(false);
  const [page, setPage] = useState(1);
  const [enriching, setEnriching] = useState<string | null>(null);
  const [enrichResult, setEnrichResult] = useState<EnrichResult | null>(null);
  const [creditWarning, setCreditWarning] = useState<ApolloPerson | null>(null);

  async function search(p = 1) {
    setLoading(true);
    setError(null);
    setPlanRestriction(false);
    setPage(p);

    const body: Record<string, unknown> = { page: p, per_page: filters.per_page, save: true };
    if (filters.q_keywords) body.q_keywords = filters.q_keywords;
    if (filters.person_titles) body.person_titles = [filters.person_titles];
    if (filters.q_organization_keyword_tags)
      body.q_organization_keyword_tags = filters.q_organization_keyword_tags.split(",").map((s) => s.trim());
    if (filters.organization_locations)
      body.organization_locations = [filters.organization_locations];
    if (filters.person_seniorities.length > 0) body.person_seniorities = filters.person_seniorities;
    if (filters.organization_num_employees_ranges.length > 0)
      body.organization_num_employees_ranges = filters.organization_num_employees_ranges;

    try {
      const res = await fetch("/api/apollo/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.planRestriction) setPlanRestriction(true);
        throw new Error(data.error ?? "Search failed");
      }
      setResult(data);
      const total = data.pagination?.total_entries ?? 0;
      success("Search complete", `Found ${total.toLocaleString()} result${total !== 1 ? "s" : ""}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      if (planRestriction) {
        warning("Free plan restriction", "Bulk search requires a paid Apollo plan.");
      } else {
        toastError("Search failed", msg.slice(0, 100));
      }
    } finally {
      setLoading(false);
    }
  }

  async function doEnrich(person: ApolloPerson) {
    setEnriching(person.id);
    setCreditWarning(null);
    try {
      const body: Record<string, unknown> = {
        first_name: person.first_name,
        last_name: person.last_name,
        save: true,
      };
      if (person.organization?.primary_domain) body.domain = person.organization.primary_domain;
      else if (person.organization?.name) body.organization_name = person.organization.name;
      if (person.linkedin_url) body.linkedin_url = person.linkedin_url;

      const res = await fetch("/api/apollo/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Enrich failed");
      if (data.person) {
        setEnrichResult(data as EnrichResult);
        success("Contact enriched", data.person.name ?? "Contact details retrieved");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toastError("Enrich failed", msg.slice(0, 100));
    } finally {
      setEnriching(null);
    }
  }

  return (
    <div className="flex h-full gap-4">
      {/* Filter sidebar */}
      <aside className="w-56 flex-shrink-0 overflow-y-auto">
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          onSearch={() => search(1)}
          loading={loading}
        />
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {error && (
          <div className={`mb-3 rounded border px-3 py-2.5 text-sm flex items-start justify-between gap-3 ${
            planRestriction
              ? "bg-yellow-50 border-yellow-200 text-yellow-800"
              : "bg-red-50 border-red-100 text-red-600"
          }`}>
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{planRestriction ? "Apollo Free Plan Restriction" : "Search Error"}</span>
              <span className="text-xs opacity-80">{error}</span>
              {planRestriction && (
                <span className="text-xs mt-1">
                  Bulk people search requires a paid Apollo plan.{" "}
                  <strong>Use the Enrich tab</strong> to look up individuals, or{" "}
                  <strong>AI Chat</strong> to describe your ICP.
                </span>
              )}
            </div>
            <button
              onClick={() => { setError(null); setPlanRestriction(false); }}
              className="shrink-0 text-current opacity-50 hover:opacity-80"
            >
              ×
            </button>
          </div>
        )}

        <LeadsTable
          people={result?.people ?? []}
          total={result?.pagination?.total_entries ?? 0}
          page={page}
          perPage={filters.per_page}
          onPageChange={(p) => search(p)}
          onEnrich={(person) => setCreditWarning(person)}
          enriching={enriching}
        />
      </main>

      {/* Credit warning modal */}
      {creditWarning && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]"
          onClick={(e) => e.target === e.currentTarget && setCreditWarning(null)}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-yellow-500 text-lg">⚠</span>
              <h3 className="text-sm font-semibold text-gray-800">Enrich Contact</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Enriching <strong>{creditWarning.name}</strong> will consume{" "}
              <strong>1 Apollo credit</strong> to reveal their email and phone number.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setCreditWarning(null)}
                className="rounded px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { doEnrich(creditWarning); setCreditWarning(null); }}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Confirm & Enrich
              </button>
            </div>
          </div>
        </div>
      )}

      <EnrichModal result={enrichResult} onClose={() => setEnrichResult(null)} />
    </div>
  );
}
