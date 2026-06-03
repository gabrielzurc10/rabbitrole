"use client";

import { type FormEvent, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  handleRedirectCallback,
  isAuthenticated,
  login,
  requestEmailCode,
  verifyEmailCode,
  isConfigured,
} from "@/lib/auth";
import { getProfile, warmUp } from "@/lib/api";

function LoginCard() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<"choose" | "code">("choose");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [routing, setRouting] = useState(false);
  const handled = useRef(false);

  // Nudge the backend awake the moment the sign-in page loads, so the cold start
  // overlaps the time the user spends typing — their first real call is warm.
  useEffect(() => {
    warmUp();
  }, []);

  // While exchanging the Google Hosted-UI ?code= (or resolving where to go next),
  // show a spinner instead of the form so the sign-in card doesn't flash.
  const exchanging = (params.has("code") || routing) && !error;

  // After sign-in, send brand-new accounts straight to onboarding and returning
  // users to the Jobs tab. We check the profile here; a new account gets a 204
  // (no profile yet) which getProfile() reports as null — no console error.
  const proceed = useCallback(async () => {
    setRouting(true);
    try {
      const profile = await getProfile();
      router.replace(profile ? "/jobs" : "/onboarding");
    } catch {
      // Network/cold-start hiccup: fall back to Jobs, which has its own gate.
      router.replace("/jobs");
    }
  }, [router]);

  // Returning from Google with a ?code= — finish the token exchange.
  useEffect(() => {
    if (handled.current) return; // guard against a double effect run
    handled.current = true;
    handleRedirectCallback()
      .then((done) => {
        if (done) proceed();
      })
      .catch((e) => {
        handled.current = false;
        setError(e instanceof Error ? e.message : "Sign-in failed.");
      });
  }, [proceed]);

  // Already signed in but landed here anyway (e.g. pressed Back to /login)? Skip
  // the form and go straight into the app. Configured mode only — demo mode is
  // always "authenticated", and we want the login page usable there. Re-check on
  // pageshow so a back/forward-cache restore bounces too. Skip while a Google
  // ?code= is still being exchanged (the effect above handles that).
  useEffect(() => {
    if (!isConfigured) return;
    const bounce = () => {
      if (!params.has("code") && isAuthenticated()) proceed();
    };
    bounce();
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) bounce();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [params, proceed]);

  function startGoogle() {
    setError(null);
    setBusy(true);
    try {
      if (isConfigured) void login("Google");
      else proceed(); // demo mode
    } catch {
      setError("Could not start sign-in. Please try again.");
      setBusy(false);
    }
  }

  async function sendCode(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    if (!isConfigured) {
      proceed(); // demo mode: no real OTP
      return;
    }
    setBusy(true);
    try {
      await requestEmailCode(email.trim());
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a code.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await verifyEmailCode(email.trim(), code.trim());
      proceed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify the code.");
      setBusy(false);
    }
  }

  if (exchanging) {
    return (
      <div className="page">
        <div className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center text-center">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <span className="absolute inset-0 rounded-full border-4 border-muted border-t-primary motion-safe:animate-spin" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Signing you in…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="mx-auto max-w-md">
        <Card className="motion-safe:animate-[slide-up_0.4s_ease-out_both]">
          <CardBody>
            <h1 className="text-center text-2xl font-semibold tracking-tight">
              Welcome to rabbit<span className="gradient-text">role</span>
            </h1>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              {step === "code" ? "Enter the code we emailed you" : "Sign in to analyze your resume"}
            </p>

            {step === "choose" ? (
              <>
                <div className="mt-6">
                  <Button variant="outline" className="w-full" disabled={busy} onClick={startGoogle}>
                    Continue with Google
                  </Button>
                </div>

                <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  or
                  <span className="h-px flex-1 bg-border" />
                </div>

                <form onSubmit={sendCode} className="space-y-3">
                  <input
                    type="email"
                    required
                    className="input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Button type="submit" className="w-full" disabled={busy}>
                    <Icon name="mail" className="h-4 w-4" />
                    {busy ? "Sending…" : "Email me a code"}
                  </Button>
                </form>
              </>
            ) : (
              <form onSubmit={verify} className="mt-6 space-y-3">
                <p className="text-center text-sm text-muted-foreground">
                  We emailed a code to{" "}
                  <span className="font-medium text-foreground">{email}</span>.
                </p>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  className="input text-center tracking-[0.3em]"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoFocus
                />
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Verifying…" : "Verify & sign in"}
                </Button>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <button
                    type="button"
                    className="hover:text-foreground"
                    onClick={() => {
                      setStep("choose");
                      setCode("");
                      setError(null);
                    }}
                  >
                    Use a different email
                  </button>
                  <button
                    type="button"
                    className="hover:text-foreground"
                    disabled={busy}
                    onClick={() => sendCode()}
                  >
                    Resend code
                  </button>
                </div>
              </form>
            )}

            {error && <p className="mt-4 text-center text-sm text-critical">{error}</p>}

            <p className="mt-6 text-center text-xs text-muted-foreground">
              {isConfigured
                ? "Passwordless — we email you a one-time code."
                : "Demo mode: no sign-in configured locally."}
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginCard />
    </Suspense>
  );
}
