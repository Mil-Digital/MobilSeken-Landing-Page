import type { Metadata } from "next";
import Link from "next/link";
import { Emblem } from "@/components/emblem";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-dark min-h-[100svh]">
      <header className="sticky top-0 z-30 border-b border-hairline bg-night">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between gap-3 px-4 md:px-8">
          <Link href="/admin" className="flex shrink-0 items-center gap-2.5">
            <Emblem className="w-9 text-platinum" />
            <span className="leading-none max-sm:hidden">
              <span className="wordmark block text-[15px] text-platinum">MS Garage</span>
              <span className="mt-1 block font-mono text-[10.5px] tracking-[0.14em] text-steel uppercase">Admin</span>
            </span>
          </Link>
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto max-w-[1320px] px-4 pt-6 pb-20 md:px-8 md:pt-8">{children}</main>
    </div>
  );
}
