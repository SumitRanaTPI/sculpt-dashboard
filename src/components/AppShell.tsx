"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { initialsOf, useProfile } from "@/components/ProfileProvider";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/garments", label: "Garments" },
  { href: "/specs", label: "Specs" },
  { href: "/studio", label: "Studio" },
] as const;

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const profile = useProfile();
  const initials = profile.status === "ready" ? initialsOf(profile.data.display_name) : "";

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar__inner">
          <Link href="/" className="brand">
            <Logo size={32} />
            <span className="brand__word">
              Sculpt<span>.</span>
            </span>
          </Link>
          <nav className="nav" aria-label="Studio">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={item.href === "/studio" ? "nav__studio" : undefined}
                aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link href="/studio" className="avatar" aria-label="Studio profile" title="Studio">
            {initials || "·"}
          </Link>
        </div>
      </header>
      <main className="page">{children}</main>
    </div>
  );
}
