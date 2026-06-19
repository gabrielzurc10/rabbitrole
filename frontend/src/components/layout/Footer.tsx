"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

// The marketing/landing, signed-in account pages, and the legal/contact pages get
// the footer. The focused flows (login, onboarding, analyzing, jobs) stay chrome-free.
const FOOTER_ROUTES = ["/", "/profile", "/terms", "/privacy", "/contact"];

// Auth only flips alongside navigation, so a no-op subscribe (re-read each render) is
// enough — same pattern as LandingGate.
const noopSubscribe = () => () => {};

const LINK_COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Get started", href: "/login/" },
      { label: "How it works", href: "/#how-it-works" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/terms/" },
      { label: "Privacy", href: "/privacy/" },
    ],
  },
  {
    title: "Support",
    links: [{ label: "Contact", href: "/contact/" }],
  },
];

/**
 * Site footer: a brand block + tagline alongside grouped navigation columns, with a
 * centered copyright bar below. Rendered once from the root layout
 * but scoped by pathname so it only appears on the landing, profile, and legal pages.
 * The static export uses trailing slashes, so normalize before matching.
 */
export function Footer() {
  const pathname = usePathname();
  const authed = useSyncExternalStore(noopSubscribe, isAuthenticated, () => false);
  const route = pathname !== "/" ? pathname.replace(/\/$/, "") : "/";
  if (!FOOTER_ROUTES.includes(route)) return null;

  // "Product" is marketing — drop it once the visitor is signed in.
  const columns = authed ? LINK_COLUMNS.filter((c) => c.title !== "Product") : LINK_COLUMNS;

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-top">
          {/* Brand + tagline */}
          <div>
            <Link href="/" className="brand">
              {/* eslint-disable-next-line @next/next/no-img-element -- static export, unoptimized */}
              <img src="/icons/rabbitrole.png" alt="" className="h-12 w-auto" />
              <span className="-ml-4">
                rabbit<span className="gradient-text">role</span>
              </span>
            </Link>
            <p className="footer-tagline">
              AI resume reviewer &amp; job matcher. Get clear, prioritized feedback,
              then the live jobs you genuinely match.
            </p>
          </div>

          {/* Navigation columns */}
          <div className="footer-cols">
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="footer-col-title">{col.title}</h3>
                <nav className="footer-col">
                  {col.links.map((link) => (
                    <Link key={link.label} href={link.href} className="site-footer-link">
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </div>
            ))}
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} rabbitrole. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
