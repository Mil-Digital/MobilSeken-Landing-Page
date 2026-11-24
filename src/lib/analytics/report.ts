import "server-only";

// Angka-angka dashboard admin, dihitung langsung dari tabel events (Neon).
// Periode: N hari terakhir, dibandingkan dengan N hari sebelumnya. Zona waktu: Asia/Jakarta.

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { readStoredCars } from "@/lib/store/local";
import type { Category } from "@/lib/category";
import type { Channel } from "./classify";

export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];

export type Delta = { now: number; prev: number };
export type NamedRow = { name: string; sessions: number; leads: number };

export type Report = {
  range: Range;
  /** Tanggal event pertama yang pernah tercatat (null = belum ada data). */
  since: string | null;
  totals: {
    sessions: Delta;
    visitors: Delta;
    leads: Delta;
    leadSessions: Delta;
    wa: number;
    tel: number;
    metaSessions: Delta;
    metaLeads: Delta;
    metaLeadSessions: Delta;
  };
  daily: { day: string; sessions: number; meta: number; leads: number }[];
  channels: { channel: Channel; sessions: number; leadSessions: number }[];
  meta: { platforms: NamedRow[]; campaigns: NamedRow[]; ads: NamedRow[]; adsets: NamedRow[]; untagged: number };
  cars: { id: string; name: string; category: Category | null; image: string | null; views: number; clicks: number; leads: number }[];
  buttons: { type: string; label: string; count: number }[];
  picks: { type: "category" | "brand" | "filter"; label: string; count: number }[];
  hours: { hour: number; sessions: number; leads: number }[];
  devices: { device: string; sessions: number }[];
  funnel: { sessions: number; viewed: number; contacted: number };
  recent: { ts: string; type: string; label: string | null; car: string | null; carName: string | null; channel: string | null; platform: string | null; campaign: string | null }[];
};

const LEAD = ["wa_click", "tel_click"];
const n = (v: unknown) => Number(v ?? 0);

export async function getReport(range: Range): Promise<Report> {
  const url = process.env.DATABASE_URL;
  if (!url) return emptyReport(range);
  const sql = neon(url);
  const r = range;

  const [totals, daily, channels, platforms, campaigns, ads, adsets, untagged, cars, buttons, picks, hours, devices, funnel, recent, since, stored] =
    await Promise.all([
      sql`
        with e as (select *, ts >= now() - make_interval(days => ${r}) as cur from events where ts >= now() - make_interval(days => ${2 * r}))
        select
          count(distinct session) filter (where cur) s1, count(distinct session) filter (where not cur) s0,
          count(distinct visitor) filter (where cur) v1, count(distinct visitor) filter (where not cur) v0,
          count(*) filter (where cur and type = any(${LEAD})) l1, count(*) filter (where not cur and type = any(${LEAD})) l0,
          count(distinct session) filter (where cur and type = any(${LEAD})) ls1, count(distinct session) filter (where not cur and type = any(${LEAD})) ls0,
          count(*) filter (where cur and type = 'wa_click') wa, count(*) filter (where cur and type = 'tel_click') tel,
          count(distinct session) filter (where cur and channel = 'meta_ads') ms1, count(distinct session) filter (where not cur and channel = 'meta_ads') ms0,
          count(*) filter (where cur and channel = 'meta_ads' and type = any(${LEAD})) ml1, count(*) filter (where not cur and channel = 'meta_ads' and type = any(${LEAD})) ml0,
          count(distinct session) filter (where cur and channel = 'meta_ads' and type = any(${LEAD})) mls1,
          count(distinct session) filter (where not cur and channel = 'meta_ads' and type = any(${LEAD})) mls0
        from e`,
      sql`
        with days as (
          select generate_series((now() at time zone 'Asia/Jakarta')::date - ${r - 1}::int, (now() at time zone 'Asia/Jakarta')::date, '1 day')::date d
        )
        select to_char(days.d, 'YYYY-MM-DD') as day,
          count(distinct e.session) sessions,
          count(distinct e.session) filter (where e.channel = 'meta_ads') meta,
          count(e.id) filter (where e.type = any(${LEAD})) leads
        from days left join events e on (e.ts at time zone 'Asia/Jakarta')::date = days.d
        group by days.d order by days.d`,
      sql`
        select coalesce(channel, 'other') as channel, count(distinct session) as sessions,
          count(distinct session) filter (where type = any(${LEAD})) lead_sessions
        from events where ts >= now() - make_interval(days => ${r}) group by 1 order by 2 desc`,
      named(sql, r, "coalesce(platform, 'lainnya')", "channel in ('meta_ads','meta_organic')"),
      named(sql, r, "coalesce(utm_campaign, '(tanpa nama kampanye)')", "channel = 'meta_ads'"),
      named(sql, r, "coalesce(utm_content, '(tanpa nama iklan)')", "channel = 'meta_ads'"),
      named(sql, r, "coalesce(utm_term, '(tanpa nama ad set)')", "channel = 'meta_ads'"),
      sql`select count(distinct session) n from events where ts >= now() - make_interval(days => ${r}) and channel = 'meta_organic' and click_id = 'fbclid'`,
      sql`
        select car_id, count(*) filter (where type = 'page_view') views, count(*) filter (where type = 'card_click') clicks,
          count(*) filter (where type = any(${LEAD})) leads
        from events where ts >= now() - make_interval(days => ${r}) and car_id is not null
        group by car_id order by count(*) filter (where type = 'page_view') + count(*) filter (where type = 'card_click') desc limit 12`,
      sql`
        select type, coalesce(label, '') as label, count(*) as count from events
        where ts >= now() - make_interval(days => ${r}) and type in ('wa_click','tel_click','maps_click','card_click','nav','photo_open')
        group by 1, 2 order by 3 desc limit 14`,
      sql`
        select type, coalesce(label, '') as label, count(*) as count from events
        where ts >= now() - make_interval(days => ${r}) and type in ('category','brand','filter')
        group by 1, 2 order by 3 desc limit 24`,
      sql`
        select extract(hour from ts at time zone 'Asia/Jakarta')::int as hour, count(distinct session) sessions,
          count(*) filter (where type = any(${LEAD})) leads
        from events where ts >= now() - make_interval(days => ${r}) group by 1`,
      sql`select coalesce(device, 'lainnya') as device, count(distinct session) as sessions from events where ts >= now() - make_interval(days => ${r}) group by 1 order by 2 desc`,
      sql`
        select count(distinct session) sessions,
          count(distinct session) filter (where car_id is not null) viewed,
          count(distinct session) filter (where type = any(${LEAD})) contacted
        from events where ts >= now() - make_interval(days => ${r})`,
      sql`
        select ts, type, label, car_id, channel, platform, utm_campaign from events
        where type = any(${LEAD}) order by ts desc limit 8`,
      sql`select min(ts) as first_ts from events`,
      readStoredCars(),
    ]);

  const byId = new Map(stored.map((c) => [c.id, c]));
  const t = totals[0] ?? {};
  const d = (a: string, b: string): Delta => ({ now: n(t[a]), prev: n(t[b]) });
  const hourMap = new Map(hours.map((h) => [n(h.hour), h]));

  return {
    range,
    since: since[0]?.first_ts ? new Date(since[0].first_ts as string).toISOString() : null,
    totals: {
      sessions: d("s1", "s0"),
      visitors: d("v1", "v0"),
      leads: d("l1", "l0"),
      leadSessions: d("ls1", "ls0"),
      wa: n(t.wa),
      tel: n(t.tel),
      metaSessions: d("ms1", "ms0"),
      metaLeads: d("ml1", "ml0"),
      metaLeadSessions: d("mls1", "mls0"),
    },
    daily: daily.map((x) => ({ day: String(x.day), sessions: n(x.sessions), meta: n(x.meta), leads: n(x.leads) })),
    channels: channels.map((x) => ({ channel: x.channel as Channel, sessions: n(x.sessions), leadSessions: n(x.lead_sessions) })),
    meta: { platforms, campaigns, ads, adsets, untagged: n(untagged[0]?.n) },
    cars: cars.map((x) => {
      const c = byId.get(String(x.car_id));
      return {
        id: String(x.car_id),
        name: c ? `${c.brand} ${c.model}` : String(x.car_id),
        category: c?.category ?? null,
        image: c?.images[0]?.src ?? null,
        views: n(x.views),
        clicks: n(x.clicks),
        leads: n(x.leads),
      };
    }),
    buttons: buttons.map((x) => ({ type: String(x.type), label: String(x.label), count: n(x.count) })),
    picks: picks.map((x) => ({ type: x.type as "category" | "brand" | "filter", label: String(x.label), count: n(x.count) })),
    hours: Array.from({ length: 24 }, (_, h) => ({ hour: h, sessions: n(hourMap.get(h)?.sessions), leads: n(hourMap.get(h)?.leads) })),
    devices: devices.map((x) => ({ device: String(x.device), sessions: n(x.sessions) })),
    funnel: { sessions: n(funnel[0]?.sessions), viewed: n(funnel[0]?.viewed), contacted: n(funnel[0]?.contacted) },
    recent: recent.map((x) => ({
      ts: new Date(x.ts as string).toISOString(),
      type: String(x.type),
      label: (x.label as string) ?? null,
      car: (x.car_id as string) ?? null,
      carName: x.car_id && byId.get(String(x.car_id)) ? `${byId.get(String(x.car_id))!.brand} ${byId.get(String(x.car_id))!.model}` : null,
      channel: (x.channel as string) ?? null,
      platform: (x.platform as string) ?? null,
      campaign: (x.utm_campaign as string) ?? null,
    })),
  };
}

/** Kelompokkan kunjungan & leads per nama (kampanye, iklan, ad set, platform). `expr`/`where` adalah SQL tetap. */
async function named(sql: NeonQueryFunction<false, false>, r: number, expr: string, where: string): Promise<NamedRow[]> {
  const rows = (await sql.query(
    `select ${expr} as name, count(distinct session) sessions,
       count(*) filter (where type = any($2)) leads
     from events where ts >= now() - make_interval(days => $1) and ${where}
     group by 1 order by 2 desc limit 8`,
    [r, LEAD],
  )) as Record<string, unknown>[];
  return rows.map((x) => ({ name: String(x.name), sessions: n(x.sessions), leads: n(x.leads) }));
}

export function emptyReport(range: Range): Report {
  const z: Delta = { now: 0, prev: 0 };
  return {
    range,
    since: null,
    totals: { sessions: z, visitors: z, leads: z, leadSessions: z, wa: 0, tel: 0, metaSessions: z, metaLeads: z, metaLeadSessions: z },
    daily: [],
    channels: [],
    meta: { platforms: [], campaigns: [], ads: [], adsets: [], untagged: 0 },
    cars: [],
    buttons: [],
    picks: [],
    hours: Array.from({ length: 24 }, (_, h) => ({ hour: h, sessions: 0, leads: 0 })),
    devices: [],
    funnel: { sessions: 0, viewed: 0, contacted: 0 },
    recent: [],
  };
}
