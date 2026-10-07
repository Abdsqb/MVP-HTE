"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/lib/config";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/upload", label: "Upload" },
  { href: "/library", label: "Portal library" },
  { href: "/audit", label: "Audit log" },
];

export default function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-bg/80 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-sm font-bold">
            {APP_NAME[0]}
          </span>
          {APP_NAME}
        </Link>
        <div className="flex items-center gap-1 text-sm">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                isActive(link.href) ? "bg-surface-2 text-white" : "text-muted hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <Link
          href="/portals"
          target="_blank"
          className="ml-auto rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:text-white"
        >
          Demo portals ↗
        </Link>
      </nav>
    </header>
  );
}
