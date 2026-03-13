import { NextRequest } from "next/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY! });

type Action = "research" | "email" | "messaging" | "prep" | "email_analysis";

interface Contact {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  title?: string;
  companyName?: string;
  companyDomain?: string;
  linkedinUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  seniority?: string;
  industry?: string;
}

const prompts: Record<Exclude<Action, "email_analysis">, (c: Contact, extra?: string) => string> = {
  research: (c) => `You are a senior sales researcher. Write a concise, actionable account research brief for a sales rep preparing to reach out to this contact.

**Contact:** ${[c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown"}
**Title:** ${c.title ?? "Unknown"}
**Company:** ${c.companyName ?? "Unknown"} ${c.companyDomain ? `(${c.companyDomain})` : ""}
**Location:** ${[c.city, c.state, c.country].filter(Boolean).join(", ") || "Unknown"}
**Industry:** ${c.industry ?? "Unknown"}
**Seniority:** ${c.seniority ?? "Unknown"}

Structure your response as:
## 🏢 Company Overview
Brief description of what the company likely does based on domain/industry.

## 🎯 Contact Profile
Who this person likely is, their responsibilities, pain points for their role/seniority.

## 💡 Buying Signals & Angles
2-3 reasons why they might be receptive to outreach right now.

## ⚡ Key Talking Points
3-4 specific points tailored to their role and company.

Keep it concise and actionable — a rep should be able to read this in 60 seconds.`,

  email: (c, extra) => `You are an expert B2B sales copywriter. Write a personalized cold outreach email for this contact.

**Contact:** ${[c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown"}
**Title:** ${c.title ?? "Unknown"}
**Company:** ${c.companyName ?? "Unknown"}
**Industry:** ${c.industry ?? "Unknown"}
**Seniority:** ${c.seniority ?? "Unknown"}
**Location:** ${[c.city, c.country].filter(Boolean).join(", ") || "Unknown"}
${extra ? `**Additional context:** ${extra}` : ""}

Write a cold email that:
- Has a compelling, personalized subject line
- Opens with a relevant observation (not generic flattery)
- Explains value in 1-2 sentences
- Has a low-friction CTA (not "book a 30-min call")
- Is under 120 words in the body
- Sounds human, not AI-generated

Format:
SUBJECT: [subject line]
BODY: [email body]
PS: [optional personalized PS line (if highly relevant)]

CRITICAL: Do not use any markdown formatting like bold (**) or italics (*) in the subject or body. Sounds like a real human wrote it, not an AI template. Avoid corporate jargon and cliché AI openers like "I hope this email finds you well". Start with a specific, relevant observation instead.
`,

  messaging: (c, extra) => `You are a B2B messaging strategist. Brainstorm outbound messaging angles for reaching this contact.

**Contact:** ${[c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown"}
**Title:** ${c.title ?? "Unknown"}
**Company:** ${c.companyName ?? "Unknown"}
**Industry:** ${c.industry ?? "Unknown"}
**Seniority:** ${c.seniority ?? "Unknown"}
${extra ? `**Product/Service context:** ${extra}` : ""}

Provide:
## 🧠 Messaging Angles (pick the best fit)

**Angle 1 — Pain-led**
[1-2 sentence pitch focused on a specific pain point for their role]

**Angle 2 — Outcome-led**
[1-2 sentence pitch focused on a business outcome they'd care about]

**Angle 3 — Curiosity/Provocative**
[1-2 sentence pitch that challenges an assumption or opens a loop]

## 📝 Subject Line Variants
- [5 subject line options, varied styles]

## 🚫 What NOT to say
[Common mistakes or overused phrases to avoid for this persona]`,

  prep: (c, extra) => `You are an expert sales coach. Prepare a meeting brief for a sales call with this contact.

**Contact:** ${[c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown"}
**Title:** ${c.title ?? "Unknown"}
**Company:** ${c.companyName ?? "Unknown"} ${c.companyDomain ? `(${c.companyDomain})` : ""}
**Industry:** ${c.industry ?? "Unknown"}
**Seniority:** ${c.seniority ?? "Unknown"}
**Location:** ${[c.city, c.country].filter(Boolean).join(", ") || "Unknown"}
${extra ? `**Meeting context:** ${extra}` : ""}

Structure:
## 📋 Meeting Goal
What success looks like for this call in one sentence.

## 🔍 Discovery Questions
5 open-ended questions to uncover pain and qualify.

## 💪 Objection Handling
3 likely objections and how to handle each.

## 📊 Success Metrics to Reference
What KPIs/metrics matter to someone in their role.

## ⏱ Suggested Agenda (30 min)
- 0-5 min: [...]
- 5-15 min: [...]
- 15-25 min: [...]
- 25-30 min: [...]

## 🚩 Red Flags to Watch For
Signs this might not be a good fit.`,
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, contact, extra, threads } = body as {
    action: Action;
    contact: Contact;
    extra?: string;
    threads?: { subject: string; from: string; date: string; snippet: string; type: string }[];
  };

  // Email analysis — uses threads context instead of prompts map
  if (action === "email_analysis") {
    if (!threads || threads.length === 0) {
      return new Response("No email threads provided for analysis.", { status: 200 });
    }
    const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "this contact";
    const threadsText = threads
      .map((t) => `[${t.type.toUpperCase()}] ${t.date}\nSubject: ${t.subject}\nFrom: ${t.from}\nPreview: ${t.snippet}`)
      .join("\n\n---\n\n");

    const result = streamText({
      model: google("gemini-2.5-flash"),
      prompt: `You are an expert sales AI analyzing email conversation history between a sales rep and a prospect.

**Contact:** ${name}
**Title:** ${contact.title ?? "Unknown"}
**Company:** ${contact.companyName ?? "Unknown"}

**Email threads (${threads.length} total):**

${threadsText}

Analyze this email history and provide:

## 📊 Conversation Summary
What stage is this relationship at? How many touchpoints? Last contact when?

## 🌡️ Engagement Level
Rate engagement: Cold / Warm / Active / Churned — and explain why.

## 💬 Key Themes
What topics have come up? What did the prospect respond to (or not)?

## ⚡ Recommended Next Action
Specific next step: what to send, when, and why.

## ✉️ Suggested Follow-up Subject Line
One subject line optimized for this specific conversation history.

Keep it concise and actionable.`,
      temperature: 0.5,
    });
    return result.toTextStreamResponse();
  }

  if (!action || !contact) {
    return new Response(JSON.stringify({ error: "action and contact required" }), { status: 400 });
  }

  const promptFn = prompts[action as Exclude<Action, "email_analysis">];
  if (!promptFn) {
    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400 });
  }

  const result = streamText({
    model: google("gemini-2.5-flash"),
    prompt: promptFn(contact, extra),
    temperature: 0.7,
  });

  return result.toTextStreamResponse();
}
