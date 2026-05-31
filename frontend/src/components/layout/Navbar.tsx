import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="brand">
          <Icon name="rabbit" className="text-primary" />
          <span>
            rabbit<span className="gradient-text">role</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/dashboard" className="btn btn-ghost btn-sm">
            Dashboard
          </Link>
          <Link href="/jobs" className="btn btn-ghost btn-sm">
            Jobs
          </Link>
          <ThemeToggle />
          <Link href="/login" className="btn btn-primary btn-sm">
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
