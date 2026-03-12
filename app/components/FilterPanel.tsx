"use client";

import { useState } from "react";

export interface Filters {
  person_titles: string;
  person_seniorities: string[];
  q_organization_keyword_tags: string;
  organization_num_employees_ranges: string[];
  organization_locations: string;
  q_keywords: string;
  per_page: number;
}

export const EMPTY_FILTERS: Filters = {
  person_titles: "",
  person_seniorities: [],
  q_organization_keyword_tags: "",
  organization_num_employees_ranges: [],
  organization_locations: "",
  q_keywords: "",
  per_page: 25,
};

const SENIORITIES = [
  { value: "c_suite", label: "C-Suite" },
  { value: "vp", label: "VP" },
  { value: "director", label: "Director" },
  { value: "manager", label: "Manager" },
  { value: "senior", label: "Senior" },
  { value: "entry", label: "Entry" },
  { value: "founder", label: "Founder" },
  { value: "owner", label: "Owner" },
  { value: "partner", label: "Partner" },
];

const EMP_RANGES = [
  { value: "1,10", label: "1–10" },
  { value: "11,50", label: "11–50" },
  { value: "51,200", label: "51–200" },
  { value: "201,500", label: "201–500" },
  { value: "501,1000", label: "501–1K" },
  { value: "1001,5000", label: "1K–5K" },
  { value: "5001,10000", label: "5K–10K" },
  { value: "10001,1000000", label: "10K+" },
];

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  onSearch: () => void;
  loading: boolean;
}

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

export function FilterPanel({ filters, onChange, onSearch, loading }: Props) {
  const set = (key: keyof Filters, value: unknown) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-col gap-4">
      {/* Keywords */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Keywords</label>
        <input
          type="text"
          placeholder="e.g. SaaS, B2B sales"
          value={filters.q_keywords}
          onChange={(e) => set("q_keywords", e.target.value)}
          className="w-full rounded border border-gray-200 px-2.5 py-1.5 text-sm text-gray-800 placeholder-gray-300 focus:border-blue-400 focus:outline-none"
        />
      </div>

      {/* Job Title */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Job Title</label>
        <input
          type="text"
          placeholder="e.g. VP of Engineering"
          value={filters.person_titles}
          onChange={(e) => set("person_titles", e.target.value)}
          className="w-full rounded border border-gray-200 px-2.5 py-1.5 text-sm text-gray-800 placeholder-gray-300 focus:border-blue-400 focus:outline-none"
        />
      </div>

      {/* Industry */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Industry</label>
        <input
          type="text"
          placeholder="e.g. fintech, healthcare"
          value={filters.q_organization_keyword_tags}
          onChange={(e) => set("q_organization_keyword_tags", e.target.value)}
          className="w-full rounded border border-gray-200 px-2.5 py-1.5 text-sm text-gray-800 placeholder-gray-300 focus:border-blue-400 focus:outline-none"
        />
      </div>

      {/* Location */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
        <input
          type="text"
          placeholder="e.g. United States, London"
          value={filters.organization_locations}
          onChange={(e) => set("organization_locations", e.target.value)}
          className="w-full rounded border border-gray-200 px-2.5 py-1.5 text-sm text-gray-800 placeholder-gray-300 focus:border-blue-400 focus:outline-none"
        />
      </div>

      {/* Seniority */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Seniority</label>
        <div className="flex flex-wrap gap-1">
          {SENIORITIES.map(({ value, label }) => {
            const active = filters.person_seniorities.includes(value);
            return (
              <button
                key={value}
                onClick={() => set("person_seniorities", toggle(filters.person_seniorities, value))}
                className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                    : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-gray-300"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Company Size */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Company Size</label>
        <div className="flex flex-wrap gap-1">
          {EMP_RANGES.map(({ value, label }) => {
            const active = filters.organization_num_employees_ranges.includes(value);
            return (
              <button
                key={value}
                onClick={() =>
                  set("organization_num_employees_ranges", toggle(filters.organization_num_employees_ranges, value))
                }
                className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                    : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-gray-300"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results per page */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Results</label>
        <select
          value={filters.per_page}
          onChange={(e) => set("per_page", Number(e.target.value))}
          className="w-full rounded border border-gray-200 px-2.5 py-1.5 text-sm text-gray-800 focus:border-blue-400 focus:outline-none"
        >
          {[10, 25, 50].map((n) => (
            <option key={n} value={n}>{n} per page</option>
          ))}
        </select>
      </div>

      <button
        onClick={onSearch}
        disabled={loading}
        className="mt-1 w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Searching…" : "Search"}
      </button>
    </div>
  );
}
