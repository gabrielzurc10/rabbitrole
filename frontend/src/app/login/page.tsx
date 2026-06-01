"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { handleRedirectCallback, login, isConfigured } from "@/lib/auth";

function LoginCard() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Returning from the Hosted UI with a ?code= — finish the token exchange.
  useEffect(() => {
    handleRedirectCallback()
      .then((handled) => {
        if (handled) router.push("/dashboard");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Sign-in failed."));
  }, [router]);

  async function start(provider?: string) {
    setError(null);
    setBusy(true);
    try {
      await login(provider);
    } catch {
      setError("Could not start sign-in. Please try again.");
      setBusy(false);
    }
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
              <Link href="/dashboard" className="text-primary hover:underline">
                Skip for demo
              </Link>
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
