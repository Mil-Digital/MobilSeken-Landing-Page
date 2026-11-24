// FASE 1: data dummy. Diambil dari stok yang tampil di website lama (nama, tahun, km, harga, spesifikasi),
// foto milik showroom diunduh dari website lama dan disimpan lokal (bukan hotlink).
// Fase 2 menggantikan modul ini dengan query Neon Postgres; bentuk tipe `Car` sengaja mengikuti skema di brief.

import { cacheLife, cacheTag } from "next/cache";
import { readStoredCars } from "./store/local";
import photos from "./dummy-photos.json";
import { slugify } from "./format";
import { suggestCategory, type Category } from "./category";

export type CarStatus = "ready" | "booking" | "sold";

export type CarImage = {
  src: string;
  width: number;
  height: number;
  blurDataURL: string;
};

export type Car = {
  id: string;
  status: CarStatus;
  featured: boolean;
  brand: string;
  model: string;
  variant: string;
  year: number;
  price: number;
  mileageKm: number;
  transmission: "Otomatis" | "Manual";
  fuel: string;
  color: string;
  bodyType: string;
  /** Kelompok di navigasi stok: SUV / MPV / Sedan. */
  category: Category;
  location: string;
  description: string;
  specs: { label: string; value: string }[];
  images: CarImage[];
  createdAt: string;
};

const img = (id: keyof typeof photos) => photos[id] as CarImage[];

const RAW: Omit<Car, "images" | "category">[] = [
  {
    id: "MS-0001",
    status: "ready",
    featured: true,
    brand: "MINI",
    model: "Cooper S",
    variant: "F55 Turbo 5 pintu",
    year: 2015,
    price: 395_000_000,
    mileageKm: 39_000,
    transmission: "Otomatis",
    fuel: "Bensin",
    color: "Oranye",
    bodyType: "Hatchback",
    location: "Bandung",
    description:
      "MINI Cooper S F55 dengan mesin 2.0 TwinPower Turbo. Kilometer rendah, kabin rapi, warna oranye yang jarang ada di pasaran.\n\nPajak hidup sampai September 2027. Silakan cek langsung di showroom atau minta video unit via WhatsApp.",
    specs: [
      { label: "Mesin", value: "2.0L Inline-4 TwinPower Turbo" },
      { label: "Kapasitas", value: "1.998 cc" },
      { label: "Tenaga", value: "192 hp" },
      { label: "Konsumsi", value: "± 18,2 km/L" },
      { label: "Pajak", value: "09/2027" },
      { label: "Plat", value: "B" },
    ],
    createdAt: "2026-11-17",
  },
  {
    id: "MS-0002",
    status: "ready",
    featured: true,
    brand: "Chery",
    model: "J6",
    variant: "iWD Premium Long Range 4x4",
    year: 2025,
    price: 474_000_000,
    mileageKm: 10_000,
    transmission: "Otomatis",
    fuel: "Listrik",
    color: "Abu-abu",
    bodyType: "SUV",
    location: "Bandung",
    description:
      "SUV listrik penggerak empat roda dengan baterai 69,77 kWh. Jarak tempuh hingga 418–436 km (NEDC). Kondisi seperti baru, baru 10 ribu km.\n\nPajak hidup sampai Mei 2027.",
    specs: [
      { label: "Penggerak", value: "iWD (4x4)" },
      { label: "Baterai", value: "69,77 kWh" },
      { label: "Tenaga", value: "279 PS" },
      { label: "Jarak tempuh", value: "418–436 km (NEDC)" },
      { label: "Pajak", value: "05/2027" },
      { label: "Plat", value: "D" },
    ],
    createdAt: "2026-11-15",
  },
  {
    id: "MS-0003",
    status: "ready",
    featured: true,
    brand: "Mercedes-Benz",
    model: "C250",
    variant: "AMG Line",
    year: 2016,
    price: 349_000_000,
    mileageKm: 64_000,
    transmission: "Otomatis",
    fuel: "Bensin",
    color: "Putih",
    bodyType: "Sedan",
    location: "Bandung",
    description:
      "C250 AMG Line W205 dengan mesin 2.0 turbo 211 hp. Velg AMG, interior hitam, sunroof. Unit terawat dan siap pakai.\n\nPajak hidup sampai April 2027.",
    specs: [
      { label: "Mesin", value: "2.0L Inline-4 Turbo" },
      { label: "Kapasitas", value: "1.991 cc" },
      { label: "Tenaga", value: "211 hp" },
      { label: "Konsumsi", value: "14–17 km/L" },
      { label: "Pajak", value: "04/2027" },
      { label: "Plat", value: "B" },
    ],
    createdAt: "2026-11-12",
  },
  {
    id: "MS-0004",
    status: "booking",
    featured: false,
    brand: "Jeep",
    model: "Wrangler",
    variant: "Sahara 3.8 2 pintu",
    year: 2011,
    price: 679_000_000,
    mileageKm: 62_000,
    transmission: "Otomatis",
    fuel: "Bensin",
    color: "Putih",
    bodyType: "SUV",
    location: "Bandung",
    description:
      "Wrangler Sahara 3.8 V6 dengan banyak upgrade: velg dan ban off-road, bumper depan, lampu LED. Siap dipakai harian maupun akhir pekan.",
    specs: [
      { label: "Mesin", value: "3.8L V6" },
      { label: "Kapasitas", value: "3.778 cc" },
      { label: "Tenaga", value: "202 hp" },
      { label: "Konsumsi", value: "± 6,8 km/L" },
      { label: "Plat", value: "L" },
    ],
    createdAt: "2026-11-10",
  },
  {
    id: "MS-0005",
    status: "ready",
    featured: false,
    brand: "Volkswagen",
    model: "Tiguan",
    variant: "Allspace 1.4 TSI",
    year: 2021,
    price: 250_000_000,
    mileageKm: 47_684,
    transmission: "Otomatis",
    fuel: "Bensin",
    color: "Abu-abu",
    bodyType: "SUV",
    location: "Bandung",
    description:
      "SUV tujuh penumpang dari Volkswagen dengan mesin 1.4 TSI yang irit. Kilometer tercatat 47.684 km.\n\nPajak hidup sampai Februari 2027.",
    specs: [
      { label: "Mesin", value: "1.4L TSI" },
      { label: "Kapasitas", value: "1.400 cc" },
      { label: "Tenaga", value: "150 hp" },
      { label: "Konsumsi", value: "± 13,5 km/L" },
      { label: "Pajak", value: "02/2027" },
      { label: "Plat", value: "D" },
    ],
    createdAt: "2026-11-08",
  },
  {
    id: "MS-0006",
    // Dijadikan contoh status terjual untuk review desain.
    status: "sold",
    featured: false,
    brand: "KIA",
    model: "Seltos",
    variant: "EX+ 1.4 T-GDI",
    year: 2020,
    price: 209_000_000,
    mileageKm: 75_000,
    transmission: "Otomatis",
    fuel: "Bensin",
    color: "Biru",
    bodyType: "SUV",
    location: "Bandung",
    description: "Seltos EX+ dengan mesin 1.4 T-GDI turbo, warna biru.",
    specs: [
      { label: "Mesin", value: "1.4L T-GDI Turbo" },
      { label: "Tenaga", value: "140 PS" },
      { label: "Pajak", value: "12/2026" },
      { label: "Plat", value: "D" },
    ],
    createdAt: "2026-11-01",
  },
];

const DUMMY: Car[] = RAW.map((c) => ({ ...c, category: suggestCategory(c), images: img(c.id as keyof typeof photos) }));

/** Semua mobil: katalog asli hasil impor OLX. Data contoh hanya dipakai bila katalog masih kosong. */
async function allCars(): Promise<Car[]> {
  const stored = await readStoredCars();
  return stored.length > 0 ? stored : DUMMY;
}

export const carName = (c: Pick<Car, "brand" | "model">) => `${c.brand} ${c.model}`;
export const carTitle = (c: Pick<Car, "brand" | "model" | "variant" | "year">) =>
  `${c.brand} ${c.model} ${c.variant} ${c.year}`;
export const carSlug = (c: Car) => slugify(`${c.brand} ${c.model} ${c.variant} ${c.year}`);
export const carPath = (c: Car) => `/mobil/${c.id}-${carSlug(c)}`;

/** Mobil yang tampil di landing page (ready + booking). Di-cache; impor baru memanggil updateTag("cars"). */
export async function listCars(): Promise<Car[]> {
  "use cache";
  cacheTag("cars");
  cacheLife({ stale: 60, revalidate: 60, expire: 86400 });
  return (await allCars())
    .filter((c) => c.status !== "sold")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getCar(id: string): Promise<Car | null> {
  "use cache";
  cacheTag("cars");
  cacheLife({ stale: 60, revalidate: 60, expire: 86400 });
  return (await allCars()).find((c) => c.id === id) ?? null;
}

/** Dipakai proxy (redirect slug): baca langsung, tanpa cache. */
export async function canonicalPathById(id: string): Promise<string | null> {
  const car = (await allCars()).find((c) => c.id === id);
  return car ? carPath(car) : null;
}

export async function allCarIds() {
  "use cache";
  cacheTag("cars");
  cacheLife({ stale: 60, revalidate: 60, expire: 86400 });
  return (await allCars()).map((c) => ({ id: c.id, path: carPath(c) }));
}

/** Semua kode unit yang pernah dipakai (untuk membuat kode baru tanpa memakai ulang). */
export async function allKnownIds(): Promise<string[]> {
  return [...(await readStoredCars()).map((c) => c.id), ...DUMMY.map((c) => c.id)];
}

export async function similarCars(car: Car, limit = 4): Promise<Car[]> {
  const pool = (await listCars()).filter((c) => c.id !== car.id);
  const score = (c: Car) =>
    (c.brand === car.brand ? 0 : 1) * 1e12 + Math.abs(c.price - car.price) + (c.bodyType === car.bodyType ? 0 : 5e7);
  return pool.sort((a, b) => score(a) - score(b)).slice(0, limit);
}
