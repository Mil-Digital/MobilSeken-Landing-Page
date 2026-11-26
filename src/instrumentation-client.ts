// Dijalankan Next.js sebelum halaman interaktif: pasang tracker pengunjung (lihat src/lib/track.ts).
import { carFromPath, installClickTracking, track } from "@/lib/track";

try {
  installClickTracking();
  track("page_view");
} catch {
  /* analytics tidak boleh mengganggu situs */
}

let lastPath = typeof location !== "undefined" ? location.pathname : "";

/**
 * Navigasi di dalam situs (tanpa muat ulang): catat sebagai kunjungan halaman.
 * Dicatat setelah alamat di browser berganti, supaya Pixel Meta membaca URL halaman tujuan (bukan halaman asal).
 */
export function onRouterTransitionStart(url: string) {
  try {
    const path = new URL(url, location.origin).pathname;
    if (path === lastPath) return;
    lastPath = path;
    const started = performance.now();
    const fire = () => {
      if (lastPath !== path) return; // sudah pindah lagi sebelum sampai
      if (location.pathname !== path && performance.now() - started < 4000) return void requestAnimationFrame(fire);
      track("page_view", { path, car: carFromPath(path), nav: true });
    };
    fire();
  } catch {
    /* abaikan */
  }
}
