"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "./Toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lead {
  id: string; firstName: string | null; lastName: string | null; email: string | null;
  phone: string | null; title: string | null; companyName: string | null;
  companyDomain: string | null; linkedinUrl: string | null; city: string | null;
  state: string | null; country: string | null; seniority: string | null;
  industry: string | null; enriched: boolean;
}

interface Meeting {
  id: string; summary: string; start: string; end: string;
  meetLink: string | null; attendees: { email: string; name?: string }[];
}

type OutreachAction = "research" | "messaging" | "prep" | "email";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fullName = (l: Lead) => [l.firstName, l.lastName].filter(Boolean).join(" ") || "Unknown";
const initials = (l: Lead) => [l.firstName?.[0], l.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "?";
function avatarColor(name: string) {
  const colors = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-pink-500", "bg-teal-500"];
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return colors[h % colors.length];
}


function formatDate(raw: string) {
  try { return new Date(raw).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
  catch { return raw; }
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function MarkdownBlock({ text }: { text: string }) {
  return (
    <div className="space-y-0.5">
      {text.split("\n").map((line, i) => {
        if (line.startsWith("## ")) return <h2 key={i} className="text-sm font-semibold text-gray-800 mt-4 mb-1.5">{line.slice(3)}</h2>;
        if (/^\*\*[^*]+\*\*$/.test(line)) return <p key={i} className="text-xs font-semibold text-gray-700 mt-2 mb-0.5">{line.slice(2, -2)}</p>;
        if (/^\*\*[^*]+\*\*/.test(line)) {
          const parts = line.split(/(\*\*[^*]+\*\*)/g);
          return <p key={i} className="text-xs text-gray-700 leading-relaxed">{parts.map((p, j) => p.startsWith("**") && p.endsWith("**") ? <strong key={j} className="font-semibold text-gray-800">{p.slice(2, -2)}</strong> : p)}</p>;
        }
        if (line.startsWith("- ")) return <li key={i} className="text-xs text-gray-700 ml-3 list-disc leading-relaxed">{line.slice(2)}</li>;
        if (/^\d+\.\s/.test(line)) return <li key={i} className="text-xs text-gray-700 ml-3 list-decimal leading-relaxed">{line.replace(/^\d+\.\s/, "")}</li>;
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return <p key={i} className="text-xs text-gray-700 leading-relaxed">{line}</p>;
      })}
    </div>
  );
}

// ─── Action config ────────────────────────────────────────────────────────────

const ACTIONS: { id: OutreachAction; label: string; icon: string; color: string; desc: string }[] = [
  { id: "research", label: "Research", icon: "🔍", color: "blue", desc: "Account brief, buying signals & talking points" },
  { id: "messaging", label: "Messaging", icon: "💡", color: "amber", desc: "Messaging angles & subject lines" },
  { id: "email", label: "Email Draft", icon: "✉️", color: "violet", desc: "AI-generated subject and body" },
  { id: "prep", label: "Meeting Prep", icon: "📋", color: "emerald", desc: "Discovery questions, objections & agenda" },
];

const COLORS: Record<string, { tab: string; btn: string; light: string }> = {
  blue: { tab: "border-blue-500 text-blue-700 bg-blue-50", btn: "bg-blue-600 hover:bg-blue-700", light: "bg-blue-50 text-blue-700" },
  violet: { tab: "border-violet-500 text-violet-700 bg-violet-50", btn: "bg-violet-600 hover:bg-violet-700", light: "bg-violet-50 text-violet-700" },
  amber: { tab: "border-amber-500 text-amber-700 bg-amber-50", btn: "bg-amber-600 hover:bg-amber-700", light: "bg-amber-50 text-amber-700" },
  emerald: { tab: "border-emerald-500 text-emerald-700 bg-emerald-50", btn: "bg-emerald-600 hover:bg-emerald-700", light: "bg-emerald-50 text-emerald-700" },
};

// ─── Send Email Modal ─────────────────────────────────────────────────────────


// ─── Schedule Meet Modal ──────────────────────────────────────────────────────

function MeetingModal({ contact, leads, meetings, onClose, onScheduled }: {
  contact: Lead; leads: Lead[]; meetings: Meeting[]; onClose: () => void; onScheduled: (m: Meeting) => void;
}) {
  const { success, error: toastError } = useToast();
  const [title, setTitle] = useState(`Intro Call — ${fullName(contact)}`);
  const [date, setDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d.toISOString().slice(0, 16); });
  const [duration, setDuration] = useState(30);
  const [description, setDescription] = useState(`Meeting with ${fullName(contact)} from ${contact.companyName || "Unknown Company"}.`);
  const [location, setLocation] = useState("Google Meet");
  const [attendees, setAttendees] = useState<string[]>(contact.email ? [contact.email] : []);
  const [attendeeInput, setAttendeeInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function schedule() {
    setLoading(true);
    try {
      const start = new Date(date); const end = new Date(start.getTime() + duration * 60000);
      
      const attendeeList = attendees.map(e => ({ email: e.trim() }));

      const res = await fetch("/api/google/meetings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          startISO: start.toISOString(),
          endISO: end.toISOString(),
          description,
          location,
          attendees: attendeeList
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      success("Meeting scheduled!", `Calendar event created for ${fullName(contact)}`);
      onScheduled(data); onClose();
    } catch (e) { toastError("Schedule failed", e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }

  const leadEmails = leads.map(l => l.email).filter(Boolean) as string[];
  const meetingEmails = meetings.flatMap(m => m.attendees.map(a => a.email)).filter(Boolean);
  const candidateEmails = Array.from(new Set([...leadEmails, ...meetingEmails]));

  const suggestions = candidateEmails
    .filter(email => 
      email.toLowerCase().includes(attendeeInput.toLowerCase()) && 
      !attendees.includes(email)
    )
    .slice(0, 5)
    .map(email => {
      const isLead = leads.find(l => l.email === email);
      return {
        email,
        name: isLead ? fullName(isLead) : email.split("@")[0],
        isLead: !!isLead
      };
    });

  function addAttendee(email: string) {
    if (!attendees.includes(email)) setAttendees([...attendees, email]);
    setAttendeeInput("");
    setShowSuggestions(false);
  }

  function removeAttendee(email: string) {
    setAttendees(attendees.filter(a => a !== email));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-xl shadow-sm">📅</div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">Schedule Meeting</h2>
              <p className="text-[11px] text-gray-500 font-medium">Create a Google Calendar event</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all text-2xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-0.5">Meeting Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} 
                className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all placeholder-gray-400 shadow-sm"
                placeholder="e.g. Discovery Call" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-0.5">Date & Time</label>
                <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} 
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all shadow-sm" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-0.5">Duration</label>
                <div className="relative">
                  <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} 
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 appearance-none focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all shadow-sm">
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>1 Hour</option>
                    <option value={90}>1.5 Hours</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-0.5">Attendees</label>
              <div ref={suggestionRef} className="border-2 border-gray-100 rounded-xl p-2 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-50 transition-all bg-white min-h-[52px] shadow-sm relative">
                <div className="flex flex-wrap gap-2">
                  {attendees.map(email => (
                    <span key={email} className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-100">
                      {email}
                      <button onClick={() => removeAttendee(email)} className="hover:text-emerald-900 transition-colors text-base leading-none">×</button>
                    </span>
                  ))}
                  <input 
                    value={attendeeInput} 
                    onChange={(e) => { setAttendeeInput(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    className="flex-1 min-w-[150px] bg-transparent border-none focus:outline-none text-sm font-bold text-gray-900 py-1"
                    placeholder={attendees.length === 0 ? "Search for attendees..." : ""} />
                </div>

                {showSuggestions && (attendeeInput || suggestions.length > 0) && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-10 overflow-hidden py-1">
                    {suggestions.length > 0 ? (
                      suggestions.map(s => (
                        <button key={s.email} onClick={() => addAttendee(s.email)}
                          className="w-full text-left px-4 py-2 hover:bg-emerald-50 flex items-center gap-3 transition-colors">
                          <div className={`w-6 h-6 rounded-full ${avatarColor(s.name)} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
                            {s.name[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate">{s.name}</p>
                            <p className="text-[10px] text-gray-500 truncate">{s.email}</p>
                          </div>
                          {s.isLead && <span className="ml-auto text-[8px] bg-blue-100 text-blue-700 font-bold px-1 rounded uppercase">Lead</span>}
                        </button>
                      ))
                    ) : (
                      attendeeInput.includes("@") && (
                        <button onClick={() => addAttendee(attendeeInput)} className="w-full text-left px-4 py-2 hover:bg-emerald-50 text-xs font-bold text-emerald-600 transition-colors">
                          Add "{attendeeInput}"
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-0.5">Location</label>
              <div className="relative group">
                <div className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-emerald-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <input value={location} onChange={(e) => setLocation(e.target.value)} 
                  className="w-full border-2 border-gray-100 rounded-xl pl-11 pr-4 py-3 text-sm font-bold text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all placeholder-gray-400 shadow-sm"
                  placeholder="Google Meet or Physical Address" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-0.5">Description / Agenda</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} 
                className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all min-h-[100px] resize-none placeholder-gray-400 shadow-sm"
                placeholder="Discuss project requirements and timeline..." />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-3 text-sm font-bold text-gray-600 bg-white border-2 border-gray-100 rounded-xl hover:bg-gray-50 hover:border-gray-200 transition-all shadow-sm">
            Cancel
          </button>
          <button onClick={schedule} disabled={loading || !title}
            className="flex-[2] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl py-3 flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-200/50">
            {loading ? (
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
            ) : (
              "📅 Create Calendar Event"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-emerald-600 flex items-center gap-1">
      {copied ? <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">Copied!</span> : null}
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
    </button>
  );
}

function DraftView({ content }: { content: string }) {
  const clean = (text: string) => text.replace(/\*\*/g, "").replace(/\*/g, "").trim();
  
  // Robust Subject Extraction
  const subjectPatterns = [
    /^Subject:\s*(.*)/im,
    /^\*\*Subject:\*\*\s*(.*)/im,
    /^SUBJECT:\s*(.*)/im,
    /^\*\*SUBJECT:\*\*\s*(.*)/im
  ];
  
  let subject = "New Connection Request";
  for (const pattern of subjectPatterns) {
    const match = content.match(pattern);
    if (match) {
      subject = clean(match[1]);
      break;
    }
  }

  // Extract PS if exists
  const psPatterns = [/^PS:\s*(.*)/im, /^\*\*PS:\*\*\s*(.*)/im];
  let ps = null;
  for (const pattern of psPatterns) {
    const match = content.match(pattern);
    if (match) {
      ps = clean(match[1]);
      break;
    }
  }

  // Extract Body - strip markers and PS
  let body = content
    .replace(/^(Subject|SUBJECT):\s*.*\n?/im, "")
    .replace(/^\*\*(Subject|SUBJECT):\*\*\s*.*\n?/im, "")
    .replace(/^(Body|BODY):\s*/im, "")
    .replace(/^\*\*(Body|BODY):\*\*\s*/im, "");
  
  if (ps) {
    body = body.replace(/^(PS|ps):\s*.*\n?/im, "").replace(/^\*\*PS:\*\*\s*.*\n?/im, "");
  }
  
  body = clean(body);

  return (
    <div className="space-y-6">
      <div className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-gray-50/50 px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Email Subject</span>
          <CopyButton text={subject} />
        </div>
        <div className="p-5 text-base font-bold text-gray-900 leading-tight">{subject}</div>
      </div>
      
      <div className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-gray-50/50 px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Message Body</span>
          <CopyButton text={body + (ps ? `\n\nPS: ${ps}` : "")} />
        </div>
        <div className="p-6 text-sm font-medium text-gray-700 whitespace-pre-wrap leading-relaxed min-h-[220px] selection:bg-violet-100">
          {body}
          {ps && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <span className="font-bold text-gray-900 mr-1">PS:</span>
              <span className="text-gray-600">{ps}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main OutreachTab ─────────────────────────────────────────────────────────

type MainTab = OutreachAction | "meeting_history";

export function OutreachTab() {
  const { success, error: toastError } = useToast();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Lead | null>(null);

  const [mainTab, setMainTab] = useState<MainTab>("research");
  const [extra, setExtra] = useState("");
  const [output, setOutput] = useState<Record<OutreachAction, string>>({ research: "", messaging: "", prep: "", email: "" });
  const [streaming, setStreaming] = useState<Record<OutreachAction, boolean>>({ research: false, messaging: false, prep: false, email: false });

  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showMeetModal, setShowMeetModal] = useState(false);
  const [scheduledMeeting, setScheduledMeeting] = useState<Meeting | null>(null);

  const outputRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/leads?per_page=100").then((r) => r.json())
      .then((d) => setLeads(d.leads ?? [])).catch(() => { }).finally(() => setLoadingLeads(false));
  }, []);

  useEffect(() => {
    fetch("/api/google/status").then((r) => r.json())
      .then((d) => { setGoogleConnected(d.connected); setGoogleConfigured(d.configured); }).catch(() => { });
  }, []);

  useEffect(() => {
    if (!googleConnected) return;
    fetch("/api/google/meetings").then((r) => r.json()).then((d) => setMeetings(d.events ?? [])).catch(() => { });
  }, [googleConnected]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("google_connected") === "1") {
      setGoogleConnected(true);
      success("Google connected!", "Gmail + Calendar are ready to use");
      history.replaceState(null, "", "?tab=outreach");
    }
    if (p.get("google_error") === "1") {
      toastError("Google auth failed", "Please try connecting again");
      history.replaceState(null, "", "?tab=outreach");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = leads.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return fullName(l).toLowerCase().includes(q) || (l.companyName ?? "").toLowerCase().includes(q)
      || (l.title ?? "").toLowerCase().includes(q) || (l.email ?? "").toLowerCase().includes(q);
  });

  const generate = useCallback(async (act: OutreachAction) => {
    if (!selected) return;
    abortRef.current?.abort();
    const ctrl = new AbortController(); abortRef.current = ctrl;
    setStreaming((s) => ({ ...s, [act]: true }));
    setOutput((o) => ({ ...o, [act]: "" }));
    try {
      const res = await fetch("/api/outreach", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
        body: JSON.stringify({ action: act, contact: selected, extra }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Generation failed");
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        setOutput((o) => ({ ...o, [act]: buf }));
        outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight, behavior: "smooth" });
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      toastError("Generation failed", e instanceof Error ? e.message : String(e));
    } finally { setStreaming((s) => ({ ...s, [act]: false })); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, extra]);

  function copyOutput(act: OutreachAction) {
    const text = output[act]; if (!text) return;
    navigator.clipboard.writeText(text); success("Copied!", "Output copied to clipboard");
  }


  const isOutreachAction = (t: MainTab): t is OutreachAction => t !== "meeting_history";
  const currentAction = ACTIONS.find((a) => a.id === mainTab);
  const colors = currentAction ? COLORS[currentAction.color] : COLORS.blue;
  const isStreaming = isOutreachAction(mainTab) ? streaming[mainTab] : false;
  const currentOutput = isOutreachAction(mainTab) ? output[mainTab] : "";

  return (
    <div className="flex h-full overflow-hidden rounded-lg border border-gray-100 shadow-sm bg-white">

      {/* ── LEFT: Contact List ────────────────────────────────────────────── */}
      <div className="w-60 shrink-0 flex flex-col border-r border-gray-100 bg-gray-50/40">
        <div className="px-3 pt-3 pb-2 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-700 mb-2">Contacts</p>
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contacts…"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 placeholder-gray-400 text-gray-900 font-bold" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {loadingLeads ? (
            <div className="flex items-center justify-center py-8">
              <svg className="w-5 h-5 animate-spin text-gray-300" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-6 text-center"><p className="text-xs text-gray-400">{search ? "No matches" : "No saved contacts yet"}</p></div>
          ) : (
            filtered.map((lead) => {
              const name = fullName(lead); const isActive = selected?.id === lead.id;
              return (
                <button key={lead.id}
                  onClick={() => { setSelected(lead); setOutput({ research: "", messaging: "", prep: "", email: "" }); }}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors hover:bg-white ${isActive ? "bg-white shadow-[inset_2px_0_0_0_theme(colors.blue.500)]" : ""}`}>
                  <div className={`w-7 h-7 rounded-full ${avatarColor(name)} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>{initials(lead)}</div>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate ${isActive ? "text-blue-700" : "text-gray-900"}`}>{name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{[lead.title, lead.companyName].filter(Boolean).join(" · ")}</p>
                  </div>
                  {lead.enriched && <span className="ml-auto shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>
              );
            })
          )}
        </div>

        <div className="px-3 py-2 border-t border-gray-100">
          <p className="text-[10px] text-gray-400">{filtered.length} of {leads.length} contacts</p>
        </div>
      </div>

      {/* ── RIGHT: Main Panel ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4"><span className="text-3xl">🎯</span></div>
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Select a contact to start</h3>
            <p className="text-xs text-gray-400 max-w-xs leading-relaxed">Research, draft emails, view email history, brainstorm messaging, or prepare for meetings.</p>
            <div className="mt-6 grid grid-cols-2 gap-2 w-full max-w-sm">
              {ACTIONS.map((a) => (
                <div key={a.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
                  <span className="text-base">{a.icon}</span>
                  <div><p className="text-xs font-medium text-gray-700">{a.label}</p><p className="text-[10px] text-gray-400">{a.desc}</p></div>
                </div>
              ))}
              <button onClick={() => setMainTab("meeting_history")} className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 rounded-lg px-3 py-2.5 transition-colors">
                <span className="text-base">📅</span>
                <div><p className="text-xs font-medium text-emerald-700">Meetings</p><p className="text-[10px] text-emerald-600">View upcoming & schedule new</p></div>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Contact header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 shrink-0">
              <div className={`w-9 h-9 rounded-full ${avatarColor(fullName(selected))} flex items-center justify-center text-white text-sm font-bold shrink-0`}>{initials(selected)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-gray-900 truncate">{fullName(selected)}</h2>
                  {selected.enriched && <span className="shrink-0 text-[10px] font-medium bg-emerald-100 text-emerald-700 rounded-full px-1.5 py-0.5">enriched</span>}
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {[selected.title, selected.companyName].filter(Boolean).join(" at ")}
                  {selected.city ? ` · ${selected.city}${selected.country ? `, ${selected.country}` : ""}` : ""}
                </p>
              </div>
            </div>

            {/* Main tabs: 4 AI actions + Emails */}
            <div className="flex items-center gap-0.5 px-4 pt-2.5 border-b border-gray-100 shrink-0">
              {ACTIONS.map((a) => (
                <button key={a.id} onClick={() => setMainTab(a.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-all ${mainTab === a.id ? COLORS[a.color].tab : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }`}>
                  <span>{a.icon}</span>{a.label}
                  {output[a.id] && mainTab !== a.id && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />}
                </button>
              ))}
              <button onClick={() => setMainTab("meeting_history")}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-all ${mainTab === "meeting_history" ? "border-emerald-500 text-emerald-700 bg-emerald-50" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}>
                <span>📅</span>Meetings
                {meetings.filter(m => selected?.email && m.attendees.some(a => a.email.toLowerCase() === selected.email!.toLowerCase())).length > 0 && 
                  <span className="text-[10px] bg-emerald-100 px-1.5 rounded-full ml-1">
                    {meetings.filter(m => selected?.email && m.attendees.some(a => a.email.toLowerCase() === selected.email!.toLowerCase())).length}
                  </span>
                }
              </button>
            </div>

            {/* Panel content */}
            {mainTab === "meeting_history" ? (
              <div className="flex-1 flex flex-col min-h-0">
                 <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/20">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📅</span>
                    <h3 className="text-sm font-bold text-gray-900">Upcoming Meetings</h3>
                  </div>
                  <button onClick={() => setShowMeetModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-sm shadow-emerald-100">
                    <span>+</span> New Meeting
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {(() => {
                    const filteredMeetings = meetings.filter(m => 
                      selected?.email && m.attendees.some(a => a.email.toLowerCase() === selected.email!.toLowerCase())
                    );

                    if (filteredMeetings.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-16 text-center opacity-60">
                          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4 text-3xl">📅</div>
                          <p className="text-sm font-bold text-gray-500">No meetings with {fullName(selected)}</p>
                          <p className="text-xs text-gray-400 mt-1">Ready to book an intro call?</p>
                        </div>
                      );
                    }

                    return filteredMeetings.map(m => (
                      <div key={m.id} className="group p-4 rounded-2xl border-2 border-gray-50 hover:border-emerald-100 hover:bg-emerald-50/30 transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-gray-900 truncate group-hover:text-emerald-900 transition-colors">{m.summary}</h4>
                            <p className="text-[11px] font-medium text-gray-500 mt-1 flex items-center gap-1.5">
                               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                               {new Date(m.start).toLocaleString([], { month: "short", day: "numeric", hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          {m.meetLink && (
                            <a href={m.meetLink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 rounded-lg hover:bg-emerald-200 transition-colors shrink-0 shadow-sm"> Join Meet </a>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            ) : (
              <>
                {/* AI action toolbar */}
                <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-50 shrink-0 bg-gray-50/30">
                  <input value={extra} onChange={(e) => setExtra(e.target.value)}
                    placeholder={
                      mainTab === "messaging" ? "Optional: describe your product/service…"
                        : mainTab === "prep" ? "Optional: meeting context…" 
                        : mainTab === "email" ? "Optional: email goals…" : "Optional: add context…"
                    }
                    className="flex-1 text-xs border border-gray-200 bg-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 placeholder-gray-400 text-gray-900 font-bold" />
                  <button onClick={() => isOutreachAction(mainTab) && generate(mainTab)} disabled={isStreaming}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors disabled:opacity-60 ${colors.btn}`}>
                    {isStreaming
                      ? <><svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Generating…</>
                      : <>{currentAction?.icon} Generate</>}
                  </button>
                  {currentOutput && (
                    <button onClick={() => isOutreachAction(mainTab) && copyOutput(mainTab)}
                      className="shrink-0 p-1.5 text-gray-400 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors" title="Copy">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                    </button>
                  )}
                  {mainTab === "prep" && (
                    <button onClick={() => setShowMeetModal(true)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm shadow-emerald-100">
                      📅 Schedule Meeting
                    </button>
                  )}
                </div>

                {/* AI output */}
                <div ref={outputRef} className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
                  {!currentOutput && !isStreaming ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                      <div className={`w-12 h-12 rounded-2xl ${colors.light} flex items-center justify-center mb-4 text-2xl shadow-sm`}>{currentAction?.icon}</div>
                      <p className="text-sm font-bold text-gray-900 mb-1">{currentAction?.label}</p>
                      <p className="text-xs text-gray-500 max-w-xs leading-relaxed">{currentAction?.desc}</p>
                      <button onClick={() => isOutreachAction(mainTab) && generate(mainTab)} className={`mt-5 px-5 py-2.5 text-xs font-bold text-white rounded-xl transition-all shadow-lg ${colors.btn}`}>
                        Generate {currentAction?.label}
                      </button>
                    </div>
                  ) : (
                    <div className="max-w-2xl">
                      {mainTab === "email" ? (
                        <DraftView content={currentOutput} />
                      ) : (
                        <MarkdownBlock text={currentOutput} />
                      )}
                      {isStreaming && <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse rounded-sm ml-0.5" />}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Scheduled meeting banner */}
            {scheduledMeeting && (
              <div className="mx-4 mb-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 flex items-center gap-3 shrink-0">
                <span className="text-base">✅</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-emerald-800">{scheduledMeeting.summary}</p>
                  <p className="text-[11px] text-emerald-600">{scheduledMeeting.start ? new Date(scheduledMeeting.start).toLocaleString() : ""}</p>
                </div>
                {scheduledMeeting.meetLink && (
                  <a href={scheduledMeeting.meetLink} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 text-xs font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition-colors">Join Meet →</a>
                )}
                <button onClick={() => setScheduledMeeting(null)} className="shrink-0 text-emerald-400 hover:text-emerald-600 text-sm">×</button>
              </div>
            )}
          </>
        )}

        {/* Google connection bar */}
        {googleConfigured && (
          <div className={`shrink-0 border-t px-4 py-2 flex items-center gap-2 ${googleConnected ? "border-emerald-100 bg-emerald-50/20" : "border-amber-100 bg-amber-50/50"}`}>
            {googleConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <p className="text-[11px] text-emerald-800 flex-1 font-medium">Google Calendar connected</p>
                {(() => {
                  const count = meetings.filter(m => selected?.email && m.attendees.some(a => a.email.toLowerCase() === selected.email!.toLowerCase())).length;
                  return count > 0 ? <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100 px-1.5 rounded-full">{count} {selected ? `for ${fullName(selected)}` : ""}</span> : null;
                })()}
              </>
            ) : (
              <>
                <span className="text-sm">🔗</span>
                <p className="text-[11px] text-amber-700 flex-1">Connect Google to schedule & view meetings</p>
                <a href="/api/google/auth" className="shrink-0 text-[11px] font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition-colors shadow-sm">Connect Google →</a>
              </>
            )}
          </div>
        )}

        {!googleConfigured && (
          <div className="shrink-0 border-t border-gray-100 px-4 py-2 flex items-center gap-2 bg-gray-50/50">
            <span className="text-sm">📅</span>
            <p className="text-[11px] text-gray-400">Add GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET to .env to enable Google Calendar & Meet</p>
          </div>
        )}
      </div>

      {showMeetModal && selected && (
        <MeetingModal contact={selected} leads={leads} meetings={meetings} onClose={() => setShowMeetModal(false)}
          onScheduled={(m) => { setScheduledMeeting(m); setMeetings((p) => [m, ...p]); setMainTab("meeting_history"); }} />
      )}
    </div>
  );
}
