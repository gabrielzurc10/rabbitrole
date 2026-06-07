// Auth, no SDK (keeps the static bundle lean — see CLAUDE.md):
//  - Email: passwordless one-time code, in-app, via Cognito's USER_AUTH API
//    (InitiateAuth/RespondToAuthChallenge over fetch — no Hosted UI redirect).
//  - Google: Cognito Hosted UI redirect (OAuth Authorization Code + PKCE).
//
// Offline-friendly: when the Cognito env vars are absent (local `npm run dev`),
// auth runs in "demo mode" — login just routes into the app and no bearer token
// is sent, which pairs with the backend's local permit-all security.
import { setOnboarded } from "@/lib/session";

const DOMAIN = process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? "";
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "";
const REGION = process.env.NEXT_PUBLIC_COGNITO_REGION ?? "us-east-1";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const SCOPES = "openid email profile";

const CIP_ENDPOINT = `https://cognito-idp.${REGION}.amazonaws.com/`;

const ACCESS_TOKEN_KEY = "rr.accessToken";
const ID_TOKEN_KEY = "rr.idToken"; // kept only to read the email claim for display
const EXPIRES_AT_KEY = "rr.expiresAt";
const VERIFIER_KEY = "rr.pkceVerifier";
const OTP_SESSION_KEY = "rr.otpSession";
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

  const token = (await res.json()) as {
    access_token: string;
    id_token?: string;
    expires_in: number;
  };
  localStorage.setItem(ACCESS_TOKEN_KEY, token.access_token);
  if (token.id_token) localStorage.setItem(ID_TOKEN_KEY, token.id_token);
  localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + token.expires_in * 1000));

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
    | { AccessToken?: string; IdToken?: string; ExpiresIn?: number }
    | undefined;
  if (!result?.AccessToken) throw new Error("Sign-in failed. Please try again.");

  sessionStorage.removeItem(OTP_SESSION_KEY);
  localStorage.setItem(ACCESS_TOKEN_KEY, result.AccessToken);
  if (result.IdToken) localStorage.setItem(ID_TOKEN_KEY, result.IdToken);
  localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + (result.ExpiresIn ?? 3600) * 1000));
}

/** Bearer token for API calls, or null when unauthenticated / in demo mode. */
export function getAccessToken(): string | null {
  if (!isConfigured) return null;
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const expiresAt = Number(localStorage.getItem(EXPIRES_AT_KEY) ?? 0);
  if (!token || Date.now() >= expiresAt) return null;
  return token;
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

/** Demo mode is "signed in" unless explicitly signed out; otherwise gate on a live token. */
export function isAuthenticated(): boolean {
  if (!isConfigured) {
    return typeof window === "undefined" || sessionStorage.getItem(DEMO_LOGOUT_KEY) === null;
  }
  return getAccessToken() !== null;
}

/** Clears the demo "signed out" flag — called when the user signs in again locally. */
export function clearDemoSession(): void {
  if (typeof window !== "undefined") sessionStorage.removeItem(DEMO_LOGOUT_KEY);
}

/** Sign out: clear tokens and (when configured) end the Hosted UI session. */
export function logout(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(ID_TOKEN_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
  setOnboarded(false); // hide the Jobs/Profile tabs
  if (!isConfigured) {
    sessionStorage.setItem(DEMO_LOGOUT_KEY, "1"); // demo: remember we signed out
    window.location.assign("/login/");
    return;
  }
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    logout_uri: `${window.location.origin}/login`,
  });
  window.location.assign(`https://${DOMAIN}/logout?${params.toString()}`);
}
