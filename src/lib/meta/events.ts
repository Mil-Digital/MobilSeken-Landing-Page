// Event Meta (Pixel di browser + Conversions API di server) untuk remarketing.
// Satu event situs → 0..2 event Meta. Id event sama di browser dan server, jadi Meta menghitungnya sekali.

import type { EventType } from "@/lib/analytics/events";
import { isCategory } from "@/lib/category";

// Dataset khusus landing page ini (terpisah dari Pixel web lama mobilsekenbandung.com supaya data tidak tercampur).
// Dataset "MS Garage Landing Page" di Events Manager. Bisa ditimpa env NEXT_PUBLIC_META_PIXEL_ID.
const DEFAULT_PIXEL_ID = "2382535385844393";
const RAW_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || DEFAULT_PIXEL_ID;
/** Pixel ID (angka). null = Pixel belum dipasang, semua kode Meta diam. */
export const PIXEL_ID: string | null = /^\d{8,20}$/.test(RAW_ID) ? RAW_ID : null;

export type MetaEventName = "PageView" | "ViewContent" | "ViewCategory" | "Contact";
export type MetaEvent = {
  name: MetaEventName;
  id: string;
  car: string | null;
  /** ViewCategory: SUV / MPV / Sedan + unit teratas di jenis itu (iklan katalog per jenis). */
  category?: string;
  ids?: string[];
};

export type SiteEvent = {
  type: EventType;
  eventId: string;
  car: string | null;
  path: string;
  /** true = pindah halaman di dalam situs (tanpa muat ulang). */
  nav?: boolean;
  label?: string | null;
  ids?: string[] | null;
};

/**
 * - Muat halaman → PageView (audiens "semua pengunjung situs"). Sekali per muat halaman: Pixel sendiri menolak
 *   PageView kedua tanpa muat ulang, jadi pindah halaman di dalam situs tidak mengirim PageView di browser maupun server.
 * - Halaman detail mobil → ViewContent + kode unit (iklan katalog: "tampilkan lagi mobil yang dilihat").
 * - Masuk lewat link jenis (/?jenis=suv) atau pilih jenis di daftar stok → ViewCategory (audiens "minat SUV").
 * - Klik WhatsApp / telepon → Contact (audiens "sudah menghubungi", bisa dikecualikan atau dijadikan target konversi).
 */
export function metaEventsFor(e: SiteEvent): MetaEvent[] {
  if (e.type === "page_view") {
    const out: MetaEvent[] = e.nav ? [] : [{ name: "PageView", id: e.eventId, car: null }];
    if (e.car && e.path.startsWith("/mobil/")) out.push({ name: "ViewContent", id: `${e.eventId}-vc`, car: e.car });
    return out;
  }
  if (e.type === "category" && e.label && isCategory(e.label)) {
    return [{ name: "ViewCategory", id: e.eventId, car: null, category: e.label, ids: (e.ids ?? []).slice(0, 10) }];
  }
  if (e.type === "wa_click" || e.type === "tel_click") return [{ name: "Contact", id: e.eventId, car: e.car }];
  return [];
}

/** Data produk untuk event: kode unit harus sama dengan kolom id di feed katalog. */
export function contentFor(e: MetaEvent): Record<string, unknown> {
  if (e.name === "ViewCategory") {
    return { content_category: e.category, content_type: "product", ...(e.ids?.length ? { content_ids: e.ids } : {}) };
  }
  return e.car ? { content_ids: [e.car], content_type: "product" } : {};
}
