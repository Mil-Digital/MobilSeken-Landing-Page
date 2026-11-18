// Data bisnis. Sumber: website lama (mobilsekenbandung.com) kecuali yang bertanda TODO.
// Nilai bertanda TODO wajib dikonfirmasi pemilik sebelum rilis.

export const SITE = {
  brand: "MS Garage",
  legalName: "Mobil Seken Bandung",
  tagline: "Mobil bekas pilihan di Bandung",
  // Dari tombol WA di website lama. Bisa ditimpa env NEXT_PUBLIC_WA_NUMBER.
  waNumber: process.env.NEXT_PUBLIC_WA_NUMBER || "6282121356565",
  // TODO_NOMOR_TELEPON: website lama tidak mencantumkan nomor telepon terpisah.
  // Sementara memakai nomor WA yang sama.
  phoneNumber: process.env.NEXT_PUBLIC_PHONE_NUMBER || "+6282121356565",
  address: {
    street: "Jl. Sriwijaya No.29",
    area: "Cigereleng, Regol",
    city: "Kota Bandung, Jawa Barat 40253",
  },
  // Link Google Maps resmi dari pemilik (18 Nov 2026).
  mapsUrl: "https://share.google/qj4r9lz76cRVxYMxb",
  // Jam dari pemilik: 08.00–17.00. TODO_HARI_BUKA: hari libur belum dikonfirmasi.
  hoursShort: "08.00–17.00",
  hours: [{ days: "Jam buka", time: "08.00 – 17.00 WIB" }],
  // TODO_INSTAGRAM
  instagram: null as string | null,
  siteUrl: process.env.PUBLIC_HOST ? `https://${process.env.PUBLIC_HOST}` : "http://localhost:3000",
} as const;

export function waLink(text?: string) {
  const base = `https://wa.me/${SITE.waNumber}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function telLink() {
  return `tel:${SITE.phoneNumber.replace(/[^+\d]/g, "")}`;
}
