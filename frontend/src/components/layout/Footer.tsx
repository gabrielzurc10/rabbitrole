"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The marketing/landing, signed-in account pages, and the legal/contact pages get
// the footer. The focused flows (login, onboarding, analyzing, jobs) stay chrome-free.
const FOOTER_ROUTES = ["/", "/profile", "/terms", "/privacy", "/contact"];

/**
 * Site footer with the legal + contact links. Rendered once from the root layout
 * but scoped by pathname so it only appears on the landing, profile, and legal
 * pages. The static export uses trailing slashes, so normalize before matching.
 */
export function Footer() {
  const pathname = usePathname();
  const route = pathname !== "/" ? pathname.replace(/\/$/, "") : "/";
  if (!FOOTER_ROUTES.includes(route)) return null;

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="site-footer-copy">
          © {new Date().getFullYear()} rabbitrole
        </p>
        <nav className="site-footer-links">
          <Link href="/terms/" className="site-footer-link">
            Terms
          </Link>
          <Link href="/privacy/" className="site-footer-link">
            Privacy
          </Link>
          <Link href="/contact/" className="site-footer-link">
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  );
}
