import Link from "next/link";
import { Emblem } from "@/components/emblem";

export default function NotFound() {
  return (
    <main className="grid min-h-[100svh] place-items-center px-6 text-center">
      <div>
        <Emblem className="mx-auto w-20 text-platinum/70" />
        <h1 className="wide-section mt-8 text-display text-platinum">Halaman tidak ditemukan</h1>
        <p className="mx-auto mt-3 max-w-[34ch] text-body text-steel">
          Mungkin link-nya sudah berubah. Stok terbaru selalu ada di beranda.
        </p>
        <Link
          href="/"
          className="press mt-8 inline-flex min-h-[52px] items-center rounded-full bg-xenon px-7 text-lead font-semibold text-xenon-ink"
        >
          Lihat stok
        </Link>
      </div>
    </main>
  );
}
