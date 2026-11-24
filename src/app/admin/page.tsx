import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { carPath } from "@/lib/cars";
import { priceShort } from "@/lib/format";
import { readStoredCars } from "@/lib/store/local";
import { RefreshButton } from "./refresh-button";
import { StatusSelect } from "./status-select";

export default function AdminHome() {
  return (
    <div>
      <h1 className="wide-section text-title text-platinum">Mobil dari OLX</h1>
      <p className="mt-2 max-w-[60ch] text-body text-steel">
        Untuk menambah atau memperbarui mobil: buka iklan OLX MS Garage di browser, lalu ketuk tombol{" "}
        <strong className="text-platinum">Kirim ke MS Garage</strong>. Belum pasang tombolnya?{" "}
        <Link href="/admin/tombol" className="text-xenon underline underline-offset-4">
          Lihat caranya
        </Link>
        .
      </p>
      <Suspense fallback={<p className="mt-8 text-body text-steel">Memuat…</p>}>
        <CarList />
      </Suspense>
    </div>
  );
}

async function CarList() {
  await connection(); // selalu baca data terbaru
  const cars = await readStoredCars();
  if (cars.length === 0) {
    return (
      <div className="mt-8 rounded-[18px] border border-dashed border-hairline bg-cabin p-6 text-body text-steel">
        Belum ada mobil hasil impor. Selama katalog kosong, landing page menampilkan data contoh.
      </div>
    );
  }
  return (
    <>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-panel p-3">
      <p className="text-micro text-steel">
        Landing page menampilkan {cars.filter((c) => c.status !== "sold").length} mobil di daftar ini (kecuali yang berstatus
        Terjual). Perubahan muncul otomatis dalam ±1 menit.
      </p>
      <RefreshButton />
    </div>
    <ul className="mt-4 grid gap-3">
      {cars.map((c) => (
        <li key={c.id} className="flex items-center gap-3 rounded-[16px] border border-hairline bg-cabin p-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.images[0]?.src} alt="" className="h-16 w-20 shrink-0 rounded-[10px] object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-semibold text-platinum">
              {c.brand} {c.model} {c.year}
            </p>
            <p className="tnum mt-0.5 text-micro text-steel">
              {c.id} · {priceShort(c.price)} · {c.images.length} foto
            </p>
            <p className="mt-0.5 truncate text-micro text-steel">
              Sinkron {new Date(c.olx.syncedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 text-micro">
            <StatusSelect id={c.id} value={c.status} />
            <Link href={carPath(c)} className="text-xenon underline underline-offset-4">
              Lihat di web
            </Link>
            <a href={c.olx.url} target="_blank" rel="noopener" className="text-steel underline underline-offset-4">
              Iklan OLX
            </a>
          </div>
        </li>
      ))}
    </ul>
    </>
  );
}
