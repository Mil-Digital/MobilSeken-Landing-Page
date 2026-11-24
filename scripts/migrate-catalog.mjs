// Pindahkan katalog ke Neon (data) + Vercel Blob (foto). Aman dijalankan berulang.
// 1) Mobil di content/catalog/cars.json yang belum ada di Neon → dimasukkan (data Neon yang ada TIDAK ditimpa).
// 2) Semua foto mobil di Neon yang masih lokal (/catalog/...) → diunggah ke Blob, alamatnya diperbarui.
// Pemakaian: node --env-file=.env.local scripts/migrate-catalog.mjs
import { neon } from "@neondatabase/serverless";
import { put } from "@vercel/blob";
import { existsSync, readFileSync } from "node:fs";

const { DATABASE_URL, BLOB_READ_WRITE_TOKEN } = process.env;
if (!DATABASE_URL || !BLOB_READ_WRITE_TOKEN) throw new Error("DATABASE_URL dan BLOB_READ_WRITE_TOKEN wajib ada di .env.local");
const sql = neon(DATABASE_URL);

const file = new URL("../content/catalog/cars.json", import.meta.url);
const local = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
let inserted = 0;
for (const car of local) {
  const rows = await sql`
    insert into cars (id, status, featured, brand, model, variant, year, price, mileage_km, transmission, fuel, color,
      body_type, location, description, specs, images, created_at, olx_listing_id, olx_url, olx_seller_id, olx_status,
      olx_title, synced_at)
    values (${car.id}, ${car.status}, ${car.featured}, ${car.brand}, ${car.model}, ${car.variant}, ${car.year}, ${car.price},
      ${car.mileageKm}, ${car.transmission}, ${car.fuel}, ${car.color}, ${car.bodyType}, ${car.location}, ${car.description},
      ${JSON.stringify(car.specs)}, ${JSON.stringify(car.images)}, ${car.createdAt}, ${car.olx.listingId}, ${car.olx.url},
      ${car.olx.sellerId}, ${car.olx.status}, ${car.olx.title}, ${car.olx.syncedAt})
    on conflict do nothing returning id`;
  inserted += rows.length;
}

let uploaded = 0;
const cars = await sql`select id, brand, model, year, images from cars order by id`;
for (const car of cars) {
  let changed = false;
  const images = [];
  for (const img of car.images) {
    if (!img.src.startsWith("/catalog/")) {
      images.push(img);
      continue;
    }
    const path = new URL("../public" + img.src, import.meta.url);
    if (!existsSync(path)) throw new Error(`Foto lokal hilang: ${img.src} (${car.id})`);
    const { url } = await put("cars/" + img.src.slice("/catalog/".length), readFileSync(path), {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 31536000,
    });
    images.push({ ...img, src: url });
    uploaded++;
    changed = true;
  }
  if (changed) await sql`update cars set images = ${JSON.stringify(images)}::jsonb, updated_at = now() where id = ${car.id}`;
  console.log(`✓ ${car.id} ${car.brand} ${car.model} ${car.year} · ${images.length} foto${changed ? " (diunggah)" : ""}`);
}
const [{ n }] = await sql`select count(*)::int as n from cars`;
const [{ left }] = await sql`select count(*)::int as left from cars, jsonb_array_elements(images) i where i->>'src' like '/catalog/%'`;
console.log(`Selesai: ${inserted} mobil baru dari file, ${uploaded} foto diunggah ke Blob. Total mobil: ${n}. Foto belum di Blob: ${left}.`);
