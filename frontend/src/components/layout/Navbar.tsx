"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthButton } from "@/components/layout/AuthButton";
import { NavTabs } from "@/components/layout/NavTabs";
import { isSigningIn, subscribeSigningIn } from "@/lib/signingStatus";
import { cn } from "@/lib/cn";

export function Navbar() {
  const pathname = usePathname();
  const signingIn = useSyncExternalStore(subscribeSigningIn, isSigningIn, () => false);
  // Minimal header (no tabs/controls) on the focused sign-in + analyze pages.
  const minimal = pathname.startsWith("/login") || pathname.startsWith("/analyzing");
  // Brand is non-clickable only while a transient step is *running* — the analyze
  // animation, or the "Signing you in…" animation — so users can't bail mid-step. On the
  // normal sign-in form the logo stays clickable (back to the landing page).
  const lockBrand = pathname.startsWith("/analyzing") || signingIn;
  return (
    <header className="navbar">
      <div className="navbar-inner">
        {lockBrand ? (
          // Same mark, but a plain span — no link, no hover hop — so it does nothing.
          <span className={cn("brand justify-self-start select-none", !minimal && "max-sm:hidden")}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static export, unoptimized */}
            <img src="/icons/rabbitrole.png" alt="" className="h-12 w-auto" />
            <span className="-ml-4">
              rabbit<span className="gradient-text">role</span>
            </span>
          </span>
        ) : (
          <Link href="/" className={cn("brand justify-self-start", !minimal && "max-sm:hidden")}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static export, unoptimized */}
            <img src="/icons/rabbitrole.png" alt="" className="h-12 w-auto" />
            <span className="-ml-4">
              rabbit<span className="gradient-text">role</span>
            </span>
          </Link>
        )}
        {!minimal && (
          <>
            {/* Tabs sit in the bar on every size now (no burger). Pinned to col 2 so they
                stay centered even on mobile, where the brand is hidden to make room. */}
            <nav className="col-start-2 flex items-center gap-2 justify-self-center">
              <NavTabs />
            </nav>
            <div className="col-start-3 flex items-center gap-1 justify-self-end">
              <AuthButton />
            </div>
          </>
        )}
      </div>
    </header>
  );
}
