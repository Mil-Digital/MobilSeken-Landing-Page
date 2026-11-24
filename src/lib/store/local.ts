// Penyimpanan katalog mobil.
// - Data: Neon Postgres (tabel cars) bila DATABASE_URL ada; selain itu file content/catalog/cars.json.
// - Foto: Vercel Blob bila BLOB_READ_WRITE_TOKEN ada (store harus bertipe Public); di laptop, bila Blob
//   belum bisa dipakai, foto disimpan ke public/catalog supaya impor tetap jalan.

import { neon } from "@neondatabase/serverless";
import { put } from "@vercel/blob";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, sep } from "node:path";
import type { Car, CarImage, CarStatus } from "@/lib/cars";

const CATALOG_FILE = join(process.cwd(), "content", "catalog", "cars.json");
const MEDIA_ROOT = join(process.cwd(), "public", "catalog");

export type StoredCar = Car & {
  source: "olx";
  olx: { listingId: string; url: string; sellerId: string | null; status: string | null; syncedAt: string; title: string };
};

const db = () => (process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null);
export const usingDatabase = () => !!process.env.DATABASE_URL;

/** Bisa menyimpan? Dengan database: ya. Tanpa database: hanya di laptop (disk Vercel read-only). */
export const storageWritable = () => usingDatabase() || !process.env.VERCEL;

// ───────────── baca ─────────────

type Row = {
  id: string;
  status: CarStatus;
  featured: boolean;
  brand: string;
  model: string;
  variant: string;
  year: number;
  price: string | number;
  mileage_km: number;
  transmission: "Otomatis" | "Manual";
  fuel: string;
  color: string;
  body_type: string;
  location: string;
  description: string;
  specs: { label: string; value: string }[];
  images: CarImage[];
  created_at: string;
  olx_listing_id: string | null;
  olx_url: string | null;
  olx_seller_id: string | null;
  olx_status: string | null;
  olx_title: string | null;
  synced_at: string | Date | null;
};

const fromRow = (r: Row): StoredCar => ({
  id: r.id,
  status: r.status,
  featured: r.featured,
  brand: r.brand,
  model: r.model,
  variant: r.variant,
  year: r.year,
  price: Number(r.price),
  mileageKm: r.mileage_km,
  transmission: r.transmission,
  fuel: r.fuel,
  color: r.color,
  bodyType: r.body_type,
  location: r.location,
  description: r.description,
  specs: r.specs ?? [],
  images: r.images ?? [],
  createdAt: r.created_at,
  source: "olx",
  olx: {
    listingId: r.olx_listing_id ?? "",
    url: r.olx_url ?? "",
    sellerId: r.olx_seller_id,
    status: r.olx_status,
    syncedAt: r.synced_at ? new Date(r.synced_at).toISOString() : "",
    title: r.olx_title ?? "",
  },
});

function readFileCars(): StoredCar[] {
  try {
    return JSON.parse(readFileSync(CATALOG_FILE, "utf8")) as StoredCar[];
  } catch {
    return [];
  }
}

/** Semua mobil katalog, terbaru dulu. */
export async function readStoredCars(): Promise<StoredCar[]> {
  const sql = db();
  if (!sql) return readFileCars();
  const rows = (await sql`select * from cars order by created_at desc, id desc`) as Row[];
  return rows.map(fromRow);
}

// ───────────── tulis ─────────────

function writeFileCars(cars: StoredCar[]) {
  mkdirSync(dirname(CATALOG_FILE), { recursive: true });
  const tmp = CATALOG_FILE + ".tmp";
  writeFileSync(tmp, JSON.stringify(cars, null, 1) + "\n");
  renameSync(tmp, CATALOG_FILE); // tulis atomik
}

/**
 * Simpan mobil (baru atau pembaruan). Untuk mobil baru, `insertOnly` mencegah menimpa kode unit
 * yang kebetulan baru dipakai impor lain: kembalikan false bila kode sudah terpakai.
 */
export async function saveCar(car: StoredCar, insertOnly = false): Promise<boolean> {
  const sql = db();
  if (!sql) {
    const cars = readFileCars();
    if (insertOnly && cars.some((c) => c.id === car.id)) return false;
    writeFileCars([car, ...cars.filter((c) => c.id !== car.id)]);
    return true;
  }
  const values = [
    car.id, car.status, car.featured, car.brand, car.model, car.variant, car.year, car.price, car.mileageKm,
    car.transmission, car.fuel, car.color, car.bodyType, car.location, car.description, JSON.stringify(car.specs),
    JSON.stringify(car.images), car.createdAt, car.olx.listingId, car.olx.url, car.olx.sellerId, car.olx.status,
    car.olx.title, car.olx.syncedAt,
  ];
  const insert = `insert into cars (id, status, featured, brand, model, variant, year, price, mileage_km, transmission,
      fuel, color, body_type, location, description, specs, images, created_at, olx_listing_id, olx_url, olx_seller_id,
      olx_status, olx_title, synced_at)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb,$18,$19,$20,$21,$22,$23,$24)`;
  if (insertOnly) {
    const rows = await sql.query(`${insert} on conflict (id) do nothing returning id`, values);
    return (rows as unknown[]).length > 0;
  }
  await sql.query(
    `${insert} on conflict (id) do update set
      status = excluded.status, featured = excluded.featured, brand = excluded.brand, model = excluded.model,
      variant = excluded.variant, year = excluded.year, price = excluded.price, mileage_km = excluded.mileage_km,
      transmission = excluded.transmission, fuel = excluded.fuel, color = excluded.color, body_type = excluded.body_type,
      location = excluded.location, description = excluded.description, specs = excluded.specs, images = excluded.images,
      olx_listing_id = excluded.olx_listing_id, olx_url = excluded.olx_url, olx_seller_id = excluded.olx_seller_id,
      olx_status = excluded.olx_status, olx_title = excluded.olx_title, synced_at = excluded.synced_at, updated_at = now()`,
    values,
  );
  return true;
}

/** Ubah sebagian data satu mobil (mis. status). Data mobil tidak pernah dihapus. */
export async function updateStoredCar(id: string, patch: Partial<Pick<StoredCar, "status" | "featured">>): Promise<boolean> {
  const sql = db();
  if (!sql) {
    const cars = readFileCars();
    const i = cars.findIndex((c) => c.id === id);
    if (i < 0) return false;
    cars[i] = { ...cars[i], ...patch };
    writeFileCars(cars);
    return true;
  }
  const rows = await sql`
    update cars set
      status = coalesce(${patch.status ?? null}, status),
      featured = coalesce(${patch.featured ?? null}, featured),
      updated_at = now()
    where id = ${id}
    returning id`;
  return rows.length > 0;
}

// ───────────── foto ─────────────

function putLocal(key: string, data: Buffer): string {
  const file = normalize(join(MEDIA_ROOT, key));
  if (!file.startsWith(MEDIA_ROOT + sep)) throw new Error("path foto tidak valid");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
  return `/catalog/${key}`;
}

/** Simpan foto, kembalikan URL publiknya. key: "MS-0007/abcd…-1080.webp" */
export async function putMedia(key: string, data: Buffer): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { url } = await put(`cars/${key}`, data, {
        access: "public",
        contentType: "image/webp",
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 31536000,
      });
      return url;
    } catch (e) {
      if (process.env.VERCEL) {
        throw new Error(
          /private/i.test((e as Error).message)
            ? "Store Vercel Blob bertipe Private. Buat store Blob baru bertipe Public."
            : `Foto gagal disimpan ke Blob: ${(e as Error).message}`,
        );
      }
      // Di laptop: tetap jalan dengan menyimpan ke public/catalog.
    }
  } else if (process.env.VERCEL) {
    throw new Error("Penyimpanan foto belum tersambung (BLOB_READ_WRITE_TOKEN).");
  }
  return putLocal(key, data);
}
