// Isi kategori (SUV / MPV / Sedan) untuk mobil yang belum punya, memakai saran otomatis.
// Jalankan: node --env-file=.env.local scripts/backfill-category.mjs
import { neon } from "@neondatabase/serverless";
import { suggestCategory } from "../src/lib/category.ts";

const sql = neon(process.env.DATABASE_URL);
const rows = await sql`select id, brand, model, variant, body_type from cars where category is null order by id`;
for (const r of rows) {
  const category = suggestCategory({ model: r.model, variant: r.variant, bodyType: r.body_type });
  await sql`update cars set category = ${category}, updated_at = now() where id = ${r.id} and category is null`;
  console.log(r.id, `${r.brand} ${r.model}`, `(${r.body_type})`, "→", category);
}
console.log(`${rows.length} mobil diisi kategorinya.`);
