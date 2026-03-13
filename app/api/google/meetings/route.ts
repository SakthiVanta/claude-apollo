import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getAuthedClient() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("google_tokens")?.value;
  if (!raw) throw new Error("Not authenticated with Google");

  const tokens = JSON.parse(raw);
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

// GET — list upcoming meetings
export async function GET() {
  try {
    const auth = await getAuthedClient();
    const calendar = google.calendar({ version: "v3", auth });

    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = (res.data.items ?? []).map((e) => ({
      id: e.id,
      summary: e.summary,
      start: e.start?.dateTime ?? e.start?.date,
      end: e.end?.dateTime ?? e.end?.date,
      meetLink: e.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === "video")?.uri ?? null,
      attendees: (e.attendees ?? []).map((a) => ({ email: a.email, name: a.displayName })),
    }));

    return NextResponse.json({ events });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

// POST — create event with Google Meet
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, startISO, endISO, attendeeEmail, attendeeName, description, location, attendees } = body;

    if (!title || !startISO || !endISO) {
      return NextResponse.json({ error: "title, startISO, endISO required" }, { status: 400 });
    }

    const auth = await getAuthedClient();
    const calendar = google.calendar({ version: "v3", auth });

    // Combine individual attendee with the attendees array
    const guestList = [...(attendees || [])];
    if (attendeeEmail) {
      guestList.push({ email: attendeeEmail, displayName: attendeeName ?? attendeeEmail });
    }

    const event = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      requestBody: {
        summary: title,
        description: description ?? "",
        location: location ?? "",
        start: { dateTime: startISO, timeZone: "Asia/Kolkata" },
        end: { dateTime: endISO, timeZone: "Asia/Kolkata" },
        attendees: guestList.length > 0 ? guestList : undefined,
        conferenceData: {
          createRequest: {
            requestId: randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });

    const meetLink =
      event.data.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === "video")?.uri ?? null;

    return NextResponse.json({
      id: event.data.id,
      summary: event.data.summary,
      start: event.data.start?.dateTime,
      end: event.data.end?.dateTime,
      meetLink,
      htmlLink: event.data.htmlLink,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
