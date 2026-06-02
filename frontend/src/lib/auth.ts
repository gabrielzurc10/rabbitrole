// Cognito Hosted UI auth — OAuth 2.0 Authorization Code + PKCE for the static
// SPA. No SDK: just the Hosted UI redirect + a fetch to the token endpoint,
// keeping the bundle lean (see CLAUDE.md).
//
// Offline-friendly: when the Cognito env vars are absent (local `npm run dev`),
// auth runs in "demo mode" — login just routes into the app and no bearer token
// is sent, which pairs with the backend's local permit-all security.
import { setOnboarded } from "@/lib/session";

const DOMAIN = process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? "";
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "";
const SCOPES = "openid email profile";

const ACCESS_TOKEN_KEY = "rr.accessToken";
const EXPIRES_AT_KEY = "rr.expiresAt";
const VERIFIER_KEY = "rr.pkceVerifier";

/** True only when a real Cognito Hosted UI is wired up. */
export const isConfigured = Boolean(DOMAIN && CLIENT_ID);

/** Where Cognito redirects back to after sign-in (must match a callback URL). */
function redirectUri(): string {
  return `${window.location.origin}/login`;
}

// --- PKCE helpers ----------------------------------------------------------

function randomString(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return base64Url(arr);
}

function base64Url(bytes: ArrayBuffer | Uint8Array): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (const byte of b) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(digest);
}

// --- Public API ------------------------------------------------------------

/** Start sign-in. `provider` ("Google") jumps straight to that IdP. */
export async function login(provider?: string): Promise<void> {
  if (!isConfigured) {
    window.location.assign("/onboarding");
    return;
  }
  const verifier = randomString();
  sessionStorage.setItem(VERIFIER_KEY, verifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    scope: SCOPES,
    code_challenge_method: "S256",
    code_challenge: await challengeFor(verifier),
  });
  if (provider) params.set("identity_provider", provider);

  window.location.assign(`https://${DOMAIN}/oauth2/authorize?${params.toString()}`);
}

/**
 * On the /login page, complete the redirect: swap the `?code=` for tokens.
 * Returns true if a sign-in was handled (caller should route onward).
 */
export async function handleRedirectCallback(): Promise<boolean> {
  if (!isConfigured) return false;
  const code = new URLSearchParams(window.location.search).get("code");
  if (!code) return false;

  const verifier = sessionStorage.getItem(VERIFIER_KEY) ?? "";
  sessionStorage.removeItem(VERIFIER_KEY);

  const res = await fetch(`https://${DOMAIN}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      code,
      redirect_uri: redirectUri(),
      code_verifier: verifier,
    }),
  });
  if (!res.ok) throw new Error("Sign-in failed. Please try again.");

  const token = (await res.json()) as { access_token: string; expires_in: number };
  localStorage.setItem(ACCESS_TOKEN_KEY, token.access_token);
  localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + token.expires_in * 1000));

  // Drop the ?code= from the URL so a refresh doesn't re-exchange it.
  window.history.replaceState({}, "", window.location.pathname);
  return true;
}

/** Bearer token for API calls, or null when unauthenticated / in demo mode. */
export function getAccessToken(): string | null {
  if (!isConfigured) return null;
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const expiresAt = Number(localStorage.getItem(EXPIRES_AT_KEY) ?? 0);
  if (!token || Date.now() >= expiresAt) return null;
  return token;
}

/** In demo mode everyone is "signed in"; otherwise gate on a live token. */
export function isAuthenticated(): boolean {
  return !isConfigured || getAccessToken() !== null;
}

/** Sign out: clear tokens and (when configured) end the Hosted UI session. */
export function logout(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
  setOnboarded(false); // hide the Jobs/Profile tabs
  if (!isConfigured) {
    window.location.assign("/");
    return;
  }
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    logout_uri: `${window.location.origin}/login`,
  });
  window.location.assign(`https://${DOMAIN}/logout?${params.toString()}`);
}
