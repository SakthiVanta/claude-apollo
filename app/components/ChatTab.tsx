"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useToast } from "./Toast";

const SESSION_ID = `chat_${Date.now()}`;

const SUGGESTIONS = [
  "Show all my saved Apollo contacts",
  "Find Mathan in my contacts",
  "Show contacts at Hyperready Tech",
  "List all my saved company accounts",
];

const PLACEHOLDERS = [
  "Show all my saved Apollo contacts…",
  "Find Mathan in my contacts…",
  "Show contacts at Hyperready Tech…",
  "List all my saved company accounts…",
  "How many contacts do I have?…",
];

function useTypingPlaceholder(active: boolean) {
  const [placeholder, setPlaceholder] = useState("");
  const phraseIdx = useRef(0);
  const charIdx = useRef(0);
  const deleting = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tick = useCallback(() => {
    const phrase = PLACEHOLDERS[phraseIdx.current];
    if (!deleting.current) {
      charIdx.current += 1;
      setPlaceholder(phrase.slice(0, charIdx.current));
      if (charIdx.current === phrase.length) {
        deleting.current = true;
        timer.current = setTimeout(tick, 1800);
      } else {
        timer.current = setTimeout(tick, 55);
      }
    } else {
      charIdx.current -= 1;
      setPlaceholder(phrase.slice(0, charIdx.current));
      if (charIdx.current === 0) {
        deleting.current = false;
        phraseIdx.current = (phraseIdx.current + 1) % PLACEHOLDERS.length;
        timer.current = setTimeout(tick, 400);
      } else {
        timer.current = setTimeout(tick, 28);
      }
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    timer.current = setTimeout(tick, 600);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [active, tick]);

  return placeholder;
}

export function ChatTab() {
  const { error: toastError } = useToast();
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { sessionId: SESSION_ID },
      }),
    []
  );

  const { messages, sendMessage, status, error } = useChat({ transport });

  const isLoading = status === "streaming" || status === "submitted";

  const [input, setInput] = useState("");
  const [rows, setRows] = useState(1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingPlaceholder = useTypingPlaceholder(input === "" && messages.length === 0 && !isLoading);

  useEffect(() => {
    if (error) toastError("Chat error", error.message.slice(0, 100));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function submit() {
    const text = input.trim();
    if (!text || isLoading) return;
    sendMessage({ text });
    setInput("");
    setRows(1);
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function handleTextarea(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    setRows(Math.min(e.target.value.split("\n").length, 4));
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 pb-8">
            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
              <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">Apollo AI Assistant</p>
              <p className="text-xs text-gray-400 mt-0.5">Search your 25 saved Apollo contacts &amp; accounts</p>
            </div>
            <div className="flex flex-col gap-1.5 w-full max-w-sm">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="text-left text-xs text-gray-500 rounded border border-gray-100 bg-gray-50 px-3 py-1.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="h-6 w-6 rounded-full bg-blue-50 flex items-center justify-center mr-2 shrink-0 mt-0.5">
                <span className="text-blue-600 text-xs font-semibold">G</span>
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg px-3.5 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-100 text-gray-700 shadow-sm"
              }`}
            >
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(() => {
                const parts = (m as any).parts as any[] | undefined;
                const hasRenderable = parts?.some(
                  (p: any) => (p.type === "text" && p.text) || p.type === "tool-invocation"
                );
                if (hasRenderable) {
                  return parts!.map((part: any, i: number) => {
                    if (part.type === "text" && part.text)
                      return <MarkdownText key={i} text={part.text} isUser={m.role === "user"} />;
                    if (part.type === "tool-invocation" && part.toolInvocation)
                      return <ToolCallBadge key={i} name={part.toolInvocation.toolName} state={part.toolInvocation.state} />;
                    return null;
                  });
                }
                // fallback: plain content string
                const content = (m as any).content;
                if (typeof content === "string" && content)
                  return <MarkdownText text={content} isUser={m.role === "user"} />;
                return null;
              })()}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="h-6 w-6 rounded-full bg-blue-50 flex items-center justify-center mr-2 shrink-0 mt-0.5">
              <span className="text-blue-600 text-xs font-semibold">G</span>
            </div>
            <div className="bg-white border border-gray-100 rounded-lg px-3.5 py-2.5 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-gray-300 animate-bounce" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600 text-center">
            {error.message}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 bg-white px-3 py-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            rows={rows}
            value={input}
            onChange={handleTextarea}
            onKeyDown={handleKey}
            placeholder={typingPlaceholder || "Ask about your contacts…"}
            className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:border-blue-400 focus:outline-none"
            disabled={isLoading}
          />
          <button
            onClick={submit}
            disabled={!input.trim() || isLoading}
            className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors shrink-0"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-300 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

// ─── Markdown renderers ───────────────────────────────────────────────────────

function MarkdownText({ text, isUser }: { text: string; isUser: boolean }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let tableLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("|")) {
      tableLines.push(line);
    } else {
      if (tableLines.length > 0) {
        elements.push(<MarkdownTable key={`t${i}`} lines={tableLines} />);
        tableLines = [];
      }
      if (line.trim()) {
        elements.push(
          <p key={i} className={`${isUser ? "text-white" : "text-gray-700"} text-sm leading-relaxed`}>
            <InlineMarkdown text={line} isUser={isUser} />
          </p>
        );
      } else if (elements.length > 0) {
        elements.push(<div key={`sp${i}`} className="h-1" />);
      }
    }
    i++;
  }
  if (tableLines.length > 0) elements.push(<MarkdownTable key="t-end" lines={tableLines} />);
  return <>{elements}</>;
}

function InlineMarkdown({ text, isUser }: { text: string; isUser: boolean }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className={isUser ? "text-white" : "text-gray-900"}>
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function MarkdownTable({ lines }: { lines: string[] }) {
  const rows = lines.filter((l) => !l.match(/^\|[-: |]+\|$/));
  if (rows.length < 2) return null;
  const parseRow = (line: string) => line.split("|").slice(1, -1).map((c) => c.trim());
  const [header, ...body] = rows;
  return (
    <div className="overflow-x-auto my-2 rounded border border-gray-100">
      <table className="text-xs w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {parseRow(header).map((h, i) => (
              <th key={i} className="px-2.5 py-1.5 text-left font-medium text-gray-500 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {body.map((row, ri) => (
            <tr key={ri} className="hover:bg-gray-50">
              {parseRow(row).map((cell, ci) => (
                <td key={ci} className="px-2.5 py-1.5 text-gray-700">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ToolCallBadge({ name, state }: { name: string; state: string }) {
  const labels: Record<string, string> = {
    search_people: "Searching people",
    enrich_person: "Enriching contact",
    search_companies: "Searching companies",
    enrich_organization: "Enriching company",
  };
  const done = state === "result";
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs my-1 ${
        done ? "bg-green-50 text-green-600 border border-green-100" : "bg-blue-50 text-blue-500 border border-blue-100"
      }`}
    >
      {!done && <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />}
      {done && <span className="text-green-500">✓</span>}
      {labels[name] ?? name}
    </div>
  );
}
