"use client";

import { useEffect } from "react";
import { ApolloPerson, ApolloOrg } from "@/lib/apollo";

interface EnrichResult {
  person: ApolloPerson;
  organization: ApolloOrg | null;
}

interface Props {
  result: EnrichResult | null;
  onClose: () => void;
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-1.5 border-b border-gray-50 last:border-0">
      <span className="w-28 flex-shrink-0 text-xs text-gray-400">{label}</span>
      <span className="text-sm text-gray-700 break-all">{value}</span>
    </div>
  );
}

export function EnrichModal({ result, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!result) return null;

  const { person: p, organization: org } = result;
  const o = org ?? p.organization;
  const phone = p.phone_numbers?.[0]?.raw_number;
  const location = [p.city, p.state, p.country].filter(Boolean).join(", ");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-300 flex items-center justify-center text-sm font-semibold text-blue-700">
              {p.first_name?.[0] ?? "?"}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">{p.name}</h2>
              <p className="text-xs text-gray-400">{p.title}{o?.name ? ` · ${o.name}` : ""}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-lg leading-none">×</button>
        </div>

        {/* Contact */}
        <div className="px-5 py-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Contact</p>
          <Row label="Work email" value={p.email} />
          {p.personal_emails?.map((e, i) => (
            <Row key={i} label={i === 0 ? "Personal email" : ""} value={e} />
          ))}
          <Row label="Phone" value={phone} />
          <Row label="LinkedIn" value={p.linkedin_url} />
          <Row label="Location" value={location} />
        </div>

        {/* Company */}
        {o && (
          <div className="px-5 py-3 border-t border-gray-50">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Company</p>
            <Row label="Name" value={o.name} />
            <Row label="Domain" value={o.primary_domain} />
            <Row label="Industry" value={o.industry} />
            <Row label="Employees" value={o.estimated_num_employees?.toLocaleString()} />
            <Row label="Revenue" value={o.annual_revenue_printed} />
            <Row label="Funding" value={o.total_funding_printed} />
          </div>
        )}

        <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
