"use client";

import { useState } from "react";
import { StatusBar } from "./components/StatusBar";
import { ProspectTab } from "./components/ProspectTab";
import { EnrichTab } from "./components/EnrichTab";
import { ChatTab } from "./components/ChatTab";
import { SavedTab } from "./components/SavedTab";

type Tab = "prospect" | "enrich" | "chat" | "saved";

export default function Home() {
  const [tab, setTab] = useState<Tab>("prospect");

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-2.5 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold leading-none">A</span>
            </div>
            <span className="text-sm font-semibold text-gray-800 tracking-tight">Apollo Prospector</span>
          </div>

          <nav className="flex items-center gap-0.5">
            {(
              [
                { id: "prospect" as Tab, label: "Prospect" },
                { id: "enrich" as Tab, label: "Enrich" },
                { id: "saved" as Tab, label: "Saved" },
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
        {tab === "chat" && (
          <div className="h-full overflow-hidden rounded-lg border border-gray-100 shadow-sm bg-white">
            <ChatTab />
          </div>
        )}
      </main>
    </div>
  );
}
