// Menerima event pengunjung dari tracker (navigator.sendBeacon) dan menyimpannya ke tabel events.
// Tidak menyimpan data pribadi: hanya id acak sesi/browser, halaman, tombol, dan asal kunjungan.

import { neon } from "@neondatabase/serverless";
import { after } from "next/server";
import { z } from "zod";
import { classify } from "@/lib/analytics/classify";
import { EVENT_TYPES } from "@/lib/analytics/events";
import { getCar } from "@/lib/cars";
import { capiReady, cookieValue, sendCapi } from "@/lib/meta/capi";
import { metaEventsFor } from "@/lib/meta/events";

const str = (max: number) => z.string().trim().max(max).optional().nullable();

const Body = z.object({
  type: z.enum(EVENT_TYPES),
  path: z.string().max(300),
  car: z.string().regex(/^MS-\d{4}$/).optional().nullable(),
  label: str(80),
  s: z.string().regex(/^[a-z0-9]{8,32}$/),
  v: z.string().regex(/^[a-z0-9]{8,32}$/),
  e: z.string().regex(/^[a-z0-9]{8,32}$/).optional(),
  /** true = pindah halaman di dalam situs (tanpa muat ulang). */
  nav: z.boolean().optional(),
  ids: z.array(z.string().regex(/^MS-\d{4}$/)).max(10).optional().catch(undefined),
  a: z
    .object({
      src: str(100),
      med: str(100),
      cmp: str(200),
      cnt: str(200),
      trm: str(200),
      cid: z.enum(["fbclid", "gclid", "ttclid"]).optional().nullable(),
      ref: str(300),
      fbc: z.string().max(400).regex(/^fb\.1\.\d+\.[\w-]+$/).nullish().catch(null),
    })
    .default({}),
});

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|meta-externalagent|headless|lighthouse|preview|curl|wget|python|axios/i;
const none = () => new Response(null, { status: 204 });

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) return none();
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return none();

  // Hanya dari situs ini sendiri.
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return new Response(null, { status: 403 });

  const text = await req.text();
  if (text.length > 4000) return new Response(null, { status: 413 });
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(JSON.parse(text));
  } catch {
    return new Response(null, { status: 400 });
  }
  if (body.path.startsWith("/admin")) return none();

  const a = body.a;
  const { channel, platform } = classify({ utmSource: a.src, utmMedium: a.med, utmCampaign: a.cmp, clickId: a.cid, referrer: a.ref });
  const device = /iPad|Tablet/i.test(ua) ? "tablet" : /Mobi|Android|iPhone/i.test(ua) ? "mobile" : "desktop";

  // Conversions API: kirim ke Meta setelah respons selesai (tidak menunda pengunjung).
  const metaEvents = body.e ? metaEventsFor({ type: body.type, eventId: body.e, car: body.car ?? null, path: body.path, nav: body.nav, label: body.label, ids: body.ids }) : [];
  if (metaEvents.length && capiReady()) {
    const cookie = req.headers.get("cookie");
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip");
    const url = `${new URL(req.url).origin}${body.path}`;
    const carId = body.car ?? null;
    after(async () => {
      const car = carId ? await getCar(carId).catch(() => null) : null;
      await sendCapi({
        events: metaEvents,
        url,
        ip: ip ?? null,
        ua,
        fbp: cookieValue(cookie, "_fbp"),
        fbc: cookieValue(cookie, "_fbc") ?? a.fbc ?? null,
        visitor: body.v,
        car: car ? { name: `${car.brand} ${car.model} ${car.year}`, price: car.price } : null,
      });
    });
  }

  const sql = neon(process.env.DATABASE_URL);
  await sql`
    insert into events (type, car_id, label, path, session, visitor, utm_source, utm_medium, utm_campaign, utm_content,
      utm_term, click_id, referrer, channel, platform, device)
    values (${body.type}, ${body.car ?? null}, ${body.label ?? null}, ${body.path}, ${body.s}, ${body.v}, ${a.src ?? null},
      ${a.med ?? null}, ${a.cmp ?? null}, ${a.cnt ?? null}, ${a.trm ?? null}, ${a.cid ?? null}, ${a.ref ?? null},
      ${channel}, ${platform}, ${device})`;
  return none();
}
