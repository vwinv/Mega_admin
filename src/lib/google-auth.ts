const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export type GoogleAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  allowedDomain: string | null;
};

export type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

function cleanEnv(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
}

export function isGoogleAuthEnabled(): boolean {
  const clientId = cleanEnv(process.env.GOOGLE_CLIENT_ID);
  const clientSecret = cleanEnv(process.env.GOOGLE_CLIENT_SECRET);
  return Boolean(clientId && clientSecret);
}

export function getGoogleAuthConfig(baseUrl: string): GoogleAuthConfig | null {
  const clientId = cleanEnv(process.env.GOOGLE_CLIENT_ID);
  const clientSecret = cleanEnv(process.env.GOOGLE_CLIENT_SECRET);
  if (!clientId || !clientSecret) return null;

  const redirectOverride = cleanEnv(process.env.GOOGLE_REDIRECT_URI);
  const redirectUri =
    redirectOverride ||
    `${baseUrl.replace(/\/$/, "")}/api/auth/google/callback`;

  return {
    clientId,
    clientSecret,
    redirectUri,
    allowedDomain: cleanEnv(process.env.GOOGLE_ALLOWED_DOMAIN).toLowerCase() || null,
  };
}

export function buildGoogleAuthUrl(config: GoogleAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(
  config: GoogleAuthConfig,
  code: string
): Promise<{ access_token: string }> {
  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Échange token Google échoué : ${text}`);
  }

  return res.json() as Promise<{ access_token: string }>;
}

export async function fetchGoogleUserInfo(
  accessToken: string
): Promise<GoogleUserInfo> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error("Impossible de récupérer le profil Google.");
  }

  const data = (await res.json()) as GoogleUserInfo;
  if (!data.sub || !data.email) {
    throw new Error("Profil Google incomplet.");
  }
  return data;
}

export function getRequestBaseUrl(request: Request): string {
  const hostHeader =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const host = hostHeader?.split(",")[0]?.trim() ?? "";
  const hostName = host.split(":")[0]?.toLowerCase() ?? "";
  const isLocal =
    hostName === "localhost" ||
    hostName === "127.0.0.1" ||
    hostName === "[::1]" ||
    hostName === "::1";

  // En local, toujours utiliser l'hote de la requete (evite redirect_uri_mismatch
  // si NEXT_PUBLIC_APP_URL pointe vers la prod via .env.local / Vercel CLI).
  // Normalise 127.0.0.1 -> localhost pour matcher la console Google.
  if (isLocal && host) {
    const proto = (
      request.headers.get("x-forwarded-proto") ?? "http"
    )
      .split(",")[0]
      .trim();
    const port = host.includes(":") ? host.slice(host.indexOf(":")) : "";
    const localHost = `localhost${port || ":3000"}`;
    return `${proto}://${localHost}`.replace(/\/$/, "");
  }

  const envUrl = cleanEnv(process.env.NEXT_PUBLIC_APP_URL);
  if (envUrl) return envUrl.replace(/\/$/, "");

  if (host) {
    const proto = (
      request.headers.get("x-forwarded-proto") ?? "http"
    )
      .split(",")[0]
      .trim();
    return `${proto}://${host}`.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}
