"use client";

import { useEffect, useRef, useState } from "react";

interface Status {
  ok: boolean;
  emailAccounts?: number;
  freeFeatures?: string[];
  paidFeatures?: string[];
  error?: string;
  planRestriction?: boolean;
}

export function StatusBar() {
  const [status, setStatus] = useState<Status | null>(null);
  const [checking, setChecking] = useState(true);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function check() {
    setChecking(true);
    try {
      const res = await fetch("/api/apollo/status");
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ ok: false, error: "Network error" });
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => { check(); }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative flex items-center gap-2 text-xs" ref={ref}>
      {checking ? (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-gray-300 animate-pulse" />
          <span className="text-gray-400">Checking Apollo…</span>
        </>
      ) : status?.ok ? (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          <span className="text-green-600 font-medium">Apollo Connected</span>
          <button
            onClick={() => setOpen((v) => !v)}
            className="h-4 w-4 rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 flex items-center justify-center transition-colors"
            title="API plan features"
          >
            i
          </button>
        </>
      ) : (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          <span className="text-red-600 font-medium">Apollo Disconnected</span>
          <button
            onClick={check}
            className="ml-1 text-gray-400 underline hover:text-gray-600"
          >
            Retry
          </button>
        </>
      )}

      {/* Features popover */}
      {open && status?.ok && (
        <div className="absolute right-0 top-7 z-50 w-64 rounded-lg border border-gray-100 bg-white shadow-lg p-3">
          <p className="text-xs font-semibold text-gray-700 mb-2">Apollo API Plan</p>
          {status.freeFeatures && status.freeFeatures.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] font-medium text-green-600 uppercase tracking-wide mb-1">Free</p>
              <ul className="space-y-0.5">
                {status.freeFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-[11px] text-gray-600">
                    <span className="text-green-500 shrink-0 mt-px">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {status.paidFeatures && status.paidFeatures.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-yellow-600 uppercase tracking-wide mb-1">Paid only</p>
              <ul className="space-y-0.5">
                {status.paidFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-[11px] text-gray-400">
                    <span className="shrink-0 mt-px">—</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {typeof status.emailAccounts === "number" && (
            <p className="text-[11px] text-gray-400 mt-2 pt-2 border-t border-gray-50">
              {status.emailAccounts} email account{status.emailAccounts !== 1 ? "s" : ""} linked
            </p>
          )}
        </div>
      )}
    </div>
  );
}
