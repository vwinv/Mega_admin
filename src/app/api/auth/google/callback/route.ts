import { NextRequest, NextResponse } from "next/server";
import { loginWithGoogleProfile } from "@/lib/auth-google";
import {
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  getGoogleAuthConfig,
  getRequestBaseUrl,
} from "@/lib/google-auth";

const STATE_COOKIE = "google_oauth_state";
const FROM_COOKIE = "google_oauth_from";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const oauthError = url.searchParams.get("error");
  if (oauthError === "access_denied") {
    return clearOAuthCookies(
      NextResponse.redirect(new URL("/login?error=google_denied", request.url))
    );
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = request.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return clearOAuthCookies(
      NextResponse.redirect(new URL("/login?error=google_state", request.url))
    );
  }

  const baseUrl = getRequestBaseUrl(request);
  const config = getGoogleAuthConfig(baseUrl);
  if (!config) {
    return clearOAuthCookies(
      NextResponse.redirect(new URL("/login?error=google_config", request.url))
    );
  }

  try {
    const tokens = await exchangeGoogleCode(config, code);
    const profile = await fetchGoogleUserInfo(tokens.access_token);
    const result = await loginWithGoogleProfile(profile, config);

    if (!result.ok) {
      return clearOAuthCookies(
        NextResponse.redirect(
          new URL(`/login?error=${result.code}`, request.url)
        )
      );
    }

    const from = request.cookies.get(FROM_COOKIE)?.value || "/";
    return clearOAuthCookies(NextResponse.redirect(new URL(from, request.url)));
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return clearOAuthCookies(
      NextResponse.redirect(new URL("/login?error=google_error", request.url))
    );
  }
}

function clearOAuthCookies(response: NextResponse) {
  response.cookies.delete(STATE_COOKIE);
  response.cookies.delete(FROM_COOKIE);
  return response;
}
