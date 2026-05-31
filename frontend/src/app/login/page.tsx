"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [email, setEmail] = useState("");

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
              <Button variant="outline" className="w-full">
                <Icon name="rabbit" className="h-4 w-4" />
                Continue with Google
              </Button>
            </div>

            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
              <div>
                <label htmlFor="email" className="label">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full">
                Send magic link
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Passwordless — we&apos;ll email you a one-time code.{" "}
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
