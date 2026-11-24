"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Laporan" },
  { href: "/admin/katalog", label: "Katalog" },
  { href: "/admin/tombol", label: "Tombol OLX" },
  { href: "/", label: "Web" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="no-scrollbar -mr-2 flex min-w-0 items-center gap-1 overflow-x-auto rounded-full border border-hairline bg-cabin p-1">
      {LINKS.map((l) => {
        const on = l.href === "/admin" ? path === "/admin" : l.href !== "/" && path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={on ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-micro font-medium whitespace-nowrap transition-colors md:px-4 ${
              on ? "bg-platinum text-night" : "text-steel hover:text-platinum"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
