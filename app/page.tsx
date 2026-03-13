"use client";

import { useState, useEffect } from "react";
import { StatusBar } from "./components/StatusBar";
import { ProspectTab } from "./components/ProspectTab";
import { EnrichTab } from "./components/EnrichTab";
import { ChatTab } from "./components/ChatTab";
import { SavedTab } from "./components/SavedTab";
import { OutreachTab } from "./components/OutreachTab";

type Tab = "prospect" | "enrich" | "chat" | "saved" | "outreach";
const VALID_TABS: Tab[] = ["prospect", "enrich", "saved", "chat", "outreach"];

function readTabFromURL(): Tab {
  if (typeof window === "undefined") return "prospect";
  const raw = new URLSearchParams(window.location.search).get("tab") ?? "prospect";
  return (VALID_TABS.includes(raw as Tab) ? raw : "prospect") as Tab;
}

export default function Home() {
  const [tab, setTabState] = useState<Tab>("prospect");

  useEffect(() => {
    setTabState(readTabFromURL());
    const onPop = () => setTabState(readTabFromURL());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function setTab(id: Tab) {
    setTabState(id);
    history.pushState(null, "", `?tab=${id}`);
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-2.5 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-auto px-1.5 rounded bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white text-[10px] font-bold leading-none">ALM</span>
            </div>
            <span className="text-sm font-semibold text-gray-800 tracking-tight">Apollo Lead Management</span>
          </div>

          <nav className="flex items-center gap-0.5">
            {(
              [
                { id: "prospect" as Tab, label: "Prospect" },
                { id: "enrich" as Tab, label: "Enrich" },
                { id: "saved" as Tab, label: "Saved" },
                { id: "outreach" as Tab, label: "Outreach" },
                { id: "chat" as Tab, label: "AI Chat" },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  tab === id
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        <StatusBar />
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden p-4">
        {tab === "prospect" && (
          <div className="h-full bg-white rounded-lg border border-gray-100 shadow-sm p-4">
            <ProspectTab />
          </div>
        )}
        {tab === "enrich" && (
          <div className="h-full overflow-y-auto">
            <EnrichTab />
          </div>
        )}
        {tab === "saved" && (
          <div className="h-full bg-white rounded-lg border border-gray-100 shadow-sm p-4">
            <SavedTab />
          </div>
        )}
        {tab === "outreach" && (
          <div className="h-full overflow-hidden">
            <OutreachTab />
          </div>
        )}
        {tab === "chat" && (
          <div className="h-full overflow-hidden rounded-lg border border-gray-100 shadow-sm bg-white">
            <ChatTab />
          </div>
        )}
      </main>
    </div>
  );
}
