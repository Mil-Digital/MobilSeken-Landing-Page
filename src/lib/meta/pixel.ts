// Meta Pixel di browser. Hanya aktif bila NEXT_PUBLIC_META_PIXEL_ID diisi, dan hanya dipanggil lewat track()
// (jadi ikut aturan yang sama: tidak di /admin, tidak di laptop, tidak bila "Abaikan kunjungan saya").
// Skrip Meta dimuat saat browser senggang supaya tidak memperlambat tampilan pertama; event sebelumnya diantre.

import { contentFor, PIXEL_ID, type MetaEvent } from "./events";

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: unknown;
  loaded: boolean;
  version: string;
  disablePushState?: boolean;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

let state: "off" | "starting" | "ready" = "off";
const pending: unknown[][] = [];

async function sha256(s: string): Promise<string | null> {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

function stub(): Fbq {
  if (window.fbq) return window.fbq;
  const n = function (...args: unknown[]) {
    if (n.callMethod) n.callMethod(...args);
    else n.queue.push(args);
  } as Fbq;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];
  window.fbq = n;
  window._fbq ??= n;
  return n;
}

function start(visitor: string) {
  if (state !== "off" || !PIXEL_ID) return;
  state = "starting";
  const fbq = stub();
  // PageView dikirim sendiri sekali per muat halaman (id sama dengan server), bukan otomatis saat pindah halaman.
  fbq.disablePushState = true;
  fbq("set", "autoConfig", false, PIXEL_ID);
  // external_id = kode acak browser (di-hash), sama dengan yang dikirim server → pencocokan lebih baik.
  void sha256(visitor).then((h) => {
    fbq("init", PIXEL_ID, h ? { external_id: h } : {});
    state = "ready";
    for (const args of pending.splice(0)) fbq(...args);
    const load = () => {
      const s = document.createElement("script");
      s.async = true;
      s.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(s);
    };
    if ("requestIdleCallback" in window) requestIdleCallback(load, { timeout: 2500 });
    else setTimeout(load, 1200);
  });
}

export function pixelTrack(events: MetaEvent[], visitor: string) {
  if (!PIXEL_ID || events.length === 0) return;
  start(visitor);
  for (const e of events) {
    // ViewCategory bukan event standar Meta → trackCustom.
    const args = [e.name === "ViewCategory" ? "trackCustom" : "track", e.name, contentFor(e), { eventID: e.id }];
    if (state === "ready") window.fbq?.(...args);
    else pending.push(args);
  }
}
