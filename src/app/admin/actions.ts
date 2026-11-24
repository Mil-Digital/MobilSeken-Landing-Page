"use server";

import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { checkAdmin } from "@/lib/admin-auth";
import type { CarStatus } from "@/lib/cars";
import { storageWritable, updateStoredCar } from "@/lib/store/local";

/** Ubah status mobil: Ready / Booking / Terjual. Terjual = disembunyikan dari daftar, data tetap ada. */
export async function setCarStatus(id: string, status: CarStatus): Promise<{ ok: boolean; error?: string }> {
  const gate = checkAdmin((await headers()).get("authorization"));
  if (gate !== "ok" && gate !== "open") return { ok: false, error: "Sesi admin tidak valid." };
  if (!["ready", "booking", "sold"].includes(status)) return { ok: false, error: "Status tidak dikenal." };
  if (!/^MS-\d{4}$/.test(id)) return { ok: false, error: "Kode unit tidak valid." };
  if (!storageWritable()) return { ok: false, error: "Penyimpanan belum tersambung." };
  if (!updateStoredCar(id, { status })) return { ok: false, error: "Mobil tidak ditemukan." };
  updateTag("cars");
  return { ok: true };
}
