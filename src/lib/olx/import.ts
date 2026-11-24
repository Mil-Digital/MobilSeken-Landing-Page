import "server-only";

import { createHash } from "node:crypto";
import sharp from "sharp";
import { allKnownIds, carPath, type CarImage, type CarStatus } from "@/lib/cars";
import { putMedia, readStoredCars, saveCar, type StoredCar } from "@/lib/store/local";
import { suggestCategory, type Category } from "@/lib/category";
import type { OlxListing } from "./parse";

const IMG_TIMEOUT = 15_000;

async function fetchImage(url: string): Promise<Buffer> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(IMG_TIMEOUT) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw new Error(`Foto gagal diunduh (${(lastErr as Error)?.message ?? "?"})`);
}

/** Jalankan tugas dengan batas paralel kecil (sopan terhadap server foto). */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

/** Unduh, buang duplikat (hash isi), proses dengan sharp, simpan. Watermark tidak disentuh. */
async function processImages(carId: string, listing: OlxListing): Promise<CarImage[]> {
  const raw = await mapLimit(listing.images, 3, (img) => fetchImage(img.url));
  const seen = new Set<string>();
  const images: CarImage[] = [];
  for (const buf of raw) {
    const hash = createHash("sha1").update(buf).digest("hex").slice(0, 16);
    if (seen.has(hash)) continue;
    seen.add(hash);
    const base = sharp(buf).rotate(); // perbaiki orientasi EXIF
    // Satu ukuran sumber (1080px); next/image membuat ukuran lain sesuai layar.
    const large = await base.clone().resize({ width: 1080, withoutEnlargement: true }).webp({ quality: 88 }).toBuffer({ resolveWithObject: true });
    const src = await putMedia(`${carId}/${hash}-1080.webp`, large.data);
    const blur = await base.clone().resize(20).webp({ quality: 40 }).toBuffer();
    images.push({
      src,
      width: large.info.width,
      height: large.info.height,
      blurDataURL: `data:image/webp;base64,${blur.toString("base64")}`,
    });
  }
  return images;
}

/** Kode unit berikutnya: tidak pernah memakai ulang kode yang pernah ada. */
async function nextId(stored: StoredCar[], bump = 0): Promise<string> {
  const used = new Set([...(await allKnownIds()), ...stored.map((c) => c.id)]);
  const max = Math.max(0, ...[...used].map((id) => Number(id.replace(/\D/g, "")) || 0));
  return `MS-${String(max + 1 + bump).padStart(4, "0")}`;
}

export type ImportResult = { id: string; path: string; created: boolean; photos: number };

/**
 * Simpan/perbarui satu iklan OLX sebagai mobil di landing page.
 * Iklan yang sama (ID iklan OLX) selalu memperbarui kode unit yang sama.
 */
export async function importListing(listing: OlxListing, status: CarStatus, category?: Category): Promise<ImportResult> {
  const stored = await readStoredCars();
  const existing = stored.find((c) => c.olx.listingId === listing.listingId);
  let id = existing?.id ?? (await nextId(stored));
  const images = await processImages(id, listing);
  if (images.length === 0) throw new Error("Tidak ada foto yang berhasil diproses.");

  const specs = [
    listing.engine && { label: "Kapasitas mesin", value: listing.engine },
    listing.mileageLabel && { label: "Jarak tempuh (OLX)", value: listing.mileageLabel },
    { label: "Kode iklan OLX", value: listing.listingId },
  ].filter(Boolean) as { label: string; value: string }[];

  const car: StoredCar = {
    id,
    status,
    featured: existing?.featured ?? true,
    brand: listing.brand,
    model: listing.model,
    variant: listing.variant,
    year: listing.year,
    price: listing.price,
    mileageKm: listing.mileageKm,
    transmission: listing.transmission,
    fuel: listing.fuel,
    color: listing.color,
    bodyType: listing.bodyType,
    // Pilihan admin di layar impor > kategori yang sudah ada > saran otomatis.
    category: category ?? existing?.category ?? suggestCategory(listing),
    location: "Bandung",
    description: listing.description,
    specs,
    images,
    createdAt: existing?.createdAt ?? new Date().toISOString().slice(0, 10),
    source: "olx",
    olx: {
      listingId: listing.listingId,
      url: listing.url,
      sellerId: listing.sellerId,
      status: listing.olxStatus,
      syncedAt: new Date().toISOString(),
      title: listing.title,
    },
  };

  if (existing) {
    await saveCar(car);
  } else {
    // Mobil baru: jangan pernah menimpa kode unit yang baru saja dipakai impor lain.
    let attempt = 0;
    while (!(await saveCar({ ...car, id }, true))) {
      if (++attempt > 5) throw new Error("Kode unit bentrok terus, coba lagi.");
      id = await nextId(await readStoredCars(), attempt);
    }
    car.id = id;
  }
  return { id, path: carPath(car), created: !existing, photos: images.length };
}
