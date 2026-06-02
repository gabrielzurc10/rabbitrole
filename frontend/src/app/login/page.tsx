"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { handleRedirectCallback, login, isConfigured } from "@/lib/auth";

function LoginCard() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const handled = useRef(false);

  // While exchanging the Hosted UI ?code=, show a spinner instead of the form
  // so the sign-in card doesn't flash before we redirect onward.
  const exchanging = params.has("code") && !error;

  // Land on the Jobs tab after sign-in; that page sends users who haven't
  // onboarded yet to the wizard, so it stays robust even if the API is cold.
  const proceed = useCallback(() => {
    router.replace("/jobs");
  }, [router]);

  // Returning from the Hosted UI with a ?code= — finish the token exchange.
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

  function start(provider?: string) {
    setError(null);
    setBusy(true);
    try {
      // Demo mode has no real OAuth — go straight in.
      if (isConfigured) {
        void login(provider);
      } else {
        proceed();
      }
    } catch {
      setError("Could not start sign-in. Please try again.");
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
              Sign in to analyze your resume
            </p>

            <div className="mt-6 space-y-2">
              <Button
                variant="outline"
                className="w-full"
                disabled={busy}
                onClick={() => start("Google")}
              >
                <Icon name="rabbit" className="h-4 w-4" />
                Continue with Google
              </Button>
              <Button className="w-full" disabled={busy} onClick={() => start()}>
                <Icon name="file-text" className="h-4 w-4" />
                Sign in with email
              </Button>
            </div>

            {error && (
              <p className="mt-4 text-center text-sm text-critical">{error}</p>
            )}

            <p className="mt-6 text-center text-xs text-muted-foreground">
              {isConfigured
                ? "Passwordless email or Google — handled securely by Cognito."
                : "Demo mode: no sign-in configured locally."}{" "}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => proceed()}
              >
                Skip for demo
              </button>
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
