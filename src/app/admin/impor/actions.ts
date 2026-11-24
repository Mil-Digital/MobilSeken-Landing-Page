"use server";

import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { checkAdmin } from "@/lib/admin-auth";
import { isCategory, type Category } from "@/lib/category";
import type { CarStatus } from "@/lib/cars";
import { importListing } from "@/lib/olx/import";
import { normalizeOlx, OlxParseError } from "@/lib/olx/parse";
import { storageWritable } from "@/lib/store/local";

export type ImportState =
  | { ok: true; id: string; path: string; created: boolean; photos: number }
  | { ok: false; error: string };

/** Akun OLX yang boleh diimpor (iklan milik showroom sendiri). */
const sellerIds = () => (process.env.OLX_SELLER_IDS ?? "44649495").split(",").map((s) => s.trim()).filter(Boolean);

export async function importFromOlx(payload: unknown, status: CarStatus, category?: Category): Promise<ImportState> {
  const gate = checkAdmin((await headers()).get("authorization"));
  if (gate !== "ok" && gate !== "open") return { ok: false, error: "Sesi admin tidak valid. Muat ulang halaman lalu login." };
  if (status !== "ready" && status !== "booking") return { ok: false, error: "Status tidak dikenal." };
  if (category !== undefined && !isCategory(category)) return { ok: false, error: "Kategori tidak dikenal." };

  let listing;
  try {
    listing = normalizeOlx(payload);
  } catch (e) {
    return { ok: false, error: e instanceof OlxParseError ? e.message : "Data iklan tidak bisa dibaca." };
  }
  if (!listing.sellerId || !sellerIds().includes(listing.sellerId)) {
    return { ok: false, error: "Iklan ini bukan milik akun OLX MS Garage, jadi tidak diimpor." };
  }
  if (!storageWritable()) {
    return {
      ok: false,
      error: "Penyimpanan belum tersambung. Sambungkan Neon dan Vercel Blob di tab Storage Vercel, lalu coba lagi.",
    };
  }
  try {
    const res = await importListing(listing, status, category);
    updateTag("cars");
    return { ok: true, ...res };
  } catch (e) {
    return { ok: false, error: `Gagal menyimpan: ${(e as Error).message}` };
  }
}
