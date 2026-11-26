// Tracker pengunjung (sisi browser). Mengirim event ke /api/track lewat sendBeacon (tidak menunda klik).
// - Asal kunjungan (UTM, fbclid/gclid, referrer) dicatat sekali di awal sesi lalu ikut di setiap event,
//   jadi lead dihitung ke iklan/kampanye yang membawa pengunjung masuk.
// - Tidak berjalan di /admin, di browser otomatis, atau bila pemilik menekan "Abaikan kunjungan saya".

import type { EventType } from "@/lib/analytics/events";
import { metaEventsFor } from "@/lib/meta/events";
import { pixelTrack } from "@/lib/meta/pixel";

type Attr = { src?: string; med?: string; cmp?: string; cnt?: string; trm?: string; cid?: string; ref?: string; fbc?: string };

const rid = () => Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 8);

function store(kind: "local" | "session", key: string, make: () => string): string {
  try {
    const s = kind === "local" ? localStorage : sessionStorage;
    let v = s.getItem(key);
    if (!v) {
      v = make();
      s.setItem(key, v);
    }
    return v;
  } catch {
    return make();
  }
}

export const IGNORE_KEY = "ms_notrack";

/**
 * Kode "Test events" Meta (mis. TEST12851) dari link ?meta_test=…, diingat selama sesi.
 * Event server kunjungan ini muncul di tab Test events dan tidak dicatat di laporan admin.
 */
function metaTestCode(): string | undefined {
  try {
    const q = new URLSearchParams(location.search).get("meta_test")?.trim().toUpperCase();
    if (q && /^TEST\d{3,10}$/.test(q)) sessionStorage.setItem("ms_mt", q);
    return sessionStorage.getItem("ms_mt") ?? undefined;
  } catch {
    return undefined;
  }
}

export function trackingDisabled(): boolean {
  if (location.pathname.startsWith("/admin")) return true;
  try {
    // Tes Meta dari HP/laptop pemilik tetap jalan walau "Abaikan kunjungan saya" aktif.
    if (metaTestCode() && !/^(localhost|127\.)/.test(location.hostname)) return false;
    if (localStorage.getItem(IGNORE_KEY) === "1") return true;
    const test = localStorage.getItem("ms_track_test") === "1";
    if (navigator.webdriver && !test) return true;
    // Jangan catat dari laptop (localhost / jaringan lokal) supaya laporan hanya berisi pengunjung asli.
    if (!test && /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(location.hostname)) return true;
  } catch {
    /* penyimpanan diblokir: tetap lacak */
  }
  return false;
}

let attrCache: Attr | null = null;
function attribution(): Attr {
  if (attrCache) return attrCache;
  const raw = store("session", "ms_a", () => {
    const q = new URLSearchParams(location.search);
    const g = (k: string) => q.get(k)?.slice(0, 200) || undefined;
    let ref: string | undefined;
    try {
      if (document.referrer && new URL(document.referrer).host !== location.host) ref = document.referrer.slice(0, 300);
    } catch {
      /* referrer tidak valid */
    }
    const cid = q.has("fbclid") ? "fbclid" : q.has("gclid") ? "gclid" : q.has("ttclid") ? "ttclid" : undefined;
    // Format resmi Meta untuk klik iklan (fbc), dipakai Conversions API sebelum cookie _fbc dari Pixel ada.
    const fbclid = q.get("fbclid")?.slice(0, 300);
    const fbc = fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined;
    const a: Attr = { src: g("utm_source"), med: g("utm_medium"), cmp: g("utm_campaign"), cnt: g("utm_content"), trm: g("utm_term"), cid, ref, fbc };
    return JSON.stringify(a);
  });
  try {
    attrCache = JSON.parse(raw) as Attr;
  } catch {
    attrCache = {};
  }
  return attrCache!;
}

/** Kode unit dari URL detail mobil (/mobil/MS-0007-…). */
export const carFromPath = (path: string) => path.match(/^\/mobil\/(MS-\d{4})/)?.[1] ?? null;

type TrackOpts = {
  label?: string | null;
  car?: string | null;
  path?: string;
  /** Pindah halaman di dalam situs (tanpa muat ulang). */
  nav?: boolean;
  /** Kode unit yang sedang tampil (ViewCategory untuk iklan katalog per jenis). */
  ids?: string[];
};

export function track(type: EventType, opts: TrackOpts = {}) {
  if (typeof window === "undefined" || trackingDisabled()) return;
  const path = opts.path ?? location.pathname;
  const car = opts.car ?? carFromPath(path);
  const v = store("local", "ms_v", rid);
  // Id event dipakai bersama Pixel (browser) dan Conversions API (server) supaya Meta tidak menghitung dobel.
  const e = rid();
  try {
    pixelTrack(metaEventsFor({ type, eventId: e, car, path, nav: opts.nav, label: opts.label, ids: opts.ids }), v);
  } catch {
    /* Pixel tidak boleh mengganggu situs */
  }
  const body = JSON.stringify({
    type,
    path,
    car,
    label: opts.label ?? null,
    s: store("session", "ms_s", rid),
    v,
    e,
    nav: opts.nav || undefined,
    ids: opts.ids?.length ? opts.ids.slice(0, 10) : undefined,
    t: metaTestCode(),
    a: attribution(),
  });
  try {
    if (navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) return;
  } catch {
    /* jatuh ke fetch */
  }
  fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
}

/**
 * Link WhatsApp dalam bentuk apa pun: wa.me, api.whatsapp.com, whatsapp:// (aplikasi), atau link yang
 * dibungkus/diubah browser Facebook & Instagram (Meta bisa mengganti link WA saat situs dibuka dari iklan).
 */
export const isWhatsAppLink = (href: string) =>
  /^whatsapp:\/\//i.test(href) ||
  /^https?:\/\/([\w-]+\.)*(wa\.me|whatsapp\.com)\//i.test(href) ||
  /^https?:\/\/l\.(facebook|instagram)\.com\/.*(wa\.me|whatsapp\.com)/i.test(decodeURIComponent(href));

/** Area tombol yang diklik, dari [data-track-area] terdekat (mis. "header", "hero", "stok"). */
const areaOf = (el: Element) => el.closest<HTMLElement>("[data-track-area]")?.dataset.trackArea ?? "lainnya";

/** Satu pendengar klik untuk seluruh halaman: WhatsApp, telepon, peta, kartu mobil, dan [data-track]. */
export function installClickTracking() {
  document.addEventListener(
    "click",
    (e) => {
      const el = (e.target as Element | null)?.closest?.("a,button");
      if (!el) return;
      const href = el.getAttribute("href") ?? "";
      const area = areaOf(el);
      if (isWhatsAppLink(href)) return track("wa_click", { label: area });
      if (href.startsWith("tel:")) return track("tel_click", { label: area });
      if (/google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps|share\.google/.test(href)) return track("maps_click", { label: area });
      const car = carFromPath(href);
      if (car && car !== carFromPath(location.pathname)) return track("card_click", { car, label: area });
      const t = (el as HTMLElement).dataset.track as EventType | undefined;
      if (t) track(t, { label: (el as HTMLElement).dataset.trackLabel ?? el.textContent?.trim().slice(0, 60) ?? null });
    },
    { capture: true, passive: true },
  );
}
