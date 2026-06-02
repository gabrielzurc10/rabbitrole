import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AuthButton } from "@/components/layout/AuthButton";
import { NavTabs } from "@/components/layout/NavTabs";

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
          <NavTabs />
          <ThemeToggle />
          <AuthButton />
        </nav>
      </div>
    </header>
  );
}
