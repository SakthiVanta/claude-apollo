"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "./Toast";

const EMPTY_FORM = {
  firstName: "", lastName: "", email: "", phone: "",
  title: "", companyName: "", companyDomain: "", linkedinUrl: "",
  city: "", state: "", country: "",
};
type LeadForm = typeof EMPTY_FORM;

function AddLeadModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { success, error: toastError } = useToast();
  const [form, setForm] = useState<LeadForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof LeadForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      success("Lead saved", [form.firstName, form.lastName].filter(Boolean).join(" ") || "New lead added");
      onSaved();
      onClose();
    } catch (e) {
      toastError("Save failed", e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  function Field({ label, field, placeholder, type = "text" }: {
    label: string; field: keyof LeadForm; placeholder: string; type?: string;
  }) {
    return (
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-0.5">{label}</label>
        <input
          type={type}
          placeholder={placeholder}
          value={form[field]}
          onChange={set(field)}
          className="w-full rounded border border-gray-200 px-2.5 py-1.5 text-xs text-gray-800 placeholder-gray-300 focus:border-blue-400 focus:outline-none"
        />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800">Add Lead</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <div className="grid grid-cols-2 gap-2.5 mb-2.5">
          <Field label="First Name" field="firstName" placeholder="Jane" />
          <Field label="Last Name" field="lastName" placeholder="Smith" />
        </div>
        <div className="grid grid-cols-2 gap-2.5 mb-2.5">
          <Field label="Email" field="email" placeholder="jane@stripe.com" type="email" />
          <Field label="Phone" field="phone" placeholder="+1 555 000 0000" />
        </div>
        <div className="grid grid-cols-2 gap-2.5 mb-2.5">
          <Field label="Job Title" field="title" placeholder="VP of Engineering" />
          <Field label="Company" field="companyName" placeholder="Stripe" />
        </div>
        <div className="grid grid-cols-2 gap-2.5 mb-2.5">
          <Field label="Domain" field="companyDomain" placeholder="stripe.com" />
          <Field label="LinkedIn URL" field="linkedinUrl" placeholder="linkedin.com/in/…" />
        </div>
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          <Field label="City" field="city" placeholder="New York" />
          <Field label="State" field="state" placeholder="NY" />
          <Field label="Country" field="country" placeholder="US" />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface Lead {
  id: string;
  apolloId: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  personalEmail: string | null;
  phone: string | null;
  title: string | null;
  seniority: string | null;
  companyName: string | null;
  companyDomain: string | null;
  industry: string | null;
  employees: number | null;
  linkedinUrl: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  enriched: boolean;
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export function SavedTab() {
  const { success, error: toastError } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [filterEnriched, setFilterEnriched] = useState<"" | "true" | "false">("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async (p = 1, query = q, enrichedFilter = filterEnriched) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: "25" });
      if (query) params.set("q", query);
      if (enrichedFilter) params.set("enriched", enrichedFilter);
      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      setLeads(data.leads ?? []);
      setPagination(data.pagination);
      setPage(p);
      setSelected(new Set());
    } catch {
      toastError("Load failed", "Could not fetch saved leads");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(1); }, [load]);

  async function syncFromApollo() {
    setSyncing(true);
    try {
      // Fetch all pages of Apollo CRM contacts
      let page = 1;
      let imported = 0;
      let skipped = 0;
      while (true) {
        const res = await fetch(`/api/apollo/contacts?page=${page}&per_page=25`);
        const data = await res.json();
        const contacts: Array<{
          id?: string; first_name?: string | null; last_name?: string | null;
          name?: string | null; email?: string | null; title?: string | null;
          organization_name?: string | null; linkedin_url?: string | null;
          phone?: string | null; mobile_phone?: string | null;
          city?: string | null; state?: string | null; country?: string | null;
          organization?: { primary_domain?: string | null; name?: string | null } | null;
        }> = data.people ?? data.contacts ?? [];
        if (contacts.length === 0) break;

        // Save each contact to local DB via POST /api/leads
        for (const c of contacts) {
          const nameParts = (c.name ?? "").split(" ");
          const saveRes = await fetch("/api/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              firstName: c.first_name ?? nameParts[0] ?? null,
              lastName: (c.last_name ?? nameParts.slice(1).join(" ")) || null,
              email: c.email ?? null,
              phone: c.phone ?? c.mobile_phone ?? null,
              title: c.title ?? null,
              companyName: c.organization_name ?? c.organization?.name ?? null,
              companyDomain: c.organization?.primary_domain ?? null,
              linkedinUrl: c.linkedin_url ?? null,
              city: c.city ?? null,
              state: c.state ?? null,
              country: c.country ?? null,
            }),
          });
          if (saveRes.ok) imported++;
          else skipped++;
        }

        const pagination = data.pagination;
        if (!pagination || page >= pagination.total_pages) break;
        page++;
      }
      success("Apollo sync complete", `Imported ${imported} contacts${skipped > 0 ? `, skipped ${skipped} duplicates` : ""}`);
      load(1);
    } catch (e) {
      toastError("Sync failed", e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      });
      const data = await res.json();
      success("Deleted", `Removed ${data.deleted} lead${data.deleted !== 1 ? "s" : ""}`);
      load(page);
    } catch {
      toastError("Delete failed", "Could not delete selected leads");
    } finally {
      setDeleting(false);
    }
  }

  function toggleAll() {
    if (selected.size === leads.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(leads.map((l) => l.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const total = pagination?.total ?? 0;
  const totalPages = pagination?.total_pages ?? 1;

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <input
          type="text"
          placeholder="Search name, email, company…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(1, q, filterEnriched)}
          className="flex-1 max-w-xs rounded border border-gray-200 px-2.5 py-1.5 text-sm text-gray-800 placeholder-gray-300 focus:border-blue-400 focus:outline-none"
        />
        <select
          value={filterEnriched}
          onChange={(e) => {
            const v = e.target.value as "" | "true" | "false";
            setFilterEnriched(v);
            load(1, q, v);
          }}
          className="rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-600 focus:border-blue-400 focus:outline-none bg-white"
        >
          <option value="">All</option>
          <option value="true">Enriched</option>
          <option value="false">Not enriched</option>
        </select>
        <button
          onClick={() => load(1, q, filterEnriched)}
          className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Search
        </button>
        {selected.size > 0 && (
          <button
            onClick={deleteSelected}
            disabled={deleting}
            className="rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            {deleting ? "Deleting…" : `Delete ${selected.size}`}
          </button>
        )}
        <button
          onClick={syncFromApollo}
          disabled={syncing}
          className="ml-auto rounded border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          {syncing ? (
            <><span className="h-3 w-3 rounded-full border border-blue-400 border-t-transparent animate-spin" /> Syncing…</>
          ) : (
            <><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Sync Apollo</>
          )}
        </button>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors flex items-center gap-1"
        >
          <span className="text-base leading-none">+</span> Add Lead
        </button>
        <span className="text-xs text-gray-400">
          {total.toLocaleString()} saved lead{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto rounded border border-gray-100">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-sm text-gray-400">Loading…</div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <p className="text-sm text-gray-400">No saved leads yet.</p>
            <p className="text-xs text-gray-300">Enrich contacts or run searches to save leads here.</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-3 py-2 w-8">
                  <input
                    type="checkbox"
                    checked={selected.size === leads.length && leads.length > 0}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">Name</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">Title</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">Company</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">Email</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">Phone</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">Location</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">Status</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">Saved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.map((lead) => {
                const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "—";
                const location = [lead.city, lead.state, lead.country].filter(Boolean).join(", ");
                const email = lead.email ?? lead.personalEmail;
                return (
                  <tr key={lead.id} className={`hover:bg-gray-50 ${selected.has(lead.id) ? "bg-blue-50/40" : ""}`}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(lead.id)}
                        onChange={() => toggleOne(lead.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">
                      {lead.linkedinUrl ? (
                        <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer"
                          className="hover:text-blue-600 hover:underline">
                          {name}
                        </a>
                      ) : name}
                    </td>
                    <td className="px-3 py-2 text-gray-600 max-w-[160px] truncate" title={lead.title ?? ""}>
                      {lead.title ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                      {lead.companyDomain ? (
                        <a href={`https://${lead.companyDomain}`} target="_blank" rel="noopener noreferrer"
                          className="hover:text-blue-600 hover:underline">
                          {lead.companyName ?? lead.companyDomain}
                        </a>
                      ) : (lead.companyName ?? "—")}
                    </td>
                    <td className="px-3 py-2">
                      {email ? (
                        <a href={`mailto:${email}`} className="text-blue-600 hover:underline">
                          {email}
                        </a>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{lead.phone ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{location || "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        lead.enriched
                          ? "bg-green-50 text-green-600 border border-green-100"
                          : "bg-gray-50 text-gray-400 border border-gray-100"
                      }`}>
                        {lead.enriched ? "Enriched" : "Basic"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {showAdd && (
        <AddLeadModal onClose={() => setShowAdd(false)} onSaved={() => load(1, q, filterEnriched)} />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => load(page - 1, q, filterEnriched)}
            disabled={page <= 1 || loading}
            className="rounded px-3 py-1.5 text-xs text-gray-500 border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => load(page + 1, q, filterEnriched)}
            disabled={page >= totalPages || loading}
            className="rounded px-3 py-1.5 text-xs text-gray-500 border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
