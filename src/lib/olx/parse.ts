// Parser data iklan OLX.
// OLX memblokir pengambilan halaman dari server (bot protection), jadi data dibaca di browser tim
// oleh tombol "Kirim ke MS Garage" (lihat bookmarklet.ts) lalu dikirim dalam bentuk ringkas (OlxPayload).
// Modul ini menormalkan payload itu menjadi data mobil, dan juga bisa membaca HTML tersimpan (untuk test).

import { z } from "zod";

/** Bentuk ringkas yang dikirim tombol dari halaman iklan OLX. */
export type OlxPayload = {
  v: 1;
  url: string;
  ad: {
    id: string;
    title: string;
    description: string;
    price: number | null;
    /** [external_id, lebar, tinggi] */
    images: [string, number, number][];
    /** [key, value, formatted_value] */
    params: [string, string, string][];
    status: string | null;
    user: string | null;
    created: string | null;
  };
};

const payloadSchema = z.object({
  v: z.literal(1),
  url: z.string().url(),
  ad: z.object({
    id: z.string().regex(/^\d+$/),
    title: z.string().min(1),
    description: z.string(),
    price: z.number().positive().nullable(),
    images: z.array(z.tuple([z.string().min(1), z.number(), z.number()])),
    params: z.array(z.tuple([z.string(), z.string(), z.string()])),
    status: z.string().nullable(),
    user: z.string().nullable(),
    created: z.string().nullable(),
  }),
});

export type OlxListing = {
  listingId: string;
  url: string;
  sellerId: string | null;
  /** status iklan di OLX, mis. "active" */
  olxStatus: string | null;
  title: string;
  description: string;
  price: number;
  brand: string;
  model: string;
  variant: string;
  year: number;
  mileageKm: number;
  mileageLabel: string | null;
  transmission: "Otomatis" | "Manual";
  fuel: string;
  color: string;
  bodyType: string;
  engine: string | null;
  images: { id: string; url: string; width: number; height: number }[];
  createdAt: string | null;
};

export class OlxParseError extends Error {}

/** URL foto OLX ukuran asli (maks 1080px), kualitas tinggi. */
export const olxImageUrl = (externalId: string) =>
  `https://apollo.olx.co.id/v1/files/${encodeURIComponent(externalId)}/image;s=1080x0;q=90`;

/**
 * Ringkas objek iklan dari state OLX (window.__APP.states.items.elements[id]).
 * Logika ini SAMA dengan yang dijalankan tombol di browser (bookmarklet.ts).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function compactAd(ad: any, url: string): OlxPayload {
  return {
    v: 1,
    url: url.split("?")[0].split("#")[0],
    ad: {
      id: String(ad.id),
      title: String(ad.title ?? ""),
      description: String(ad.description ?? ""),
      price: ad.price?.value?.raw ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      images: (ad.images ?? []).map((i: any) => [String(i.external_id), Number(i.width) || 0, Number(i.height) || 0]),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      params: (ad.parameters ?? []).map((p: any) => [String(p.key), String(p.value ?? ""), String(p.formatted_value ?? "")]),
      status: ad.status?.status ?? null,
      user: ad.user_id != null ? String(ad.user_id) : null,
      created: ad.created_at_first ?? ad.created_at ?? null,
    },
  };
}

const param = (p: OlxPayload, key: string) => p.ad.params.find((x) => x[0] === key);
const formatted = (p: OlxPayload, key: string) => param(p, key)?.[2]?.trim() || "";

/** "50.000-55.000 km" → 55000 (batas atas rentang), "10.000 km" → 10000 */
function parseMileage(label: string): number {
  const nums = label.match(/\d[\d.]*/g)?.map((n) => Number(n.replace(/\./g, ""))) ?? [];
  return nums.length ? Math.max(...nums) : 0;
}

/** Varian: pakai varian OLX bila spesifik; bila "Lain-lain", ambil dari judul tanpa merek/model/tahun. */
function deriveVariant(title: string, brand: string, model: string, variantParam: string): string {
  if (variantParam && !/^lain/i.test(variantParam)) return variantParam;
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let v = title;
  for (const word of [brand, model]) if (word) v = v.replace(new RegExp(`\\b${esc(word)}\\b`, "gi"), " ");
  v = v.replace(/\b(19|20)\d{2}(\s*[/-]\s*(19|20)?\d{2})?\b/g, " ");
  return v.replace(/\s{2,}/g, " ").trim();
}

/** Payload dari tombol → data mobil. Melempar OlxParseError bila data wajib tidak ada. */
export function normalizeOlx(input: unknown): OlxListing {
  const res = payloadSchema.safeParse(input);
  if (!res.success) throw new OlxParseError(`Data iklan tidak lengkap: ${res.error.issues[0]?.path.join(".")}`);
  const p = res.data as OlxPayload;
  if (!p.ad.price) throw new OlxParseError("Harga tidak ditemukan di iklan.");
  if (p.ad.images.length === 0) throw new OlxParseError("Iklan tidak punya foto.");

  const brand = formatted(p, "make");
  const model = formatted(p, "m_tipe");
  const year = Number(param(p, "m_year")?.[1]) || Number(p.ad.title.match(/\b(19|20)\d{2}\b/)?.[0]) || 0;
  if (!brand || !model || !year) throw new OlxParseError("Merek, model, atau tahun tidak ditemukan di iklan.");
  const mileageLabel = formatted(p, "mileage") || null;
  const trans = (param(p, "m_transmission")?.[1] ?? "").toLowerCase();

  const seen = new Set<string>();
  const images = p.ad.images
    .filter(([id]) => (seen.has(id) ? false : (seen.add(id), true)))
    .map(([id, width, height]) => ({ id, url: olxImageUrl(id), width, height }));

  return {
    listingId: p.ad.id,
    url: p.url,
    sellerId: p.ad.user,
    olxStatus: p.ad.status,
    title: p.ad.title.trim(),
    description: p.ad.description.trim(),
    price: p.ad.price,
    brand,
    model,
    variant: deriveVariant(p.ad.title, brand, model, formatted(p, "m_tipe_variant")),
    year,
    mileageKm: mileageLabel ? parseMileage(mileageLabel) : 0,
    mileageLabel,
    transmission: trans.startsWith("man") ? "Manual" : "Otomatis",
    fuel: formatted(p, "m_fuel") || "Bensin",
    color: formatted(p, "m_color") || "-",
    bodyType: formatted(p, "m_body") || "-",
    engine: formatted(p, "m_engine_capacity") || null,
    images,
    createdAt: p.ad.created,
  };
}

/** Ambil nilai JSON seimbang yang dimulai di `start` (objek/array), mengabaikan kurung di dalam string. */
function balancedJson(src: string, start: number): string {
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new OlxParseError("Struktur halaman OLX tidak dikenali.");
}

/** Baca halaman iklan OLX yang disimpan (HTML) → data mobil. Dipakai untuk fixture & test. */
export function parseOlxHtml(html: string): OlxListing {
  const appAt = html.indexOf("window.__APP");
  if (appAt < 0) throw new OlxParseError("State OLX (window.__APP) tidak ditemukan.");
  const statesAt = html.indexOf("states:", appAt);
  if (statesAt < 0) throw new OlxParseError("State OLX tidak lengkap.");
  const states = JSON.parse(balancedJson(html, html.indexOf("{", statesAt)));
  const url =
    html.match(/<meta[^>]+property="og:url"[^>]+content="([^"]+)"/)?.[1] ??
    html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/)?.[1] ??
    "";
  const id = url.match(/iid-(\d+)/)?.[1];
  const ad = id ? states?.items?.elements?.[id] : undefined;
  if (!ad) throw new OlxParseError("Objek iklan tidak ditemukan di state OLX.");
  return normalizeOlx(compactAd(ad, url));
}
