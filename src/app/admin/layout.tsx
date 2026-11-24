import type { Metadata } from "next";
import Link from "next/link";
import { Emblem } from "@/components/emblem";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100svh] bg-night">
      <header className="sticky top-0 z-30 border-b border-hairline bg-cabin/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[960px] items-center justify-between gap-3 px-4">
          <Link href="/admin" className="flex items-center gap-2">
            <Emblem className="w-9 text-platinum" />
            <span className="wordmark text-[15px] text-platinum">Admin</span>
          </Link>
          <nav className="flex items-center gap-1 text-body">
            <Link href="/admin" className="rounded-[10px] px-3 py-2 text-platinum/80 hover:bg-panel">
              Mobil
            </Link>
            <Link href="/admin/tombol" className="rounded-[10px] px-3 py-2 text-platinum/80 hover:bg-panel">
              Tombol OLX
            </Link>
            <Link href="/" className="rounded-[10px] px-3 py-2 text-platinum/80 hover:bg-panel">
              Web
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[960px] px-4 pt-6 pb-16">{children}</main>
    </div>
  );
}
