import type { Car } from "./cars";

export type Sort = "newest" | "price-asc" | "price-desc";
export type Trans = "all" | "Otomatis" | "Manual";

export type CardCar = Pick<
  Car,
  "id" | "brand" | "model" | "variant" | "year" | "price" | "mileageKm" | "transmission" | "status" | "createdAt"
> & { path: string; images: Car["images"] };

export type Filters = {
  brand: string | null;
  price: [number, number];
  year: [number, number];
  trans: Trans;
  sort: Sort;
};

export type Bounds = { price: [number, number]; year: [number, number] };

const STEP_PRICE = 25_000_000;

export function boundsOf(cars: CardCar[]): Bounds {
  const prices = cars.map((c) => c.price);
  const years = cars.map((c) => c.year);
  return {
    price: [
      Math.floor(Math.min(...prices) / STEP_PRICE) * STEP_PRICE,
      Math.ceil(Math.max(...prices) / STEP_PRICE) * STEP_PRICE,
    ],
    year: [Math.min(...years), Math.max(...years)],
  };
}

export const priceStep = STEP_PRICE;

export function defaultFilters(b: Bounds): Filters {
  return { brand: null, price: [...b.price], year: [...b.year], trans: "all", sort: "newest" };
}

/** Jumlah filter lanjutan yang aktif (untuk penanda di tombol filter). */
export function advancedCount(f: Filters, b: Bounds) {
  let n = 0;
  if (f.price[0] > b.price[0] || f.price[1] < b.price[1]) n++;
  if (f.year[0] > b.year[0] || f.year[1] < b.year[1]) n++;
  if (f.trans !== "all") n++;
  if (f.sort !== "newest") n++;
  return n;
}

export function applyFilters(cars: CardCar[], f: Filters, opts: { ignoreBrand?: boolean } = {}) {
  const out = cars.filter(
    (c) =>
      (opts.ignoreBrand || !f.brand || c.brand === f.brand) &&
      c.price >= f.price[0] &&
      c.price <= f.price[1] &&
      c.year >= f.year[0] &&
      c.year <= f.year[1] &&
      (f.trans === "all" || c.transmission === f.trans),
  );
  const by: Record<Sort, (a: CardCar, b: CardCar) => number> = {
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
  };
  return out.sort(by[f.sort]);
}
