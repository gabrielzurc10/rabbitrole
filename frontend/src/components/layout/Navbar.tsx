"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AuthButton } from "@/components/layout/AuthButton";
import { NavTabs } from "@/components/layout/NavTabs";

export function Navbar() {
  // On the sign-in page keep the header minimal — just the brand, nothing else.
  const onLogin = usePathname() === "/login";
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="brand">
          <Icon name="rabbit" className="text-primary" />
          <span>
            rabbit<span className="gradient-text">role</span>
          </span>
        </Link>
        {!onLogin && (
          <nav className="flex items-center gap-1">
            <NavTabs />
            <ThemeToggle />
            <AuthButton />
          </nav>
        )}
      </div>
    </header>
  );
}
