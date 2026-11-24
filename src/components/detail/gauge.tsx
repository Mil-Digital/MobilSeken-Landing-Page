"use client";

import { useEffect, useRef } from "react";
import { reducedMotion } from "@/lib/fx";

// Geometri: busur 270° (seperti speedometer), 0 di kiri bawah, maksimum di kanan bawah.
const CX = 100;
const CY = 100;
const R = 78;
const START = 135; // derajat, arah jarum jam dari sumbu x+
const SWEEP = 270;

const polar = (deg: number, r = R) => {
  const a = (deg * Math.PI) / 180;
  // Dibulatkan supaya hasil server dan browser identik (hindari hydration mismatch).
  const round = (n: number) => Math.round(n * 100) / 100;
  return [round(CX + r * Math.cos(a)), round(CY + r * Math.sin(a))] as const;
};

function arcPath(from: number, to: number, r = R) {
  const [x1, y1] = polar(from, r);
  const [x2, y2] = polar(to, r);
  const large = to - from > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

const ARC_LEN = Math.round((Math.PI * 2 * R * SWEEP) / 3.6) / 100;

/**
 * Panel instrumen: jarak tempuh sebagai speedometer.
 * Saat pertama terlihat, jarum melakukan "sapuan start-up" seperti dashboard mobil
 * (naik ke maksimum lalu turun ke nilainya). Gerak dikurangi: langsung di nilai.
 */
export function KmGauge({ km, label }: { km: number; label: string }) {
  // Skala bulat: 200rb untuk mobil normal, naik per 100rb untuk km tinggi.
  const max = Math.max(200_000, Math.ceil(km / 100_000) * 100_000);
  const ratio = Math.min(1, km / max);
  const root = useRef<HTMLDivElement>(null);
  const needle = useRef<SVGGElement>(null);
  const fill = useRef<SVGPathElement>(null);

  useEffect(() => {
    const el = root.current;
    const n = needle.current;
    const f = fill.current;
    if (!el || !n || !f) return;
    const final = START + SWEEP * ratio;
    const settle = () => {
      n.style.transform = `rotate(${final}deg)`;
      f.style.strokeDashoffset = String(ARC_LEN * (1 - ratio));
    };
    if (reducedMotion()) {
      settle();
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const timing = { duration: 1900, easing: "cubic-bezier(.45,0,.2,1)", fill: "forwards" as const, delay: 250 };
        n.animate(
          [
            { transform: `rotate(${START}deg)` },
            { transform: `rotate(${START + SWEEP}deg)`, offset: 0.42 },
            { transform: `rotate(${final}deg)` },
          ],
          timing,
        );
        f.animate(
          [
            { strokeDashoffset: ARC_LEN },
            { strokeDashoffset: 0, offset: 0.42 },
            { strokeDashoffset: ARC_LEN * (1 - ratio) },
          ],
          timing,
        ).onfinish = settle;
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ratio]);

  const ticks = Array.from({ length: 41 }, (_, i) => i);
  const labels = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div ref={root} className="gauge relative mx-auto w-full max-w-[240px]">
      <svg viewBox="0 0 200 200" className="block w-full overflow-visible" aria-hidden>
        <defs>
          <linearGradient id="gauge-fill" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" style={{ stopColor: "rgb(var(--xenon-rgb) / 0.45)" }} />
            <stop offset="1" style={{ stopColor: "var(--xenon)" }} />
          </linearGradient>
          <filter id="gauge-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Lintasan */}
        <path d={arcPath(START, START + SWEEP)} fill="none" style={{ stroke: "rgb(var(--platinum-rgb) / 0.1)" }} strokeWidth="7" strokeLinecap="round" />
        {/* Isi dengan pendar xenon */}
        <path
          ref={fill}
          d={arcPath(START, START + SWEEP)}
          fill="none"
          stroke="url(#gauge-fill)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={ARC_LEN}
          strokeDashoffset={ARC_LEN}
          style={{ filter: "drop-shadow(0 0 5px rgb(var(--xenon-rgb) / 0.35))" }}
        />

        {/* Garis skala */}
        {ticks.map((i) => {
          const major = i % 10 === 0;
          const deg = START + (SWEEP * i) / 40;
          const [x1, y1] = polar(deg, R - 11);
          const [x2, y2] = polar(deg, R - (major ? 20 : 15));
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              style={{ stroke: major ? "rgb(var(--platinum-rgb) / 0.7)" : "rgb(var(--platinum-rgb) / 0.25)" }}
              strokeWidth={major ? 1.6 : 1}
              strokeLinecap="round"
            />
          );
        })}
        {labels.map((t) => {
          const [x, y] = polar(START + SWEEP * t, R - 31);
          return (
            <text
              key={t}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="9.5"
              style={{ fontVariantNumeric: "tabular-nums", fill: "var(--steel)" }}
            >
              {Math.round((max * t) / 1000)}
            </text>
          );
        })}

        {/* Jarum */}
        <g ref={needle} style={{ transform: `rotate(${START}deg)`, transformOrigin: `${CX}px ${CY}px` }}>
          <line x1={CX - 10} y1={CY} x2={CX + R - 14} y2={CY} stroke="var(--xenon)" strokeWidth="2.4" strokeLinecap="round" />
          <line
            x1={CX + R - 40}
            y1={CY}
            x2={CX + R - 14}
            y2={CY}
            stroke="#fff"
            strokeWidth="2.4"
            strokeLinecap="round"
            filter="url(#gauge-glow)"
            opacity="0.8"
          />
        </g>
        <circle cx={CX} cy={CY} r="7" strokeWidth="1.5" style={{ fill: "var(--cabin)", stroke: "rgb(var(--platinum-rgb) / 0.35)" }} />
        <circle cx={CX} cy={CY} r="2.5" fill="var(--xenon)" />
      </svg>

      {/* Bacaan digital di bawah poros */}
      <div className="absolute inset-x-0 bottom-0 text-center">
        <p className="tnum text-lead leading-none font-semibold text-platinum">{label}</p>
        <p className="mt-1 text-micro text-steel">Jarak tempuh</p>
      </div>
    </div>
  );
}
