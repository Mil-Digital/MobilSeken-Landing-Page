// Conversions API: event yang sama dengan Pixel, dikirim dari server. Tetap sampai walau Pixel diblokir
// (iOS, ad blocker, skrip belum termuat). Butuh NEXT_PUBLIC_META_PIXEL_ID + META_CAPI_TOKEN (rahasia, hanya di Vercel).
// Hanya diimpor oleh /api/track (server).

import { createHash } from "node:crypto";
import { contentFor, PIXEL_ID, type MetaEvent } from "./events";

export const capiReady = () => Boolean(PIXEL_ID && process.env.META_CAPI_TOKEN);

export type CapiInput = {
  events: MetaEvent[];
  url: string;
  ip: string | null;
  ua: string;
  fbp: string | null;
  fbc: string | null;
  visitor: string;
  /** Nama & harga mobil untuk ViewContent / Contact. */
  car: { name: string; price: number } | null;
  /** Kode Test events (kunjungan tes lewat ?meta_test=TEST…). */
  testCode?: string;
  now?: number;
};

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export function capiPayload(input: CapiInput) {
  const user_data: Record<string, unknown> = {
    client_user_agent: input.ua,
    external_id: [sha256(input.visitor)],
  };
  if (input.ip) user_data.client_ip_address = input.ip;
  if (input.fbp) user_data.fbp = input.fbp;
  if (input.fbc) user_data.fbc = input.fbc;
  const event_time = Math.floor((input.now ?? Date.now()) / 1000);
  return input.events.map((e) => {
    const custom: Record<string, unknown> = { ...contentFor(e) };
    if (e.car && input.car) {
      custom.content_name = input.car.name;
      if (e.name === "ViewContent" && input.car.price > 0) {
        custom.value = input.car.price;
        custom.currency = "IDR";
      }
    }
    return {
      event_name: e.name,
      event_time,
      event_id: e.id,
      action_source: "website",
      event_source_url: input.url,
      user_data,
      ...(Object.keys(custom).length ? { custom_data: custom } : {}),
    };
  });
}

export async function sendCapi(input: CapiInput) {
  const token = process.env.META_CAPI_TOKEN;
  if (!PIXEL_ID || !token || input.events.length === 0) return;
  const version = process.env.META_API_VERSION || "v24.0";
  const body: Record<string, unknown> = { data: capiPayload(input), access_token: token };
  const testCode = input.testCode || process.env.META_TEST_EVENT_CODE;
  if (testCode) body.test_event_code = testCode;
  try {
    const res = await fetch(`https://graph.facebook.com/${version}/${PIXEL_ID}/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) console.error("[capi]", res.status, (await res.text()).slice(0, 400));
  } catch (e) {
    console.error("[capi]", e);
  }
}

/** Nilai cookie dari header Cookie (mis. _fbp, _fbc yang dibuat Pixel). */
export function cookieValue(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim()).slice(0, 400) || null;
  }
  return null;
}
