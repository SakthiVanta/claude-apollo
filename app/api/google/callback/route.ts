import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";

export const runtime = "nodejs";

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  console.log("[OAuth Callback] Received params:", { hasCode: !!code, hasError: !!error, state });

  if (error || !code) {
    console.error("[OAuth Callback] Error or no code:", error);
    return NextResponse.redirect(new URL("/?tab=outreach&google_error=1", req.url));
  }

  const oauth2Client = getOAuth2Client();

  try {
    const { tokens } = await oauth2Client.getToken(code);

    console.log("[OAuth Callback] Tokens raw keys:", Object.keys(tokens));
    const requestedScopes = [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.compose",
      "https://www.googleapis.com/auth/gmail.modify",
    ];

    console.log("[OAuth Callback] Requested Scopes:", requestedScopes.join(" "));
    console.log("[OAuth Callback] Granted Scopes:  ", tokens.scope);

    const grantedArr = tokens.scope?.split(" ") || [];
    const missing = requestedScopes.filter(s => !grantedArr.includes(s));

    if (missing.length > 0) {
      console.warn("[OAuth Callback] SCOPE MISMATCH! Missing:", missing);
    } else {
      console.log("[OAuth Callback] All requested scopes granted!");
    }

    const cookieStore = await cookies();
    cookieStore.set("google_tokens", JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    console.log("[OAuth Callback] Tokens saved to cookie successfully");
    return NextResponse.redirect(new URL("/?tab=outreach&google_connected=1", req.url));
  } catch (e: any) {
    const errorDetails = e.response?.data?.error || e.message;
    console.error("[OAuth Callback] Error exchanging code for tokens:", JSON.stringify(errorDetails, null, 2));

    return NextResponse.json({
      error: e.message || "Token exchange failed",
      details: errorDetails,
      hint: "Check if Google Client ID/Secret/Redirect URI are correct and if all checkboxes were selected during login."
    }, { status: 500 });
  }
}
