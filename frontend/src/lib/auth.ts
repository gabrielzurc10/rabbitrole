// Auth, no SDK (keeps the static bundle lean — see CLAUDE.md):
//  - Email: passwordless one-time code, in-app, via Cognito's USER_AUTH API
//    (InitiateAuth/RespondToAuthChallenge over fetch — no Hosted UI redirect).
//  - Google: Cognito Hosted UI redirect (OAuth Authorization Code + PKCE).
//
// Offline-friendly: when the Cognito env vars are absent (local `npm run dev`),
// auth runs in "demo mode" — login just routes into the app and no bearer token
// is sent, which pairs with the backend's local permit-all security.
import { setOnboarded } from "@/lib/session";
import { clearOnboardingForm, clearPersistedDraft } from "@/lib/onboardingDraft";

const DOMAIN = process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? "";
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "";
const REGION = process.env.NEXT_PUBLIC_COGNITO_REGION ?? "us-east-1";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const SCOPES = "openid email profile";

const CIP_ENDPOINT = `https://cognito-idp.${REGION}.amazonaws.com/`;

const ACCESS_TOKEN_KEY = "rr.accessToken";
const ID_TOKEN_KEY = "rr.idToken"; // kept only to read the email claim for display
const REFRESH_TOKEN_KEY = "rr.refreshToken"; // exchanged for fresh access tokens (silent refresh)
const REFRESH_EXPIRES_AT_KEY = "rr.refreshExpiresAt";
const AUTH_METHOD_KEY = "rr.authMethod"; // "oauth" | "email" — which refresh flow to use
const EXPIRES_AT_KEY = "rr.expiresAt";
const VERIFIER_KEY = "rr.pkceVerifier";
const OTP_SESSION_KEY = "rr.otpSession";

// Cognito's default refresh-token lifetime (30 days). We don't get its exact expiry
// back, so we estimate it to gate isAuthenticated()/refresh attempts; a revoked/expired
// token is caught for real when a refresh call fails.
const REFRESH_TOKEN_DAYS = 30;
// Demo mode has no real token, so "signed out" is tracked with this flag instead
// (per-tab). Lets sign-out actually lock the app locally, like the deployed app.
const DEMO_LOGOUT_KEY = "rr.demoLoggedOut";

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

// --- Cognito Identity Provider API (email OTP) -----------------------------

class CognitoError extends Error {
  constructor(
    public type: string,
    message?: string,
  ) {
    super(message ?? type);
  }
}

/** Unauthenticated POST to the Cognito IDP API (public client — no SigV4). */
async function cipCall(target: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(CIP_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const type = String(data.__type ?? "").split("#").pop() ?? "";
    throw new CognitoError(type, typeof data.message === "string" ? data.message : undefined);
  }
  return data;
}

// --- Public API ------------------------------------------------------------

/** Start sign-in. `provider` ("Google") jumps straight to that IdP. */
export async function login(provider?: string): Promise<void> {
  if (!isConfigured) {
    window.location.assign("/onboarding/");
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

/** Turn a Cognito/OAuth error param into a short, user-readable sign-in message. */
function friendlyAuthError(raw: string): string {
  const text = raw.replace(/\+/g, " ").trim();
  if (/redirect_mismatch|redirect_uri|invalid_request|invalid_client/i.test(text)) {
    return "Sign-in isn't available right now. Please try again later.";
  }
  if (/access_denied|cancel|denied/i.test(text)) {
    return "Sign-in was cancelled.";
  }
  return "Couldn't complete sign-in. Please try again.";
}

/**
 * On the /login page, complete the redirect: swap the `?code=` for tokens, or
 * surface an `?error=` the provider sent back. Returns true if a sign-in was
 * handled (caller should route onward); throws with a friendly message on error.
 */
export async function handleRedirectCallback(): Promise<boolean> {
  if (!isConfigured) return false;
  const params = new URLSearchParams(window.location.search);

  // A failed federated/OAuth sign-in comes back as ?error=...&error_description=...
  // (e.g. the user cancels, or Google/Cognito rejects the request). Surface it on
  // the sign-in page instead of dropping the user on Cognito's hosted error screen.
  const oauthError = params.get("error_description") || params.get("error");
  if (oauthError) {
    window.history.replaceState({}, "", window.location.pathname); // don't re-trigger on refresh
    throw new Error(friendlyAuthError(oauthError));
  }

  const code = params.get("code");
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

  const token = (await res.json()) as {
    access_token: string;
    id_token?: string;
    refresh_token?: string;
    expires_in: number;
  };
  storeSession(token.access_token, token.id_token, token.expires_in);
  if (token.refresh_token) storeRefreshToken(token.refresh_token, "oauth");

  // Drop the ?code= from the URL so a refresh doesn't re-exchange it.
  window.history.replaceState({}, "", window.location.pathname);
  return true;
}

/**
 * Email passwordless step 1: provision the user (so new emails work), then have
 * Cognito email a one-time code and stash the challenge session for step 2.
 */
export async function requestEmailCode(email: string): Promise<void> {
  if (!isConfigured) return; // demo mode: no real OTP

  const provisioned = await fetch(`${API_URL}/api/auth/email/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  }).catch(() => null);
  if (!provisioned) throw new Error("Can't reach the server. Please try again.");
  if (!provisioned.ok) throw new Error("Please enter a valid email address.");
  // 200 with { provider } means the email already belongs to that provider
  // (e.g. Google) — don't send a code; tell the user where to sign in. (Returned
  // as 200, not an error status, so the browser console stays clean.)
  const start = (await provisioned.json().catch(() => ({}))) as { provider?: string };
  if (start.provider) {
    throw new Error(
      `This email is registered with ${start.provider}. Please continue with ${start.provider}.`,
    );
  }

  let data: Record<string, unknown>;
  try {
    data = await cipCall("InitiateAuth", {
      AuthFlow: "USER_AUTH",
      ClientId: CLIENT_ID,
      AuthParameters: { USERNAME: email, PREFERRED_CHALLENGE: "EMAIL_OTP" },
    });
  } catch {
    throw new Error("Couldn't send a code to that email. Please try again.");
  }
  const session = data.Session;
  if (typeof session !== "string") {
    throw new Error("Couldn't start sign-in. Please try again.");
  }
  sessionStorage.setItem(OTP_SESSION_KEY, session);
}

/** Email passwordless step 2: verify the code; on success the user is signed in. */
export async function verifyEmailCode(email: string, code: string): Promise<void> {
  if (!isConfigured) return;
  const session = sessionStorage.getItem(OTP_SESSION_KEY) ?? "";

  let data: Record<string, unknown>;
  try {
    data = await cipCall("RespondToAuthChallenge", {
      ChallengeName: "EMAIL_OTP",
      ClientId: CLIENT_ID,
      Session: session,
      ChallengeResponses: { USERNAME: email, EMAIL_OTP_CODE: code },
    });
  } catch (e) {
    const type = e instanceof CognitoError ? e.type : "";
    if (/CodeMismatch|NotAuthorized|ExpiredCode/.test(type)) {
      throw new Error("Incorrect or expired code. Please try again.");
    }
    if (/TooManyRequests|LimitExceeded/.test(type)) {
      throw new Error("Too many attempts. Please wait a moment and try again.");
    }
    throw new Error("Couldn't verify the code. Please try again.");
  }

  const result = data.AuthenticationResult as
    | { AccessToken?: string; IdToken?: string; RefreshToken?: string; ExpiresIn?: number }
    | undefined;
  if (!result?.AccessToken) throw new Error("Sign-in failed. Please try again.");

  sessionStorage.removeItem(OTP_SESSION_KEY);
  storeSession(result.AccessToken, result.IdToken, result.ExpiresIn);
  if (result.RefreshToken) storeRefreshToken(result.RefreshToken, "email");
}

/** Store a fresh access + id token and its expiry. */
function storeSession(accessToken: string, idToken: string | undefined, expiresInSec?: number): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (idToken) localStorage.setItem(ID_TOKEN_KEY, idToken);
  localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + (expiresInSec ?? 3600) * 1000));
}

/** Store the long-lived refresh token + which flow issued it (so we refresh the right way). */
function storeRefreshToken(refreshToken: string, method: "oauth" | "email"): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(REFRESH_EXPIRES_AT_KEY, String(Date.now() + REFRESH_TOKEN_DAYS * 86_400_000));
  localStorage.setItem(AUTH_METHOD_KEY, method);
}

function clearTokens(): void {
  if (typeof window === "undefined") return;
  for (const key of [
    ACCESS_TOKEN_KEY,
    ID_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
    REFRESH_EXPIRES_AT_KEY,
    AUTH_METHOD_KEY,
    EXPIRES_AT_KEY,
  ]) {
    localStorage.removeItem(key);
  }
}

/** Bearer token for API calls, or null when expired / unauthenticated / in demo mode. */
export function getAccessToken(): string | null {
  if (!isConfigured) return null;
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const expiresAt = Number(localStorage.getItem(EXPIRES_AT_KEY) ?? 0);
  if (!token || Date.now() >= expiresAt) return null;
  return token;
}

/** A refresh token we estimate is still usable (the real check is the refresh call). */
function hasValidRefreshToken(): boolean {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem(REFRESH_TOKEN_KEY);
  const expiresAt = Number(localStorage.getItem(REFRESH_EXPIRES_AT_KEY) ?? 0);
  return Boolean(token) && Date.now() < expiresAt;
}

// Dedupe concurrent refreshes (many API calls can race when the access token expires).
let refreshing: Promise<boolean> | null = null;

/**
 * Exchange the refresh token for a new access token, via the same flow that issued it
 * (OAuth /token for Google sign-ins, Cognito REFRESH_TOKEN_AUTH for email-OTP). Returns
 * false (and clears the session) if the token is revoked/expired.
 */
function refresh(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) return false;
    try {
      if (localStorage.getItem(AUTH_METHOD_KEY) === "email") {
        const data = await cipCall("InitiateAuth", {
          AuthFlow: "REFRESH_TOKEN_AUTH",
          ClientId: CLIENT_ID,
          AuthParameters: { REFRESH_TOKEN: refreshToken },
        });
        const r = data.AuthenticationResult as
          | { AccessToken?: string; IdToken?: string; ExpiresIn?: number }
          | undefined;
        if (!r?.AccessToken) throw new Error("no token");
        storeSession(r.AccessToken, r.IdToken, r.ExpiresIn);
      } else {
        const res = await fetch(`https://${DOMAIN}/oauth2/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            client_id: CLIENT_ID,
            refresh_token: refreshToken,
          }),
        });
        if (!res.ok) throw new Error("refresh failed");
        const t = (await res.json()) as { access_token: string; id_token?: string; expires_in: number };
        storeSession(t.access_token, t.id_token, t.expires_in);
      }
      return true;
    } catch {
      clearTokens(); // refresh token no longer valid — fall back to signed-out
      return false;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/**
 * The bearer token for an API call, refreshing it silently first if it's expired but the
 * refresh token is still good. Null when there's no way to authenticate (demo mode, or
 * both tokens gone). This is what api.ts should use to attach the bearer.
 */
export async function getValidAccessToken(): Promise<string | null> {
  if (!isConfigured) return null; // demo mode: no bearer (backend permits all locally)
  const token = getAccessToken();
  if (token) return token;
  if (!hasValidRefreshToken()) return null;
  return (await refresh()) ? getAccessToken() : null;
}

/**
 * The signed-in user's email, decoded from the stored ID token's `email` claim, or
 * null (demo mode / no token / unparseable). Display-only — we don't verify the token.
 */
export function getEmail(): string | null {
  if (typeof window === "undefined") return null;
  const idToken = localStorage.getItem(ID_TOKEN_KEY);
  if (!idToken) return null;
  try {
    const payload = idToken.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const claims = JSON.parse(json) as { email?: string };
    return claims.email ?? null;
  } catch {
    return null;
  }
}

/**
 * Demo mode is "signed in" unless explicitly signed out; otherwise the session is live
 * when there's a valid access token OR a refresh token we can swap for one — so an
 * expired access token (after ~1h, or returning after a day) doesn't read as signed out.
 */
export function isAuthenticated(): boolean {
  if (!isConfigured) {
    return typeof window === "undefined" || sessionStorage.getItem(DEMO_LOGOUT_KEY) === null;
  }
  return getAccessToken() !== null || hasValidRefreshToken();
}

/** Clears the demo "signed out" flag — called when the user signs in again locally. */
export function clearDemoSession(): void {
  if (typeof window !== "undefined") sessionStorage.removeItem(DEMO_LOGOUT_KEY);
}

/** Sign out: clear tokens and (when configured) end the Hosted UI session. */
export function logout(): void {
  clearTokens(); // access + id + refresh tokens and their expiries
  clearOnboardingForm(); // don't leak a half-filled wizard to the next user on this tab
  void clearPersistedDraft(); // …including the durable draft (sessionStorage + IndexedDB)
  // The theme is a per-signed-in-user preference: reset to system on sign out so the
  // signed-out app (landing/login) always uses the system theme. ("theme" is
  // next-themes' default storage key; clearing it falls back to defaultTheme="system".)
  localStorage.removeItem("theme");
  setOnboarded(false); // hide the Jobs/Profile tabs
  // location.replace (not assign): swap the page we signed out from OUT of history so
  // pressing Back can't return to it. Deeper protected entries are still caught by
  // useRequireAuth's bfcache re-check, which also replaces them with /login.
  if (!isConfigured) {
    sessionStorage.setItem(DEMO_LOGOUT_KEY, "1"); // demo: remember we signed out
    window.location.replace("/login/");
    return;
  }
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    logout_uri: `${window.location.origin}/login`,
  });
  window.location.replace(`https://${DOMAIN}/logout?${params.toString()}`);
}
