"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { AuthButton } from "@/components/layout/AuthButton";
import { NavTabs } from "@/components/layout/NavTabs";
import { MobileMenu } from "@/components/layout/MobileMenu";

export function Navbar() {
  // On the sign-in page keep the header minimal — just the brand, nothing else.
  const onLogin = usePathname() === "/login";
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="brand group justify-self-start">
          <Icon
            name="rabbit"
            className="text-primary motion-safe:group-hover:animate-[hop_0.6s_ease-in-out]"
          />
          <span>
            rabbit<span className="gradient-text">role</span>
          </span>
        </Link>
        {!onLogin && (
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
