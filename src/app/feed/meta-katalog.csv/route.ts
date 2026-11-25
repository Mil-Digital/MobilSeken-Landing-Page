// URL feed katalog untuk Meta Commerce Manager → Katalog → Sumber data → Feed terjadwal.
// Isinya mengikuti katalog di /admin secara otomatis (impor baru, ubah status, terjual).

import { listAllCars } from "@/lib/cars";
import { catalogCsv } from "@/lib/meta/feed";

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const csv = catalogCsv(await listAllCars(), origin);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=600",
      "x-robots-tag": "noindex",
    },
  });
}
