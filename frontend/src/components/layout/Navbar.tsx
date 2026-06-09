"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { AuthButton } from "@/components/layout/AuthButton";
import { NavTabs } from "@/components/layout/NavTabs";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { isSigningIn, subscribeSigningIn } from "@/lib/signingStatus";

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
          <span className="brand justify-self-start select-none">
            <Icon name="rabbit" className="text-primary" />
            <span>
              rabbit<span className="gradient-text">role</span>
            </span>
          </span>
        ) : (
          <Link href="/" className="brand group justify-self-start">
            <Icon
              name="rabbit"
              className="text-primary motion-safe:group-hover:animate-[hop_0.6s_ease-in-out]"
            />
            <span>
              rabbit<span className="gradient-text">role</span>
            </span>
          </Link>
        )}
        {!minimal && (
          <>
            {/* Desktop: centered tabs. Mobile: tabs move into the burger menu. */}
            <nav className="hidden items-center gap-2 justify-self-center sm:flex">
              <NavTabs />
            </nav>
            {/* Pin to the last column: on mobile the hidden nav is dropped from the
                grid, so without this the controls would auto-place into the center. */}
            <div className="col-start-3 flex items-center gap-1 justify-self-end">
              <AuthButton />
              <MobileMenu />
            </div>
          </>
        )}
      </div>
    </header>
  );
}
