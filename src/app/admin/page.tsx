import { headers } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { demoReport } from "@/lib/analytics/demo";
import { emptyReport, getReport, RANGES, type Delta, type NamedRow, type Range, type Report } from "@/lib/analytics/report";
import { LineChart, RadialHours } from "./laporan/charts";
import { PIXEL_ID } from "@/lib/meta/events";
import { CATEGORIES } from "@/lib/category";
import { CopyLinks, CopyParams, CopyRow, IgnoreMe } from "./laporan/widgets";

// Laporan pengunjung, leads, dan iklan Meta. Angka dihitung langsung dari tabel events.

type Search = Promise<{ [k: string]: string | string[] | undefined }>;

export default function AdminReport({ searchParams }: { searchParams: Search }) {
  return (
    <Suspense fallback={<p className="text-body text-steel">Memuat laporan…</p>}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

const CHANNEL: Record<string, { label: string; color: string }> = {
  meta_ads: { label: "Iklan Meta", color: "var(--viz-1)" },
  meta_organic: { label: "Meta organik", color: "var(--viz-5)" },
  google_ads: { label: "Iklan Google", color: "var(--viz-2)" },
  google: { label: "Google", color: "var(--viz-2)" },
  direct: { label: "Langsung", color: "var(--viz-3)" },
  tiktok: { label: "TikTok", color: "var(--viz-muted)" },
  other: { label: "Lainnya", color: "var(--viz-muted)" },
};
const CATEGORY_COLOR: Record<string, { bg: string; ink: string }> = {
  SUV: { bg: "var(--viz-1)", ink: "#ffffff" },
  MPV: { bg: "var(--viz-3)", ink: "#ffffff" },
  Sedan: { bg: "var(--viz-5)", ink: "#0d0e11" },
};
const AREA: Record<string, string> = {
  header: "header",
  hero: "hero",
  stok: "daftar stok",
  "bar-bawah": "bar bawah detail",
  detail: "panel detail",
  "tombol-melayang": "tombol melayang",
  menu: "menu",
  showroom: "bagian showroom",
  footer: "footer",
  "mobil-serupa": "mobil serupa",
  terjual: "halaman terjual",
  galeri: "galeri foto",
  lainnya: "lainnya",
};
const BUTTON: Record<string, string> = {
  wa_click: "WhatsApp",
  tel_click: "Telepon",
  maps_click: "Petunjuk arah",
  card_click: "Buka mobil",
  nav: "Menu",
  photo_open: "Foto layar penuh",
};
const PLATFORM: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", messenger: "Messenger", audience_network: "Audience Network", threads: "Threads" };

const fmt = (v: number) => v.toLocaleString("id-ID");
const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);
const pctLabel = (v: number) => `${v.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;

async function Dashboard({ searchParams }: { searchParams: Search }) {
  await connection();
  const sp = await searchParams;
  const r = Number(sp.r);
  const range: Range = (RANGES as readonly number[]).includes(r) ? (r as Range) : 30;
  const demo = process.env.NODE_ENV !== "production" && sp.demo === "1";
  let report: Report;
  let failed = false;
  try {
    report = demo ? await demoReport(range) : await getReport(range);
  } catch (e) {
    console.error("[laporan]", e);
    failed = true;
    report = emptyReport(range);
  }
  const t = report.totals;
  const days = report.daily.map((d) => d.day);
  const conv = pct(t.leadSessions.now, t.sessions.now);
  const convPrev = pct(t.leadSessions.prev, t.sessions.prev);
  const metaConv = pct(t.metaLeadSessions.now, t.metaSessions.now);
  const metaConvPrev = pct(t.metaLeadSessions.prev, t.metaSessions.prev);
  const q = (x: number) => `?r=${x}${demo ? "&demo=1" : ""}`;
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:gap-5">
      {/* Judul + periode */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="dash-label">Laporan {demo && "· data contoh"}</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.03em] text-platinum md:text-[34px]">Pengunjung &amp; leads</h1>
          <p className="mt-1 text-micro text-steel">
            {report.since
              ? `Data terkumpul sejak ${new Date(report.since).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" })}. Dibandingkan dengan ${range} hari sebelumnya.`
              : failed
                ? "Database belum bisa dibaca."
                : "Belum ada data. Angka mulai terisi begitu ada pengunjung di web live."}
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          <div className="flex rounded-full border border-hairline bg-cabin p-1" role="tablist" aria-label="Periode">
            {RANGES.map((x) => (
              <Link
                key={x}
                href={q(x)}
                role="tab"
                aria-selected={x === range}
                className={`rounded-full px-4 py-1.5 text-micro font-medium transition-colors ${x === range ? "bg-platinum text-night" : "text-steel hover:text-platinum"}`}
              >
                {x} hari
              </Link>
            ))}
          </div>
          <IgnoreMe />
        </div>
      </div>

      {/* Baris 1: leads + kunjungan */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:gap-5 lg:grid-cols-12">
        <section className="dash-card lg:col-span-5" aria-labelledby="k-leads">
          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="sm:w-[45%]">
              <h2 id="k-leads" className="text-body text-steel">
                Leads
              </h2>
              <p className="mt-3 flex items-baseline gap-2">
                <span className="dash-num text-[52px] text-platinum md:text-[60px]">{fmt(t.leads.now)}</span>
                <Change d={t.leads} />
              </p>
              <p className="mt-3 text-micro text-steel">
                WhatsApp <b className="text-platinum">{fmt(t.wa)}</b> · Telepon <b className="text-platinum">{fmt(t.tel)}</b>
              </p>
              <p className="mt-1 text-micro text-steel">
                Konversi <b className="text-platinum">{pctLabel(conv)}</b> <Change d={{ now: conv, prev: convPrev }} small points />
              </p>
            </div>
            <div className="dash-inset min-w-0 flex-1 px-3 pt-3 pb-8">
              <p className="mb-2 px-1 text-[12px] text-steel">Leads per hari</p>
              <LineChart days={days} series={[{ key: "leads", label: "Leads", color: "var(--viz-3)", values: report.daily.map((d) => d.leads) }]} height={130} area />
            </div>
          </div>
        </section>

        <section className="dash-card lg:col-span-7" aria-labelledby="k-sessions">
          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="sm:w-[38%]">
              <h2 id="k-sessions" className="text-body text-steel">
                Kunjungan
              </h2>
              <p className="mt-3 flex items-baseline gap-2">
                <span className="dash-num text-[52px] text-platinum md:text-[60px]">{fmt(t.sessions.now)}</span>
                <Change d={t.sessions} />
              </p>
              <p className="mt-3 text-micro text-steel">
                Pengunjung unik <b className="text-platinum">{fmt(t.visitors.now)}</b>
              </p>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-micro text-steel">
                <Legend color="var(--viz-1)" label="Dari iklan Meta" />
                <Legend color="var(--viz-muted)" label="Semua kunjungan" />
              </div>
            </div>
            <div className="dash-inset min-w-0 flex-1 px-3 pt-3 pb-8">
              <LineChart
                days={days}
                height={150}
                series={[
                  { key: "all", label: "Semua kunjungan", color: "var(--viz-muted)", values: report.daily.map((d) => d.sessions) },
                  { key: "meta", label: "Dari iklan Meta", color: "var(--viz-1)", values: report.daily.map((d) => d.meta) },
                ]}
              />
            </div>
          </div>
        </section>
      </div>

      {/* Baris 2: iklan Meta + jam ramai */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:gap-5 lg:grid-cols-12">
        <section className="dash-card lg:col-span-7" aria-labelledby="meta-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="meta-title" className="text-[20px] font-semibold tracking-[-0.02em] text-platinum">
              Iklan Meta
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-micro text-steel">
              {report.meta.platforms.length === 0 ? (
                <span>Belum ada kunjungan dari Facebook/Instagram</span>
              ) : (
                report.meta.platforms.map((p) => (
                  <span key={p.name}>
                    {PLATFORM[p.name] ?? p.name} <b className="tnum text-platinum">{fmt(p.sessions)}</b>
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <Stat label="Kunjungan dari iklan" value={fmt(t.metaSessions.now)} d={t.metaSessions} />
            <Stat label="Leads dari iklan" value={fmt(t.metaLeads.now)} d={t.metaLeads} />
            <Stat label="Konversi iklan" value={pctLabel(metaConv)} d={{ now: metaConv, prev: metaConvPrev }} points />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <NamedTable title="Kampanye" rows={report.meta.campaigns} />
            <NamedTable title="Iklan" rows={report.meta.ads} />
          </div>
          {report.meta.adsets.length > 0 && (
            <div className="mt-4">
              <NamedTable title="Ad set" rows={report.meta.adsets} />
            </div>
          )}
          {report.meta.untagged > 0 && (
            <p className="mt-4 rounded-[12px] bg-[rgb(201_133_0/0.12)] px-3 py-2 text-micro text-platinum">
              {fmt(report.meta.untagged)} kunjungan dari Meta datang tanpa parameter UTM, jadi terhitung organik. Pasang parameter di bawah pada semua iklan.
            </p>
          )}
          <div className="mt-5">
            <CopyParams />
          </div>
          <p className="mt-3 text-[11.5px] text-steel">
            Biaya iklan, tayangan, dan biaya per lead bisa ditarik langsung dari Meta setelah akses Marketing API disambungkan.
          </p>
          <MetaSetup origin={origin} />
        </section>

        <section className="dash-card lg:col-span-5" aria-labelledby="hours-title">
          <div className="flex items-center justify-between">
            <h2 id="hours-title" className="text-[20px] font-semibold tracking-[-0.02em] text-platinum">
              Jam ramai
            </h2>
            <span className="dash-label">WIB</span>
          </div>
          <p className="mt-1 text-micro text-steel">Kunjungan per jam. Pasang iklan & siagakan admin WhatsApp di jam puncak.</p>
          <div className="mt-4">
            <RadialHours hours={report.hours} color="var(--viz-3)" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-hairline pt-4">
            {report.devices.slice(0, 3).map((d) => (
              <div key={d.device}>
                <p className="dash-label">{d.device === "mobile" ? "HP" : d.device === "desktop" ? "Laptop/PC" : d.device}</p>
                <p className="dash-num mt-1 text-[22px] text-platinum">{pctLabel(pct(d.sessions, t.sessions.now))}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Baris 3: mobil paling diminati + sumber */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:gap-5 lg:grid-cols-12">
        <section className="dash-card lg:col-span-8" aria-labelledby="cars-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="cars-title" className="text-[20px] font-semibold tracking-[-0.02em] text-platinum">
              Mobil paling sering dibuka
            </h2>
            <div className="flex gap-4 text-micro text-steel">
              {Object.entries(CATEGORY_COLOR).map(([k, v]) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-[3px]" style={{ background: v.bg }} />
                  {k}
                </span>
              ))}
            </div>
          </div>
          <CarTiles cars={report.cars} />
        </section>

        <section className="dash-card lg:col-span-4" aria-labelledby="src-title">
          <h2 id="src-title" className="text-[20px] font-semibold tracking-[-0.02em] text-platinum">
            Sumber pengunjung
          </h2>
          <p className="mt-1 text-micro text-steel">Kunjungan dan sesi yang berakhir menghubungi.</p>
          <Bars
            rows={report.channels.map((c) => ({
              key: c.channel,
              label: CHANNEL[c.channel]?.label ?? c.channel,
              color: CHANNEL[c.channel]?.color ?? "var(--viz-muted)",
              value: c.sessions,
              note: `${fmt(c.leadSessions)} lead · ${pctLabel(pct(c.leadSessions, c.sessions))}`,
            }))}
            empty="Belum ada kunjungan."
          />
        </section>
      </div>

      {/* Baris 4: tombol, pilihan, perjalanan, leads terbaru */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:gap-5 md:grid-cols-2 lg:grid-cols-12">
        <section className="dash-card lg:col-span-4" aria-labelledby="btn-title">
          <h2 id="btn-title" className="text-[20px] font-semibold tracking-[-0.02em] text-platinum">
            Tombol paling sering diklik
          </h2>
          <Bars
            rows={report.buttons.map((b, i) => ({
              key: `${b.type}-${b.label}-${i}`,
              label: `${BUTTON[b.type] ?? b.type}`,
              sub: b.type === "nav" ? b.label : AREA[b.label] ?? b.label,
              color: b.type === "wa_click" || b.type === "tel_click" ? "var(--viz-3)" : "var(--viz-muted)",
              value: b.count,
            }))}
            empty="Belum ada klik."
          />
          <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-steel">
            <span className="size-2 rounded-full bg-[var(--viz-3)]" /> hijau = tombol leads (WhatsApp/telepon)
          </p>
        </section>

        <section className="dash-card lg:col-span-4" aria-labelledby="pick-title">
          <h2 id="pick-title" className="text-[20px] font-semibold tracking-[-0.02em] text-platinum">
            Yang dicari pengunjung
          </h2>
          {(["category", "brand", "filter"] as const).map((k) => {
            const rows = report.picks.filter((p) => p.type === k);
            if (!rows.length) return null;
            return (
              <div key={k} className="mt-4">
                <p className="dash-label">{k === "category" ? "Jenis" : k === "brand" ? "Merek" : "Filter lanjutan"}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {rows.map((p) => (
                    <span key={p.label} className="inline-flex items-center gap-2 rounded-full border border-hairline bg-panel py-1 pr-1 pl-3 text-micro text-platinum">
                      {p.label}
                      <span className="tnum rounded-full bg-night px-2 py-0.5 font-mono text-[11px] text-steel">{fmt(p.count)}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
          {report.picks.length === 0 && <p className="mt-4 text-micro text-steel">Belum ada pilihan jenis/merek.</p>}
        </section>

        <section className="dash-card md:col-span-2 lg:col-span-4" aria-labelledby="funnel-title">
          <h2 id="funnel-title" className="text-[20px] font-semibold tracking-[-0.02em] text-platinum">
            Perjalanan pengunjung
          </h2>
          <Funnel f={report.funnel} />
        </section>
      </div>

      <section className="dash-card" aria-labelledby="recent-title">
        <div className="flex items-center justify-between">
          <h2 id="recent-title" className="text-[20px] font-semibold tracking-[-0.02em] text-platinum">
            Leads terbaru
          </h2>
          <span className="dash-label">semua periode</span>
        </div>
        {report.recent.length === 0 ? (
          <p className="mt-4 text-micro text-steel">Belum ada yang menghubungi lewat web.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--hairline)]">
            {report.recent.map((l, i) => (
              <li key={i} className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1 py-3 md:grid-cols-[110px_120px_1fr_1fr]">
                <span className="font-mono text-[12px] text-steel">
                  {new Date(l.ts).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
                </span>
                <span className="text-micro font-semibold text-[var(--good)]">{l.type === "tel_click" ? "Telepon" : "WhatsApp"}</span>
                <span className="col-span-2 truncate text-body text-platinum md:col-span-1">
                  {l.carName ? `${l.carName} · ${l.car}` : "Tanya umum"}
                  <span className="text-steel"> · {AREA[l.label ?? ""] ?? l.label}</span>
                </span>
                <span className="col-span-2 truncate text-micro text-steel md:col-span-1">
                  {CHANNEL[l.channel ?? ""]?.label ?? "—"}
                  {l.platform && ` · ${PLATFORM[l.platform] ?? l.platform}`}
                  {l.campaign && ` · ${l.campaign}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ───────────── potongan kecil ─────────────

function Change({ d, small, points }: { d: Delta; small?: boolean; points?: boolean }) {
  if (d.prev === 0 && d.now === 0) return null;
  const diff = points ? d.now - d.prev : d.prev > 0 ? ((d.now - d.prev) / d.prev) * 100 : null;
  if (diff === null) return <span className={`font-mono text-[var(--good)] ${small ? "text-[11px]" : "text-[13px]"}`}>baru</span>;
  const up = diff >= 0;
  const text = `${Math.abs(diff).toLocaleString("id-ID", { maximumFractionDigits: 1 })}${points ? " poin" : "%"}`;
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-mono font-semibold ${up ? "text-[var(--good)]" : "text-[var(--bad)]"} ${small ? "text-[11px]" : "text-[13px]"}`}
      aria-label={`${up ? "naik" : "turun"} ${text} dari periode sebelumnya`}
    >
      <span aria-hidden>{up ? "↑" : "↓"}</span>
      {text}
    </span>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-0.5 w-4 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function Stat({ label, value, d, points }: { label: string; value: string; d: Delta; points?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[12px] text-steel">
        <span className="size-1.5 rounded-full bg-[var(--viz-1)]" />
        <span className="truncate">{label}</span>
      </p>
      <p className="dash-num mt-2 text-[26px] text-platinum md:text-[34px]">{value}</p>
      <p className="mt-1">
        <Change d={d} small points={points} />
      </p>
    </div>
  );
}

function NamedTable({ title, rows }: { title: string; rows: NamedRow[] }) {
  return (
    <div className="dash-inset p-4">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 text-[11px]">
        <span className="dash-label">{title}</span>
        <span className="dash-label text-right">Kunj.</span>
        <span className="dash-label text-right">Leads</span>
        <span className="dash-label w-12 text-right">Konv.</span>
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-micro text-steel">Belum ada data.</p>
      ) : (
        <ul className="mt-2">
          {rows.map((r) => (
            <li key={r.name} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 border-t border-hairline py-2 text-micro">
              <span className="truncate text-platinum" title={r.name}>
                {r.name}
              </span>
              <span className="tnum text-right text-steel">{fmt(r.sessions)}</span>
              <span className="tnum text-right text-platinum">{fmt(r.leads)}</span>
              <span className="tnum w-12 text-right text-steel">{pctLabel(pct(r.leads, r.sessions))}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Bars({
  rows,
  empty,
}: {
  rows: { key: string; label: string; sub?: string; color: string; value: number; note?: string }[];
  empty: string;
}) {
  if (rows.length === 0) return <p className="mt-4 text-micro text-steel">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="mt-4 grid gap-3">
      {rows.map((r) => (
        <li key={r.key} title={`${r.label}${r.sub ? ` · ${r.sub}` : ""}: ${fmt(r.value)}`}>
          <div className="flex items-baseline justify-between gap-3 text-micro">
            <span className="min-w-0 truncate text-platinum">
              {r.label}
              {r.sub && <span className="text-steel"> · {r.sub}</span>}
            </span>
            <span className="tnum shrink-0 font-semibold text-platinum">{fmt(r.value)}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-panel">
            <div className="h-full rounded-full" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: r.color }} />
          </div>
          {r.note && <p className="mt-1 text-[11.5px] text-steel">{r.note}</p>}
        </li>
      ))}
    </ul>
  );
}

function Funnel({ f }: { f: Report["funnel"] }) {
  const steps = [
    { label: "Berkunjung", value: f.sessions },
    { label: "Membuka detail mobil", value: f.viewed },
    { label: "Menghubungi (WA/telepon)", value: f.contacted },
  ];
  return (
    <ol className="mt-4 grid gap-3">
      {steps.map((s, i) => {
        const w = pct(s.value, f.sessions || 1);
        return (
          <li key={s.label}>
            <div className="flex items-baseline justify-between text-micro">
              <span className="text-steel">
                <span className="font-mono text-[11px]">{i + 1}</span> · {s.label}
              </span>
              <span className="tnum text-platinum">
                <b>{fmt(s.value)}</b>
                {i > 0 && <span className="ml-1.5 text-steel">{pctLabel(w)}</span>}
              </span>
            </div>
            <div className="mt-1.5 h-9 rounded-[10px] bg-panel">
              <div
                className="h-full rounded-[10px]"
                style={{ width: `${Math.max(3, w)}%`, background: i === 2 ? "var(--viz-3)" : i === 1 ? "var(--viz-1)" : "var(--viz-muted)" }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Ubin mobil seperti "Sales by category": ukuran mengikuti peringkat, warna mengikuti jenis mobil. */
function CarTiles({ cars }: { cars: Report["cars"] }) {
  if (cars.length === 0) return <p className="mt-6 text-micro text-steel">Belum ada mobil yang dibuka.</p>;
  const total = cars.reduce((s, c) => s + c.views + c.clicks, 0) || 1;
  const span = ["sm:col-span-2 sm:row-span-2", "sm:row-span-2", "", "", "", "", "", "", "", ""];
  return (
    <div className="mt-5 grid auto-rows-[118px] grid-cols-2 gap-2.5 sm:grid-cols-4">
      {cars.slice(0, 8).map((c, i) => {
        const col = (c.category && CATEGORY_COLOR[c.category]) || { bg: "var(--panel)", ink: "var(--platinum)" };
        const share = ((c.views + c.clicks) / total) * 100;
        return (
          <div key={c.id} className={`dash-tile ${span[i] ?? ""} ${i === 0 ? "col-span-2 row-span-2" : ""}`} style={{ background: col.bg, color: col.ink }}>
            <p className="dash-tile-name flex items-center gap-1.5 truncate">
              <span aria-hidden className="grid size-4 place-items-center rounded-[5px] bg-[rgb(13_14_17/0.85)] text-[9px] text-white">
                {i + 1}
              </span>
              <span className="truncate">{c.name}</span>
            </p>
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className={`dash-num ${i < 2 ? "text-[44px]" : "text-[30px]"}`}>{fmt(c.views)}</p>
                <p className="mt-1 text-[11px] opacity-80">
                  dilihat · {fmt(c.leads)} lead
                </p>
              </div>
              <span className="dash-badge">{share.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Status Pixel / Conversions API + alamat feed katalog untuk iklan remarketing. */
function MetaSetup({ origin }: { origin: string }) {
  const capi = Boolean(process.env.META_CAPI_TOKEN);
  const test = Boolean(process.env.META_TEST_EVENT_CODE);
  return (
    <div className="mt-6 border-t border-hairline pt-5">
      <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-platinum">Remarketing</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <SetupPill on={Boolean(PIXEL_ID)} label={PIXEL_ID ? `Meta Pixel aktif · ${PIXEL_ID}` : "Meta Pixel belum dipasang"} />
        <SetupPill on={capi && Boolean(PIXEL_ID)} label={capi && PIXEL_ID ? "Conversions API aktif" : "Conversions API belum aktif"} />
        {test && <span className="dash-badge bg-[rgb(201_133_0/0.16)] text-platinum">Mode uji Events Manager menyala</span>}
      </div>
      <p className="mt-3 text-[12px] text-steel">
        Event yang dikirim: <span className="text-platinum/85">PageView</span> saat situs dibuka,{" "}
        <span className="text-platinum/85">ViewContent</span> + kode unit di halaman mobil,{" "}
        <span className="text-platinum/85">ViewCategory</span> saat masuk/pilih jenis,{" "}
        <span className="text-platinum/85">Contact</span> saat klik WhatsApp/telepon.
      </p>
      <div className="mt-4">
        <p className="text-micro font-medium text-platinum">Link tujuan iklan</p>
        <p className="mt-0.5 mb-2.5 text-[12px] text-steel">
          Iklan per jenis: pakai link di bawah (stok langsung tersaring). Iklan satu mobil: salin link mobilnya dari halaman{" "}
          <Link href="/admin/katalog" className="text-platinum underline underline-offset-4">Katalog</Link>. Merek juga bisa:{" "}
          <span className="font-mono text-platinum/85">/?merek=toyota</span>.
        </p>
        <CopyLinks
          links={[
            { label: "Semua stok", url: `${origin}/#stok` },
            ...CATEGORIES.map((g) => ({ label: g, url: `${origin}/?jenis=${g.toLowerCase()}` })),
          ]}
        />
      </div>
      <div className="mt-4">
        <CopyRow
          title="Feed katalog untuk Meta"
          hint={
            <>
              Commerce Manager → Katalog → Sumber data → <em>Feed terjadwal</em>, tempel alamat ini, jadwal tiap jam. Mobil terjual/booking otomatis berhenti diiklankan.
            </>
          }
          value={`${origin}/feed/meta-katalog.csv`}
          button="Salin alamat"
        />
      </div>
    </div>
  );
}

function SetupPill({ on, label }: { on: boolean; label: string }) {
  return (
    <span className="dash-badge inline-flex items-center gap-1.5 text-platinum">
      <span aria-hidden className="text-[11px]" style={{ color: on ? "var(--good)" : "var(--viz-muted)" }}>
        {on ? "●" : "○"}
      </span>
      {label}
    </span>
  );
}
