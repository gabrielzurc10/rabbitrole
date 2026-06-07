"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { AuthButton } from "@/components/layout/AuthButton";
import { NavTabs } from "@/components/layout/NavTabs";

export function Navbar() {
  // On the sign-in page keep the header minimal — just the brand, nothing else.
  const onLogin = usePathname() === "/login";
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="brand justify-self-start">
          <Icon name="rabbit" className="text-primary" />
          <span>
            rabbit<span className="gradient-text">role</span>
          </span>
        </Link>
        {!onLogin && (
          <>
            <nav className="flex items-center gap-2 justify-self-center">
              <NavTabs />
            </nav>
            <div className="flex items-center gap-1 justify-self-end">
              <AuthButton />
            </div>
          </>
        )}
      </div>
    </header>
  );
}
