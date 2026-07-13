import { NextRequest, NextResponse } from "next/server";
import {
  buildGoogleAuthUrl,
  getGoogleAuthConfig,
  getRequestBaseUrl,
  isGoogleAuthEnabled,
} from "@/lib/google-auth";

const STATE_COOKIE = "google_oauth_state";
const FROM_COOKIE = "google_oauth_from";
const STATE_MAX_AGE = 60 * 10;

export async function GET(request: NextRequest) {
  if (!isGoogleAuthEnabled()) {
    return NextResponse.redirect(
      new URL("/login?error=google_config", request.url)
    );
  }

  const baseUrl = getRequestBaseUrl(request);
  const config = getGoogleAuthConfig(baseUrl);
  if (!config) {
    return NextResponse.redirect(
      new URL("/login?error=google_config", request.url)
    );
  }

  const from = new URL(request.url).searchParams.get("from") || "/";
  const state = crypto.randomUUID();
  const response = NextResponse.redirect(buildGoogleAuthUrl(config, state));
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STATE_MAX_AGE,
  });
  response.cookies.set(FROM_COOKIE, from, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STATE_MAX_AGE,
  });
  return response;
}
