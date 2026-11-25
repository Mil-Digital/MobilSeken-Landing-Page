"use client";

import { useEffect, useRef, type RefObject } from "react";
import { onIntroReveal } from "@/lib/intro";
import { reducedMotion } from "@/lib/fx";

export type BackdropFx = {
  /** Jalan melaju lebih cepat sesaat (dipanggil saat mobil di panggung berganti). */
  boost: () => void;
};

/**
 * Pemandangan di belakang panggung hero: showroom malam yang menghadap jalan.
 * - Garis cakrawala bercahaya setinggi tengah mobil aktif (titik hilang jalan ada di belakang mobil).
 * - Jejak lampu lalu lintas di cakrawala: lampu depan putih-biru ke kanan, lampu belakang merah ke kiri.
 * - Jalan dalam perspektif: tepi jalan + marka putus-putus yang mengalir ke arah penonton,
 *   melonjak cepat saat mobil berganti lalu kembali tenang.
 * - Debu halus di berkas lampu.
 * Semua di SATU canvas 1× pada ±30 fps, tanpa blend mode. Mati (gambar diam) saat gerak dikurangi.
 */
export function StudioBackdrop({
  fxRef,
  anchorRef,
}: {
  fxRef?: RefObject<BackdropFx | null>;
  /** Elemen panggung: titik hilang jalan diletakkan di tengahnya. */
  anchorRef?: RefObject<HTMLElement | null>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    // HP & tablet: latar jalan tidak ditampilkan (hero HP berlatar solid), jadi tidak perlu digambar sama sekali.
    if (!matchMedia("(min-width: 1024px)").matches) return;
    const ctx = cv.getContext("2d", { alpha: true });
    if (!ctx) return;
    const still = reducedMotion();

    let w = 0;
    let h = 0;
    let vpX = 0; // titik hilang
    let hz = 0; // garis cakrawala
    let desk = false;
    let hzGrad: CanvasGradient | null = null;
    let hazeGrad: CanvasGradient | null = null;
    let roadGrad: CanvasGradient | null = null;
    // Lapisan diam (kabut cakrawala + permukaan & tepi jalan) digambar sekali per ukuran, lalu ditempel tiap frame.
    const base = document.createElement("canvas");
    const bctx = base.getContext("2d")!;
    // Warna dari token tema (globals.css), format "r,g,b"
    const C = { horizon: "", haze: "", edge: "", paint: "", road: "", roadA: 0.1, head: "", tail: "", dust: "" };
    const readColors = () => {
      const css = getComputedStyle(document.documentElement);
      const v = (name: string, fallback: string) => (css.getPropertyValue(name).trim() || fallback).split(/[\s,]+/).join(",");
      C.horizon = v("--fx-horizon-rgb", "29 91 255");
      C.haze = v("--fx-haze-rgb", "255 255 255");
      C.edge = v("--fx-edge-rgb", "13 27 46");
      C.paint = v("--fx-paint-rgb", "13 27 46");
      C.road = v("--fx-road-rgb", "13 27 46");
      C.roadA = parseFloat(css.getPropertyValue("--fx-road-a")) || 0.1;
      C.head = v("--fx-head-rgb", "29 91 255");
      C.tail = v("--fx-tail-rgb", "230 57 70");
      C.dust = v("--fx-dust-rgb", "29 91 255");
    };

    const measure = () => {
      readColors();
      w = cv.clientWidth;
      h = cv.clientHeight;
      // Belum terlihat / ukuran nol (mis. disembunyikan): jangan hitung gradien dengan NaN, itu menjatuhkan halaman.
      if (w < 2 || h < 2) return;
      cv.width = Math.round(w);
      cv.height = Math.round(h);
      desk = w >= 1024;
      const cr = cv.getBoundingClientRect();
      const a = anchorRef?.current?.getBoundingClientRect();
      vpX = a && a.width ? a.left + a.width / 2 - cr.left : w / 2;
      hz = a && a.height ? a.top + a.height * 0.5 - cr.top : h * 0.55;
      const H = C.horizon;
      const mid = Math.min(0.95, Math.max(0.05, vpX / w));
      hzGrad = ctx.createLinearGradient(0, 0, w, 0);
      hzGrad.addColorStop(0, `rgba(${H},0)`);
      // Desktop: garis cakrawala tidak melintas di belakang kolom teks kiri.
      if (desk) hzGrad.addColorStop(0.44, `rgba(${H},0)`);
      else hzGrad.addColorStop(Math.max(0.02, mid - 0.38), `rgba(${H},0.12)`);
      hzGrad.addColorStop(mid, `rgba(${H},0.55)`);
      hzGrad.addColorStop(Math.min(0.98, mid + 0.38), `rgba(${H},0.12)`);
      hzGrad.addColorStop(1, `rgba(${H},0)`);
      hazeGrad = ctx.createLinearGradient(0, hz - 70, 0, hz + 70);
      hazeGrad.addColorStop(0, `rgba(${C.haze},0)`);
      hazeGrad.addColorStop(0.5, `rgba(${C.haze},0.55)`);
      hazeGrad.addColorStop(1, `rgba(${C.haze},0)`);
      roadGrad = ctx.createLinearGradient(0, hz, 0, h);
      roadGrad.addColorStop(0, `rgba(${C.road},0)`);
      roadGrad.addColorStop(1, `rgba(${C.road},${C.roadA})`);
      paintBase();
    };

    function paintBase() {
      base.width = cv!.width;
      base.height = cv!.height;
      bctx.clearRect(0, 0, w, h);
      bctx.fillStyle = hazeGrad!;
      bctx.fillRect(0, hz - 70, w, 140);
      const fh = h - hz;
      if (fh <= 0) return;
      const hw = w * (desk ? 0.62 : 1.05);
      const at = (k: number, y: number) => vpX + k * hw * ((y - hz) / fh);
      bctx.fillStyle = roadGrad!;
      bctx.beginPath();
      bctx.moveTo(vpX, hz);
      bctx.lineTo(at(-1, h), h);
      bctx.lineTo(at(1, h), h);
      bctx.closePath();
      bctx.fill();
      for (const k of [-1, 1, -1.18, 1.18]) {
        const g = bctx.createLinearGradient(0, hz, 0, h);
        const edge = Math.abs(k) === 1;
        g.addColorStop(0, `rgba(${C.edge},0)`);
        g.addColorStop(0.35, edge ? `rgba(${C.edge},0.2)` : `rgba(${C.edge},0.08)`);
        g.addColorStop(1, edge ? `rgba(${C.edge},0.08)` : `rgba(${C.edge},0.03)`);
        bctx.strokeStyle = g;
        bctx.lineWidth = edge ? 1.4 : 1;
        bctx.beginPath();
        bctx.moveTo(vpX, hz);
        bctx.lineTo(at(k, h), h);
        bctx.stroke();
      }
    }
    measure();

    // ── Jejak lampu ──
    type Trail = { x: number; y: number; len: number; v: number; dir: 1 | -1; a: number; lw: number };
    const spawnTrail = (anywhere: boolean): Trail => {
      const depth = Math.random(); // 0 = jauh (dekat cakrawala), 1 = lebih dekat
      const dir: 1 | -1 = Math.random() < 0.55 ? 1 : -1;
      const len = 70 + depth * 220;
      return {
        dir,
        len,
        y: hz - 6 - depth * (desk ? 0.17 : 0.12) * h,
        x: anywhere ? Math.random() * w : dir > 0 ? -len - Math.random() * 300 : w + len + Math.random() * 300,
        v: 1.4 + depth * 3.4 + Math.random(),
        a: 0.25 + depth * 0.45,
        lw: 1 + depth * 1.2,
      };
    };
    const trails = Array.from({ length: desk ? 9 : 5 }, () => spawnTrail(true));

    // ── Debu ──
    const dust = Array.from({ length: desk ? 18 : 10 }, () => ({
      x: vpX + (Math.random() - 0.5) * w * 0.6,
      y: Math.random() * h,
      r: 0.6 + Math.random() * 1.2,
      vy: 0.15 + Math.random() * 0.35,
      ph: Math.random() * Math.PI * 2,
    }));

    // ── Jalan ──
    let phase = 0;
    let speed = still ? 0 : 0; // mulai diam, "menyala" saat hero terbuka
    let target = still ? 0 : 0;

    // Hanya marka jalan yang bergerak (desktop); permukaan & tepi jalan ada di lapisan diam.
    const drawRoad = () => {
      if (!desk) return;
      const fh = h - hz;
      if (fh <= 0) return;
      const hw = w * (desk ? 0.62 : 1.05); // setengah lebar jalan di tepi bawah layar
      const at = (k: number, y: number) => vpX + k * hw * ((y - hz) / fh);

      // marka putus-putus: kedalaman z → layar y = hz + fh / z
      // Di HP area jalan ada di belakang teks info & tombol, jadi marka tidak digambar.
      const lanes = desk ? [-0.5, 0.5] : [];
      const laneAlpha = 0.16;
      const DASH = 0.55; // panjang strip dalam satuan kedalaman
      const GAP = 1.1;
      ctx.lineCap = "round";
      for (let i = 0; i < 22; i++) {
        const z0 = 1 + (i - phase) * (DASH + GAP) * 0.42;
        if (z0 < 0.35) continue;
        const z1 = z0 + DASH * 0.42;
        const y0 = hz + fh / z0;
        const y1 = hz + fh / z1;
        if (y1 > h + 40) continue;
        const depth = Math.min(1, (y0 - hz) / fh);
        if (depth < 0.02) continue;
        ctx.globalAlpha = Math.min(1, depth * 1.6) * laneAlpha;
        ctx.strokeStyle = `rgb(${C.paint})`;
        ctx.lineWidth = 0.6 + depth * (desk ? 5 : 4);
        for (const k of lanes) {
          ctx.beginPath();
          ctx.moveTo(at(k, y1), y1);
          ctx.lineTo(at(k, y0), y0);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };

    const drawHorizon = (t: number) => {
      if (!hzGrad || base.width === 0 || base.height === 0) return;
      ctx.globalAlpha = 1;
      ctx.drawImage(base, 0, 0);
      ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t / 1400);
      ctx.fillStyle = hzGrad!;
      ctx.fillRect(0, Math.round(hz), w, 1);
      ctx.globalAlpha = 1;
    };

    const drawTrails = (dt: number) => {
      for (const tr of trails) {
        tr.x += tr.v * tr.dir * dt;
        if ((tr.dir > 0 && tr.x - tr.len > w + 40) || (tr.dir < 0 && tr.x + tr.len < -40)) Object.assign(tr, spawnTrail(false));
        const head = tr.x;
        const tail = tr.x - tr.len * tr.dir;
        // Di desktop, redupkan di belakang kolom teks kiri.
        const fade = desk ? Math.min(1, Math.max(0, (head / w - 0.46) / 0.14)) : 1;
        const g = ctx.createLinearGradient(tail, 0, head, 0);
        const c = tr.dir > 0 ? C.head : C.tail;
        g.addColorStop(0, `rgba(${c},0)`);
        g.addColorStop(1, `rgba(${c},${(tr.a * fade).toFixed(3)})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = tr.lw;
        ctx.beginPath();
        ctx.moveTo(tail, tr.y);
        ctx.lineTo(head, tr.y);
        ctx.stroke();
        // titik lampu di kepala jejak
        ctx.globalAlpha = tr.a * fade;
        ctx.fillStyle = `rgb(${c})`;
        ctx.fillRect(head - tr.lw, tr.y - tr.lw, tr.lw * 2, tr.lw * 2);
        ctx.globalAlpha = 1;
      }
    };

    const drawDust = (t: number, dt: number) => {
      ctx.fillStyle = `rgb(${C.dust})`;
      for (const p of dust) {
        p.y -= p.vy * dt;
        p.x += Math.sin(t / 1800 + p.ph) * 0.1 * dt;
        if (p.y < -10) {
          p.y = h + 10;
          p.x = vpX + (Math.random() - 0.5) * w * 0.6;
        }
        const cx = Math.abs((p.x - vpX) / (w * 0.35));
        const a = Math.max(0, 1 - cx) * (0.55 + 0.45 * Math.sin(t / 700 + p.ph)) * 0.3;
        if (a <= 0.03) continue;
        ctx.globalAlpha = a;
        ctx.fillRect(p.x, p.y, p.r * 1.6, p.r * 1.6);
      }
      ctx.globalAlpha = 1;
    };

    const frameMs = desk ? 32 : 41;
    let raf = 0;
    let last = 0;
    let running = false;
    let revealed = false;
    let visible = true;

    const frame = (t: number, dt: number) => {
      speed += (target - speed) * 0.05 * dt;
      phase = (phase + speed * 0.016 * dt) % 1;
      ctx.clearRect(0, 0, w, h);
      drawHorizon(t);
      drawTrails(dt);
      drawRoad();
      drawDust(t, dt);
      // lonjakan meluruh kembali ke laju jelajah
      if (target > 1) target += (1 - target) * 0.06 * dt;
    };

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < frameMs) return; // ±30 fps (desktop) / ±24 fps (HP)
      const dt = last ? Math.min(3, (t - last) / 33.3) : 1;
      last = t;
      frame(t, dt);
    };

    const sync = () => {
      const should = !still && revealed && visible && !document.hidden;
      if (should && !running) {
        running = true;
        last = 0;
        raf = requestAnimationFrame(loop);
      } else if (!should && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };

    if (fxRef) {
      fxRef.current = {
        boost: () => {
          if (!still) target = 7;
        },
      };
    }

    const off = onIntroReveal(() => {
      revealed = true;
      // Panggung baru selesai bergeser masuk setelah ±1,4 dtk; ukur ulang titik hilangnya.
      window.setTimeout(measure, 1500);
      target = 1;
      sync();
    });
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      sync();
    });
    io.observe(cv);
    const ro = new ResizeObserver(() => {
      measure();
      if (still) frame(0, 1);
    });
    ro.observe(cv);
    document.addEventListener("visibilitychange", sync);
    if (still) frame(0, 1);
    return () => {
      off();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", sync);
      cancelAnimationFrame(raf);
      if (fxRef) fxRef.current = null;
    };
  }, [anchorRef, fxRef]);

  return (
    <div aria-hidden className="studio pointer-events-none absolute inset-0 overflow-hidden">
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
    </div>
  );
}

/** Lampu panjang di atas panggung dengan kerucut cahaya. Ikut bergeser sedikit mengikuti kursor. */
export function StageLight({ lightRef }: { lightRef?: RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={lightRef} aria-hidden className="stage-light">
      <div className="stage-light-cone" />
      <div className="stage-light-bar" />
    </div>
  );
}
