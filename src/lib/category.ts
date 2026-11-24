// Kelompok mobil untuk navigasi stok: SUV, MPV, Sedan (hatchback, coupe, city car ikut Sedan).
// Saat impor, kategori disarankan otomatis; admin bisa mengubahnya kapan saja.

export const CATEGORIES = ["SUV", "MPV", "Sedan"] as const;
export type Category = (typeof CATEGORIES)[number];

export const isCategory = (v: unknown): v is Category => CATEGORIES.includes(v as Category);

// Model yang tipe bodi OLX-nya sering keliru atau terlalu umum. Dicek lebih dulu daripada tipe bodi.
const SUV_MODELS =
  /\b(wrangler|sahara|rubicon|jimny|trailblazer|tiguan|pajero|fortuner|rush|terios|br-?v|cr-?v|hr-?v|wr-?v|cx-?\d+|seltos|sonet|sportage|raize|rocky|outlander|x-?trail|terra|everest|almaz|santa ?fe|creta|tucson|palisade|land ?cruiser|range ?rover|defender|x[1-7]|gl[abceks]\d*|q[2-8]|xc[4-9]0|kona|ioniq ?5)\b/i;
const MPV_MODELS =
  /\b(avanza|veloz|xenia|innova|zenix|alphard|vellfire|voxy|noah|serena|ertiga|livina|mobilio|freed|odyssey|stargazer|staria|carnival|apv|gran ?max|hiace|elgrand|confero|cortez|calya|sigra)\b/i;

/** Saran kategori dari merek/model/tipe bodi OLX. */
export function suggestCategory(c: { model: string; variant?: string; bodyType: string }): Category {
  const name = `${c.model} ${c.variant ?? ""}`;
  if (MPV_MODELS.test(name)) return "MPV";
  if (SUV_MODELS.test(name)) return "SUV";
  const body = c.bodyType.toLowerCase();
  if (/suv|jeep|crossover|double cabin|4x4|off.?road/.test(body)) return "SUV";
  if (/mpv|van|minibus/.test(body)) return "MPV";
  return "Sedan";
}
