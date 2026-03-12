"use client";

import { ApolloPerson } from "@/lib/apollo";

interface Props {
  people: ApolloPerson[];
  total: number;
  page: number;
  perPage: number;
  onPageChange: (p: number) => void;
  onEnrich: (person: ApolloPerson) => void;
  enriching: string | null;
}

export function LeadsTable({ people, total, page, perPage, onPageChange, onEnrich, enriching }: Props) {
  const totalPages = Math.ceil(total / perPage);

  if (people.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <svg className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
        </svg>
        <p className="text-sm">No results. Apply filters and search.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Count */}
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-xs text-gray-400">
          {total.toLocaleString()} result{total !== 1 ? "s" : ""}
          {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1 rounded border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 whitespace-nowrap">Name</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 whitespace-nowrap">Title</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 whitespace-nowrap">Company</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 whitespace-nowrap">Location</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 whitespace-nowrap">Email</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 whitespace-nowrap w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {people.map((p) => {
              const location = [p.city, p.country].filter(Boolean).join(", ");
              const isEnriching = enriching === p.id;
              return (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-xs font-medium text-blue-600 flex-shrink-0">
                        {p.first_name?.[0] ?? "?"}
                      </div>
                      <span className="font-medium text-gray-800">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 max-w-[160px] truncate">{p.title ?? "—"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-gray-700">{p.organization?.name ?? "—"}</span>
                      {p.organization?.industry && (
                        <span className="text-xs text-gray-400">{p.organization.industry}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{location || "—"}</td>
                  <td className="px-3 py-2.5">
                    {p.email ? (
                      <span className="text-green-600 text-xs">{p.email}</span>
                    ) : (
                      <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-400">
                        hidden
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => onEnrich(p)}
                      disabled={!!enriching}
                      className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 disabled:opacity-40 transition-colors border border-transparent hover:border-blue-200"
                    >
                      {isEnriching ? "…" : "Enrich"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-1 pt-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30"
          >
            ← Prev
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`rounded px-2 py-1 text-xs ${p === page ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
