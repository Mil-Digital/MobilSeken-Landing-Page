// Pengaman sementara halaman admin: kata sandi lewat HTTP Basic Auth (env ADMIN_PASSWORD).
// Dipakai proxy (semua /admin) dan diperiksa ulang di setiap Server Action admin.
// - Produksi tanpa ADMIN_PASSWORD → admin tertutup sepenuhnya.
// - Pengembangan lokal tanpa ADMIN_PASSWORD → terbuka (laptop sendiri).
// Fase 4 menggantinya dengan login Google + daftar email (Auth.js), sesuai brief.

import { createHash, timingSafeEqual } from "node:crypto";

const digest = (s: string) => createHash("sha256").update(s).digest();

export type AdminGate = "open" | "ok" | "denied" | "unconfigured";

export function checkAdmin(authorization: string | null | undefined): AdminGate {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return process.env.NODE_ENV === "production" ? "unconfigured" : "open";
  const m = /^Basic\s+(.+)$/i.exec(authorization ?? "");
  if (!m) return "denied";
  let given = "";
  try {
    given = Buffer.from(m[1], "base64").toString("utf8").split(":").slice(1).join(":");
  } catch {
    return "denied";
  }
  return timingSafeEqual(digest(given), digest(pass)) ? "ok" : "denied";
}
