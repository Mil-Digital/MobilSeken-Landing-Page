// Dijalankan Next.js sebelum halaman interaktif: pasang tracker pengunjung (lihat src/lib/track.ts).
import { carFromPath, installClickTracking, track } from "@/lib/track";

try {
  installClickTracking();
  track("page_view");
} catch {
  /* analytics tidak boleh mengganggu situs */
}

let lastPath = typeof location !== "undefined" ? location.pathname : "";

/** Navigasi di dalam situs (tanpa muat ulang): catat sebagai kunjungan halaman. */
export function onRouterTransitionStart(url: string) {
  try {
    const path = new URL(url, location.origin).pathname;
    if (path === lastPath) return;
    lastPath = path;
    track("page_view", { path, car: carFromPath(path) });
  } catch {
    /* abaikan */
  }
}
