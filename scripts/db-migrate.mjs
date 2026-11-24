// Terapkan db/schema.sql ke Neon. Pemakaian: node --env-file=.env.local scripts/db-migrate.mjs
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL kosong (isi di .env.local)");
const sql = neon(process.env.DATABASE_URL);
const ddl = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8")
  .split(/;\s*\n/)
  .map((s) => s.replace(/--.*$/gm, "").trim())
  .filter(Boolean);
for (const stmt of ddl) await sql.query(stmt);
const tables = await sql`select table_name from information_schema.tables where table_schema = 'public' order by 1`;
console.log("Skema diterapkan. Tabel:", tables.map((t) => t.table_name).join(", "));
