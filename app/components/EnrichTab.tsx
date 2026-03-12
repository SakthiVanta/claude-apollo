"use client";

import { useState } from "react";
import { EnrichModal } from "./EnrichModal";
import { ApolloPerson, ApolloOrg } from "@/lib/apollo";
import { useToast } from "./Toast";

interface EnrichResult { person: ApolloPerson; organization: ApolloOrg | null }
interface FormState {
  first_name: string; last_name: string;
  organization_name: string; domain: string;
  email: string; linkedin_url: string;
}

const EMPTY: FormState = {
  first_name: "", last_name: "", organization_name: "",
  domain: "", email: "", linkedin_url: "",
};

export function EnrichTab() {
  const { success, error: toastError } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EnrichResult | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const hasInput = Object.values(form).some((v) => v.trim().length > 0);

  async function doEnrich() {
    setLoading(true);
    setError(null);
    setShowWarning(false);
    try {
      const body: Record<string, string | boolean> = { reveal_personal_emails: true, save: true };
      if (form.first_name) body.first_name = form.first_name;
      if (form.last_name) body.last_name = form.last_name;
      if (form.organization_name) body.organization_name = form.organization_name;
      if (form.domain) body.domain = form.domain;
      if (form.email) body.email = form.email;
      if (form.linkedin_url) body.linkedin_url = form.linkedin_url;

      const res = await fetch("/api/apollo/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Enrichment failed");
      if (!data.person) throw new Error("Person not found in Apollo");
      setResult(data);
      success("Contact enriched", data.person.name ?? "Contact details retrieved");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toastError("Enrich failed", msg.slice(0, 100));
    } finally {
      setLoading(false);
    }
  }

  function Field({ label, field, placeholder, type = "text" }: {
    label: string; field: keyof FormState; placeholder: string; type?: string;
  }) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
        <input
          type={type}
          placeholder={placeholder}
          value={form[field]}
          onChange={set(field)}
          className="w-full rounded border border-gray-200 px-2.5 py-1.5 text-sm text-gray-800 placeholder-gray-300 focus:border-blue-400 focus:outline-none"
        />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pt-6">
      <div className="bg-white rounded-lg border border-gray-100 p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-800">Enrich a Contact</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Provide any identifiers. Enrichment costs <strong>1 Apollo credit</strong>.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="First Name" field="first_name" placeholder="Jane" />
          <Field label="Last Name" field="last_name" placeholder="Smith" />
        </div>
        <div className="flex flex-col gap-3">
          <Field label="Company Name" field="organization_name" placeholder="Stripe" />
          <Field label="Company Domain" field="domain" placeholder="stripe.com" />
          <Field label="Email" field="email" placeholder="jane@stripe.com" type="email" />
          <Field label="LinkedIn URL" field="linkedin_url" placeholder="linkedin.com/in/janesmith" />
        </div>

        {error && (
          <div className="mt-3 rounded bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => { setForm(EMPTY); setError(null); setResult(null); }}
            className="rounded px-3 py-1.5 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={() => setShowWarning(true)}
            disabled={loading || !hasInput}
            className="flex-1 rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Enriching…" : "Enrich Contact"}
          </button>
        </div>
      </div>

      {/* Credit warning */}
      {showWarning && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]"
          onClick={(e) => e.target === e.currentTarget && setShowWarning(false)}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-yellow-500 text-lg">⚠</span>
              <h3 className="text-sm font-semibold text-gray-800">Confirm Enrichment</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              This will consume <strong>1 Apollo credit</strong> to retrieve email, phone, and contact details.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowWarning(false)}
                className="rounded px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={doEnrich}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Confirm & Enrich
              </button>
            </div>
          </div>
        </div>
      )}

      <EnrichModal result={result} onClose={() => setResult(null)} />
    </div>
  );
}
