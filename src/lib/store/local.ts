// Katalog mobil hasil impor OLX, disimpan di repo:
//   - data:  content/catalog/cars.json
//   - foto:  public/catalog/{ID}/{hash}-1080.webp  (disajikan langsung oleh CDN)
// Alur sementara (sebelum Neon + Vercel Blob tersambung): impor di laptop → commit & push → web live ikut.
// Di Vercel, disk read-only: data dibaca dari file yang ikut di-deploy (atau salinan yang dibundel).

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, sep } from "node:path";
import type { Car } from "@/lib/cars";
import bundled from "../../../content/catalog/cars.json";

const CATALOG_FILE = join(process.cwd(), "content", "catalog", "cars.json");
const MEDIA_ROOT = join(process.cwd(), "public", "catalog");

export type StoredCar = Car & {
  source: "olx";
  olx: { listingId: string; url: string; sellerId: string | null; status: string | null; syncedAt: string; title: string };
};

export function readStoredCars(): StoredCar[] {
  try {
    return JSON.parse(readFileSync(CATALOG_FILE, "utf8")) as StoredCar[];
  } catch {
    // Mis. di serverless yang tidak menyertakan file: pakai salinan yang dibundel saat build.
    return bundled as unknown as StoredCar[];
  }
}

export function writeStoredCars(cars: StoredCar[]) {
  mkdirSync(dirname(CATALOG_FILE), { recursive: true });
  const tmp = CATALOG_FILE + ".tmp";
  writeFileSync(tmp, JSON.stringify(cars, null, 1) + "\n");
  renameSync(tmp, CATALOG_FILE); // tulis atomik: tidak pernah ada file setengah jadi
}

/** Simpan foto ke public/catalog, kembalikan URL publiknya. key: "MS-0007/abcd…-1080.webp" */
export function putMedia(key: string, data: Buffer): string {
  const file = normalize(join(MEDIA_ROOT, key));
  if (!file.startsWith(MEDIA_ROOT + sep)) throw new Error("path foto tidak valid");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
  return `/catalog/${key}`;
}

export const storageWritable = () => !process.env.VERCEL;

/** Ubah sebagian data satu mobil (mis. status). Data mobil tidak pernah dihapus. */
export function updateStoredCar(id: string, patch: Partial<Pick<StoredCar, "status" | "featured">>): boolean {
  const cars = readStoredCars();
  const i = cars.findIndex((c) => c.id === id);
  if (i < 0) return false;
  cars[i] = { ...cars[i], ...patch };
  writeStoredCars(cars);
  return true;
}
