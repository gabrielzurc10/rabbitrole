// Blocking, pre-paint redirect for signed-in visitors hitting the landing page.
//
// The site is a static export prerendered signed-out, so a hard load of "/" paints
// the marketing HTML first; LandingGate can only redirect after React hydrates and
// reads the session, which shows the landing for a frame before jumping to the app.
// This inline <head> script runs before the body paints — it mirrors isAuthenticated()
// / isOnboarded() (lib/auth + lib/session) against localStorage and replaces the URL
// straight away, so a signed-in user never sees the landing flash. LandingGate stays
// as the fallback (client-side soft navigations, storage disabled, etc.).
//
// Keep the storage keys / "configured" rule in sync with lib/auth.ts.

const CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_COGNITO_DOMAIN && process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
);

const SCRIPT = `(function () {
  try {
    var p = location.pathname;
    if (p !== "/" && p !== "/index.html") return;
    var now = Date.now();
    var authed;
    if (${CONFIGURED ? "true" : "false"}) {
      var hasAccess = !!localStorage.getItem("rr.accessToken") &&
        now < Number(localStorage.getItem("rr.expiresAt") || 0);
      var hasRefresh = !!localStorage.getItem("rr.refreshToken") &&
        now < Number(localStorage.getItem("rr.refreshExpiresAt") || 0);
      authed = hasAccess || hasRefresh;
    } else {
      authed = sessionStorage.getItem("rr.demoLoggedOut") === null;
    }
    if (!authed) return;
    location.replace(localStorage.getItem("rr.onboarded") === "1" ? "/jobs/" : "/onboarding/");
  } catch (e) {}
})();`;

/** Renders the pre-paint landing redirect as a blocking inline <head> script. */
export function LandingRedirectScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
