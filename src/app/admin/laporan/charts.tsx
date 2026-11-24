"use client";

import { useMemo, useState } from "react";

// Grafik ringan tanpa pustaka. Garis/area digambar di SVG yang meregang (non-scaling stroke),
// sedangkan label, titik, dan tooltip di HTML supaya teks tidak ikut terdistorsi.

export type Series = { key: string; label: string; color: string; values: number[] };

const fmt = (v: number) => v.toLocaleString("id-ID");
const dayLabel = (d: string, long = false) =>
  new Date(d + "T00:00:00").toLocaleDateString("id-ID", long ? { weekday: "short", day: "numeric", month: "short" } : { day: "numeric", month: "short" });

/** Kurva monoton (tidak "melampaui" data) melewati titik-titik. */
function monotonePath(pts: [number, number][]) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : "";
  const n = pts.length;
  const dx = (i: number) => pts[i + 1][0] - pts[i][0];
  const slope = (i: number) => (pts[i + 1][1] - pts[i][1]) / dx(i);
  const m: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i === 0) m.push(slope(0));
    else if (i === n - 1) m.push(slope(n - 2));
    else {
      const a = slope(i - 1);
      const b = slope(i);
      m.push(a * b <= 0 ? 0 : (2 * a * b) / (a + b));
    }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx(i) / 3;
    d += `C${pts[i][0] + h},${pts[i][1] + m[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - m[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

function niceMax(v: number) {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const f = v / p;
  return (f <= 2 ? 2 : f <= 4 ? 4 : f <= 5 ? 5 : 10) * p;
}

/** Grafik garis harian dengan garis bantu & tooltip saat disentuh/diarahkan. */
export function LineChart({
  days,
  series,
  height = 200,
  area = false,
  unit = "",
}: {
  days: string[];
  series: Series[];
  height?: number;
  area?: boolean;
  unit?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 1000;
  const H = 100;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const ticks = [max, max * 0.75, max / 2, max / 4];
  const x = (i: number) => (days.length <= 1 ? W / 2 : (i / (days.length - 1)) * W);
  const y = (v: number) => H - (v / max) * H;
  const paths = useMemo(
    () => series.map((s) => monotonePath(s.values.map((v, i) => [x(i), y(v)] as [number, number]))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, max, days.length],
  );
  const pct = (i: number) => (days.length <= 1 ? 50 : (i / (days.length - 1)) * 100);
  const last = days.length - 1;
  const at = hover ?? null;

  const pick = (clientX: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const i = Math.round(((clientX - r.left) / r.width) * last);
    setHover(Math.max(0, Math.min(last, i)));
  };

  return (
    <div className="flex gap-3">
      <div className="relative min-w-0 flex-1" style={{ height }}>
        {/* garis kisi */}
        {ticks.map((t) => (
          <span key={t} className="absolute inset-x-0 border-t border-dashed border-hairline" style={{ top: `${(1 - t / max) * 100}%` }} />
        ))}
        <span className="absolute inset-x-0 bottom-0 border-t border-hairline" />
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          {area && series[0] && (
            <>
              <defs>
                <linearGradient id={`fill-${series[0].key}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor={series[0].color} stopOpacity="0.28" />
                  <stop offset="1" stopColor={series[0].color} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`${paths[0]}L${x(last)},${H}L${x(0)},${H}Z`} fill={`url(#fill-${series[0].key})`} />
            </>
          )}
          {series.map((s, k) => (
            <path key={s.key} d={paths[k]} fill="none" stroke={s.color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
          ))}
        </svg>
        {/* titik terakhir */}
        {at === null &&
          series.map((s) => (
            <span
              key={s.key}
              className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[var(--cabin)]"
              style={{ left: `${pct(last)}%`, top: `${(y(s.values[last] ?? 0) / H) * 100}%`, background: s.color }}
            />
          ))}
        {at !== null && (
          <>
            <span className="pointer-events-none absolute inset-y-0 w-px bg-platinum/25" style={{ left: `${pct(at)}%` }} />
            {series.map((s) => (
              <span
                key={s.key}
                className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[var(--cabin)]"
                style={{ left: `${pct(at)}%`, top: `${(y(s.values[at] ?? 0) / H) * 100}%`, background: s.color }}
              />
            ))}
            <div
              className="pointer-events-none absolute top-1 z-10 min-w-[150px] rounded-[12px] border border-hairline bg-panel px-3 py-2 text-micro shadow-[0_12px_30px_-12px_rgb(0_0_0/0.7)]"
              style={pct(at) > 60 ? { right: `${100 - pct(at) + 2}%` } : { left: `${pct(at) + 2}%` }}
            >
              <p className="text-steel">{dayLabel(days[at], true)}</p>
              {series.map((s) => (
                <p key={s.key} className="mt-1 flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-steel">
                    <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="tnum font-semibold text-platinum">
                    {fmt(s.values[at] ?? 0)}
                    {unit}
                  </span>
                </p>
              ))}
            </div>
          </>
        )}
        <div
          className="absolute inset-0 cursor-crosshair touch-pan-y"
          onPointerMove={(e) => pick(e.clientX, e.currentTarget)}
          onPointerDown={(e) => pick(e.clientX, e.currentTarget)}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label={series.map((s) => `${s.label}: total ${fmt(s.values.reduce((a, b) => a + b, 0))}`).join("; ")}
        />
        {/* tanggal di bawah */}
        <div className="pointer-events-none absolute inset-x-0 -bottom-6 flex justify-between font-mono text-[10.5px] text-steel">
          <span>{days[0] ? dayLabel(days[0]) : ""}</span>
          {days.length > 2 && <span>{dayLabel(days[Math.floor(last / 2)])}</span>}
          <span>{days[last] ? dayLabel(days[last]) : ""}</span>
        </div>
      </div>
      {/* skala di kanan, seperti referensi */}
      <div className="relative w-9 shrink-0 font-mono text-[10.5px] text-steel" style={{ height }}>
        {ticks.map((t) => (
          <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - t / max) * 100}%` }}>
            {t >= 1000 ? `${(t / 1000).toFixed(t % 1000 ? 1 : 0)}rb` : t}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Jam ramai: grafik radial 24 jam. Arahkan/ketuk sektor untuk melihat angkanya. */
export function RadialHours({ hours, color }: { hours: { hour: number; sessions: number; leads: number }[]; color: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const S = 320;
  const c = S / 2;
  const R = 118;
  const r0 = 34;
  const max = Math.max(1, ...hours.map((h) => h.sessions));
  const ang = (h: number) => (h / 24) * Math.PI * 2 - Math.PI / 2;
  const pt = (h: number, v: number): [number, number] => {
    const rr = r0 + (v / max) * (R - r0);
    return [c + Math.cos(ang(h)) * rr, c + Math.sin(ang(h)) * rr];
  };
  // kurva tertutup halus (Catmull-Rom → Bézier)
  const P = hours.map((h) => pt(h.hour, h.sessions));
  let d = "";
  for (let i = 0; i < P.length; i++) {
    const p0 = P[(i - 1 + P.length) % P.length];
    const p1 = P[i];
    const p2 = P[(i + 1) % P.length];
    const p3 = P[(i + 2) % P.length];
    if (i === 0) d += `M${p1[0]},${p1[1]}`;
    d += `C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  const peak = hours.reduce((a, b) => (b.sessions > a.sessions ? b : a), hours[0]);
  const shown = hover !== null ? hours[hover] : peak;
  const wedge = (h: number) => {
    const a0 = ang(h - 0.5);
    const a1 = ang(h + 0.5);
    return `M${c},${c}L${c + Math.cos(a0) * (R + 26)},${c + Math.sin(a0) * (R + 26)}A${R + 26},${R + 26} 0 0 1 ${c + Math.cos(a1) * (R + 26)},${c + Math.sin(a1) * (R + 26)}Z`;
  };

  return (
    <div className="relative mx-auto w-full max-w-[380px]">
      <svg viewBox={`0 0 ${S} ${S}`} className="w-full" role="img" aria-label={`Jam paling ramai pukul ${String(peak.hour).padStart(2, "0")}.00`}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <circle key={f} cx={c} cy={c} r={r0 + f * (R - r0)} fill="none" stroke="rgb(255 255 255 / 0.07)" />
        ))}
        {hours.map((h) => {
          const [x2, y2] = [c + Math.cos(ang(h.hour)) * R, c + Math.sin(ang(h.hour)) * R];
          return <line key={h.hour} x1={c} y1={c} x2={x2} y2={y2} stroke="rgb(255 255 255 / 0.05)" />;
        })}
        <path d={d} fill={color} fillOpacity={0.1} stroke={color} strokeWidth={2} strokeLinejoin="round" />
        {hover !== null && (() => {
          const [hx, hy] = pt(hover, hours[hover].sessions);
          return <circle cx={hx} cy={hy} r={5} fill={color} stroke="var(--cabin)" strokeWidth={2} />;
        })()}
        {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => {
          const a = ang(h);
          return (
            <text key={h} x={c + Math.cos(a) * (R + 18)} y={c + Math.sin(a) * (R + 18)} textAnchor="middle" dominantBaseline="central" className="fill-[var(--steel)] font-mono text-[10.5px]">
              {String(h).padStart(2, "0")}
            </text>
          );
        })}
        {hours.map((h) => (
          <path
            key={h.hour}
            d={wedge(h.hour)}
            fill="transparent"
            onPointerEnter={() => setHover(h.hour)}
            onPointerDown={() => setHover(h.hour)}
            onPointerLeave={() => setHover(null)}
          />
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-mono text-[10.5px] text-steel">{hover !== null ? "pukul" : "puncak"}</p>
          <p className="dash-num text-[22px] text-platinum">{String(shown.hour).padStart(2, "0")}.00</p>
          <p className="tnum text-[11px] text-steel">{fmt(shown.sessions)} kunjungan</p>
        </div>
      </div>
    </div>
  );
}
