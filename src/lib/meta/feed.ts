// Feed katalog untuk Meta Commerce Manager (CSV). Meta mengambil URL ini terjadwal, lalu iklan katalog
// menampilkan lagi mobil yang dilihat pengunjung. Kolom id = kode unit = content_ids di event Pixel/CAPI.

import { carPath, carTitle, type Car } from "@/lib/cars";

const COLUMNS = [
  "id",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "link",
  "image_link",
  "additional_image_link",
  "brand",
  "google_product_category",
  "product_type",
  "custom_label_0",
  "custom_label_1",
  "custom_label_2",
  "custom_label_3",
] as const;

const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const abs = (src: string, origin: string) => (/^https?:\/\//.test(src) ? src : `${origin}${src.startsWith("/") ? "" : "/"}${src}`);

/** Rentang harga untuk set produk (mis. iklan khusus mobil < 150 jt). */
export function priceBand(price: number) {
  if (price < 150_000_000) return "< 150 jt";
  if (price < 300_000_000) return "150–300 jt";
  if (price < 500_000_000) return "300–500 jt";
  return "> 500 jt";
}

export function catalogCsv(cars: Car[], origin: string): string {
  const rows = cars
    .filter((c) => c.price > 0 && c.images.length > 0)
    .map((c) => {
      const km = c.mileageKm > 0 ? `${c.mileageKm.toLocaleString("id-ID")} km, ` : "";
      const summary = `${carTitle(c)}. ${km}${c.transmission}, ${c.fuel}, warna ${c.color}. Unit ${c.id} di ${c.location}.`;
      const desc = clean(c.description) ? `${summary} ${clean(c.description)}` : summary;
      const record: Record<(typeof COLUMNS)[number], string> = {
        id: c.id,
        title: clean(carTitle(c)).slice(0, 150),
        description: desc.slice(0, 5000),
        // Booking/terjual tidak diiklankan; kembali "in stock" otomatis bila status diubah ke tersedia.
        availability: c.status === "ready" ? "in stock" : "out of stock",
        condition: "used",
        price: `${Math.round(c.price)} IDR`,
        link: `${origin}${carPath(c)}`,
        image_link: abs(c.images[0].src, origin),
        additional_image_link: c.images
          .slice(1, 11)
          .map((i) => abs(i.src, origin))
          .join(","),
        brand: c.brand,
        google_product_category: "916", // Vehicles & Parts > Vehicles > Motor Vehicles > Cars, Trucks & Vans
        product_type: `Mobil bekas > ${c.category}`,
        custom_label_0: c.category,
        custom_label_1: String(c.year),
        custom_label_2: c.transmission,
        custom_label_3: priceBand(c.price),
      };
      return COLUMNS.map((k) => cell(record[k])).join(",");
    });
  return [COLUMNS.join(","), ...rows].join("\n") + "\n";
}
