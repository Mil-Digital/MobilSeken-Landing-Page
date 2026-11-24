"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { IconCalendar, IconGauge, IconGear } from "@/components/icons";
import type { CarStatus } from "@/lib/cars";
import { CATEGORIES, suggestCategory, type Category } from "@/lib/category";
import { priceFull } from "@/lib/format";
import { decodePayload } from "@/lib/olx/bookmarklet";
import { normalizeOlx, type OlxListing } from "@/lib/olx/parse";
import { importFromOlx, type ImportState } from "./actions";

type Loaded =
  | { payload: unknown; listing: OlxListing }
  | { bulk: { payload: unknown; listing: OlxListing | null; error: string | null }[] }
  | { error: string }
  | null;

export function ImportPreview({ sellers }: { sellers: string[] }) {
  const [data, setData] = useState<Loaded>(null);
  const [status, setStatus] = useState<CarStatus>("ready");
  // null = pakai saran otomatis (atau kategori lama bila mobil sudah ada di web)
  const [category, setCategory] = useState<Category | null>(null);
  const [result, setResult] = useState<ImportState | null>(null);
  const [pending, start] = useTransition();

  // Data iklan dibawa tombol di bagian "#" URL (tidak pernah terkirim ke server sampai disimpan).
  useEffect(() => {
    const read = () => {
      if (!location.hash.includes("d=")) return setData(null);
      try {
        const payload = decodePayload(location.hash) as { bulk?: unknown[] } | null;
        if (payload && Array.isArray(payload.bulk)) {
          setData({
            bulk: payload.bulk.map((item) => {
              try {
                return { payload: item, listing: normalizeOlx(item), error: null };
              } catch (e) {
                return { payload: item, listing: null, error: (e as Error).message };
              }
            }),
          });
          return;
        }
        setData({ payload, listing: normalizeOlx(payload) });
      } catch (e) {
        setData({ error: (e as Error).message || "Data iklan tidak bisa dibaca." });
      }
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  if (data === null) {
    return (
      <div className="rounded-[18px] border border-dashed border-hairline bg-cabin p-6">
        <h1 className="wide-section text-title text-platinum">Impor dari OLX</h1>
        <p className="mt-2 text-body text-steel">
          Halaman ini dibuka oleh tombol <strong className="text-platinum">Kirim ke MS Garage</strong> dari halaman iklan OLX.
        </p>
        <Link href="/admin/tombol" className="mt-4 inline-flex text-body text-[var(--accent-text)] underline underline-offset-4">
          Cara memasang tombolnya
        </Link>
      </div>
    );
  }
  if ("error" in data) {
    return <p className="rounded-[14px] bg-sold/10 p-4 text-body text-sold">{data.error}</p>;
  }
  if ("bulk" in data) return <BulkImport items={data.bulk} sellers={sellers} />;

  const { listing, payload } = data;
  const suggested = suggestCategory(listing);
  const own = listing.sellerId != null && sellers.includes(listing.sellerId);

  if (result?.ok) {
    return (
      <div className="rounded-[20px] border border-hairline bg-cabin p-6 text-center">
        <p className="text-micro text-steel">{result.created ? "Mobil baru ditambahkan" : "Data mobil diperbarui"}</p>
        <p className="wide mt-2 text-title text-platinum">
          {listing.brand} {listing.model}
        </p>
        <p className="tnum mt-1 text-body font-semibold whitespace-nowrap text-[var(--accent-text)]">{result.id}</p>
        <p className="mt-1 text-body text-steel">{result.photos} foto tersimpan di server sendiri.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href={result.path} className="press inline-flex h-12 items-center rounded-full bg-xenon px-6 text-body font-semibold text-xenon-ink">
            Lihat di web
          </Link>
          <Link href="/admin" className="press inline-flex h-12 items-center rounded-full border border-hairline px-6 text-body text-platinum">
            Daftar mobil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-micro text-steel">Pratinjau dari OLX · iklan {listing.listingId}</p>
      <h1 className="wide mt-1 text-title text-platinum">
        {listing.brand} {listing.model}
      </h1>
      <p className="mt-1 text-body text-steel">{listing.variant}</p>

      {!own && (
        <p className="mt-4 rounded-[14px] bg-sold/10 p-3 text-body text-sold">
          Iklan ini bukan dari akun OLX MS Garage, jadi tidak bisa diimpor.
        </p>
      )}

      {/* Foto: pratinjau langsung dari OLX (hanya di admin). Saat disimpan, foto disalin ke server sendiri. */}
      <div className="no-scrollbar -mx-4 mt-4 flex snap-x gap-2 overflow-x-auto px-4">
        {listing.images.map((img, i) => (
          <PreviewPhoto key={img.id} url={img.url.replace(";s=1080x0;q=90", ";s=640x0;q=70")} n={i + 1} w={img.width} h={img.height} />
        ))}
      </div>
      <p className="mt-2 text-micro text-steel">{listing.images.length} foto</p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="price-tag tnum">{priceFull(listing.price)}</span>
        <span className="spec-chip">
          <IconCalendar width={15} height={15} />
          {listing.year}
        </span>
        <span className="spec-chip">
          <IconGauge width={15} height={15} />
          {listing.mileageLabel ?? "-"}
        </span>
        <span className="spec-chip">
          <IconGear width={15} height={15} />
          {listing.transmission}
        </span>
      </div>

      <dl className="tnum mt-5 grid grid-cols-2 gap-x-6 border-t border-hairline text-body sm:grid-cols-3">
        {[
          ["Bahan bakar", listing.fuel],
          ["Warna", listing.color],
          ["Tipe bodi", listing.bodyType],
          ["Mesin", listing.engine ?? "-"],
          ["Status di OLX", listing.olxStatus === "active" ? "Aktif" : (listing.olxStatus ?? "-")],
        ].map(([k, v]) => (
          <div key={k} className="border-b border-hairline py-3">
            <dt className="text-micro text-steel">{k}</dt>
            <dd className="mt-0.5 text-platinum">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 rounded-[14px] border border-hairline bg-cabin p-4">
        <p className="text-body font-medium text-platinum">Kategori di web</p>
        <p className="mt-0.5 text-micro text-steel">
          Saran otomatis: <strong className="text-platinum">{suggested}</strong>. Hatchback, coupe, dan city car masuk Sedan.
          Bisa diubah lagi kapan saja di daftar mobil.
        </p>
        <div className="mt-3 inline-flex rounded-full bg-panel p-1 text-body" role="radiogroup" aria-label="Kategori">
          {CATEGORIES.map((c) => {
            const on = (category ?? suggested) === c;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setCategory(c === suggested ? null : c)}
                className={`rounded-full px-4 py-2 transition-colors ${on ? "bg-platinum text-night" : "text-platinum/75"}`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <details className="mt-5 rounded-[14px] border border-hairline bg-cabin p-4" open>
        <summary className="cursor-pointer text-body font-medium text-platinum">Deskripsi dari OLX</summary>
        <p className="mt-3 text-body whitespace-pre-line text-platinum/85">{listing.description}</p>
      </details>

      {/* Simpan */}
      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-hairline bg-cabin/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="flex rounded-full bg-panel p-1 text-body" role="radiogroup" aria-label="Status">
            {(["ready", "booking"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={status === s}
                onClick={() => setStatus(s)}
                className={`rounded-full px-4 py-2 transition-colors ${status === s ? "bg-platinum text-night" : "text-platinum/75"}`}
              >
                {s === "ready" ? "Ready" : "Booking"}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!own || pending}
            onClick={() =>
              start(async () => {
                const r = await importFromOlx(payload, status, category ?? undefined);
                setResult(r);
                if (r.ok) history.replaceState(null, "", location.pathname);
              })
            }
            className="press inline-flex h-12 flex-1 items-center justify-center rounded-full bg-xenon px-5 text-body font-semibold text-xenon-ink disabled:opacity-50"
          >
            {pending ? `Menyimpan ${listing.images.length} foto…` : "Simpan ke web"}
          </button>
        </div>
        {result && !result.ok && <p className="mt-2 text-body text-sold">{result.error}</p>}
      </div>
    </div>
  );
}

/** Foto pratinjau langsung dari OLX; bila gagal dimuat, tampil kotak bernomor (bukan ikon rusak). */
function PreviewPhoto({ url, n, w, h }: { url: string; n: number; w: number; h: number }) {
  const [failed, setFailed] = useState(false);
  const style = { aspectRatio: `${w || 4} / ${h || 3}` };
  if (failed) {
    return (
      <span className="grid h-44 shrink-0 snap-start place-items-center rounded-[12px] bg-panel text-micro text-steel" style={style}>
        Foto {n}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={`Foto ${n}`}
      onError={() => setFailed(true)}
      className="h-44 w-auto shrink-0 snap-start rounded-[12px] bg-panel object-cover"
      style={style}
    />
  );
}

type BulkItem = { payload: unknown; listing: OlxListing | null; error: string | null };
type BulkResult = { state: "waiting" | "saving" | "done" | "failed"; note?: string };

/** Banyak iklan sekaligus (dari halaman profil OLX): simpan berurutan dengan progres per mobil. */
function BulkImport({ items, sellers }: { items: BulkItem[]; sellers: string[] }) {
  const ready = items.filter((i) => i.listing && i.listing.sellerId && sellers.includes(i.listing.sellerId));
  const [results, setResults] = useState<Record<number, BulkResult>>({});
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const done = Object.values(results).filter((r) => r.state === "done" || r.state === "failed").length;

  const saveAll = async () => {
    setRunning(true);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.listing || !ready.includes(item)) continue;
      setResults((r) => ({ ...r, [i]: { state: "saving" } }));
      try {
        const res = await importFromOlx(item.payload, "ready");
        setResults((r) => ({
          ...r,
          [i]: res.ok
            ? { state: "done", note: `${res.created ? "Baru" : "Diperbarui"} · ${res.id} · ${res.photos} foto` }
            : { state: "failed", note: res.error },
        }));
      } catch {
        setResults((r) => ({ ...r, [i]: { state: "failed", note: "Koneksi terputus, coba lagi." } }));
      }
    }
    setRunning(false);
    setFinished(true);
    history.replaceState(null, "", location.pathname);
  };

  return (
    <div>
      <p className="text-micro text-steel">Dari halaman profil OLX</p>
      <h1 className="wide-section mt-1 text-title text-platinum">{items.length} iklan terbaca</h1>
      <p className="mt-1 text-body text-steel">
        {ready.length} iklan siap disimpan. Mobil yang sudah ada akan diperbarui (harga, foto, deskripsi), bukan dibuat ganda.
      </p>

      <ul className="mt-5 grid gap-2.5">
        {items.map((item, i) => {
          const r = results[i];
          const l = item.listing;
          return (
            <li key={i} className="flex items-center gap-3 rounded-[16px] border border-hairline bg-cabin p-2.5">
              <span className="grid h-14 w-[72px] shrink-0 place-items-center overflow-hidden rounded-[10px] bg-panel text-micro text-steel">
                {l ? <PreviewThumb url={l.images[0]?.url.replace(";s=1080x0;q=90", ";s=240x0;q=60")} /> : "?"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-semibold text-platinum">
                  {l ? `${l.brand} ${l.model} ${l.year}` : "Iklan tidak lengkap"}
                </p>
                <p className="tnum mt-0.5 truncate text-micro text-steel">
                  {l ? `${priceFull(l.price)} · ${l.images.length} foto · ${suggestCategory(l)}` : item.error}
                </p>
                {r?.note && (
                  <p className={`mt-0.5 truncate text-micro ${r.state === "failed" ? "text-sold" : "text-[var(--accent-text)]"}`}>{r.note}</p>
                )}
              </div>
              <span className="shrink-0 text-micro text-steel">
                {r?.state === "saving" ? "Menyimpan…" : r?.state === "done" ? "Tersimpan" : r?.state === "failed" ? "Gagal" : ""}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-hairline bg-cabin/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-xl">
        {finished ? (
          <div className="flex gap-2">
            <Link href="/admin" className="press inline-flex h-12 flex-1 items-center justify-center rounded-full bg-xenon px-5 text-body font-semibold text-xenon-ink">
              Lihat daftar mobil
            </Link>
            <Link href="/" className="press inline-flex h-12 items-center rounded-full border border-hairline px-5 text-body text-platinum">
              Web
            </Link>
          </div>
        ) : (
          <button
            type="button"
            disabled={running || ready.length === 0}
            onClick={saveAll}
            className="press inline-flex h-12 w-full items-center justify-center rounded-full bg-xenon px-5 text-body font-semibold text-xenon-ink disabled:opacity-50"
          >
            {running ? `Menyimpan ${done + 1} dari ${ready.length}…` : `Simpan semua (${ready.length}) ke web`}
          </button>
        )}
      </div>
    </div>
  );
}

function PreviewThumb({ url }: { url?: string }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) return <span>Foto</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover" />;
}
