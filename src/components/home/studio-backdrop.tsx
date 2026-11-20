"use client";

import { useEffect, useRef, type RefObject } from "react";
import { onIntroReveal } from "@/lib/intro";
import { reducedMotion } from "@/lib/fx";

/**
 * Studio di belakang panggung hero:
 * 1. Lantai grid perspektif yang perlahan bergerak ke arah penonton (desktop saja).
 * 2. Debu halus yang melayang dalam berkas cahaya.
 * Keduanya digambar di SATU canvas 1× pada ±30 fps, tanpa blend mode. Lantai dihitung manual
 * (bukan bidang CSS 3D raksasa) karena itu yang paling membebani GPU.
 * Murni dekorasi: aria-hidden, tanpa pointer events, mati saat gerak dikurangi.
 */
export function StudioBackdrop() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv || reducedMotion()) return;
    const ctx = cv.getContext("2d", { alpha: true });
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let floor = false;
    let vGrad: CanvasGradient | null = null;
    let hGrad: CanvasGradient | null = null;
    const resize = () => {
      w = cv.clientWidth;
      h = cv.clientHeight;
      // Resolusi 1× cukup untuk garis tipis & titik buram; jauh lebih ringan di layar retina.
      cv.width = Math.round(w);
      cv.height = Math.round(h);
      floor = w >= 1024;
      // Garis tegak memudar ke cakrawala dan ke bawah; garis datar memudar ke kiri-kanan.
      vGrad = ctx.createLinearGradient(0, h * 0.52, 0, h);
      vGrad.addColorStop(0, "rgba(168,216,255,0)");
      vGrad.addColorStop(0.45, "rgba(168,216,255,0.13)");
      vGrad.addColorStop(1, "rgba(168,216,255,0)");
      hGrad = ctx.createLinearGradient(w * 0.1, 0, w * 0.9, 0);
      hGrad.addColorStop(0, "rgba(168,216,255,0)");
      hGrad.addColorStop(0.5, "rgba(168,216,255,0.2)");
      hGrad.addColorStop(1, "rgba(168,216,255,0)");
    };
    resize();

    const N = w < 640 ? 16 : 30;
    const spawn = (anyY: boolean) => {
      const spread = 0.3 + Math.random() * 0.12;
      return {
        x: w * (0.5 + (Math.random() - 0.5) * 2 * spread),
        y: anyY ? Math.random() * h : h + 10,
        r: 0.6 + Math.random() * 1.3,
        vy: 0.16 + Math.random() * 0.4,
        vx: (Math.random() - 0.5) * 0.14,
        ph: Math.random() * Math.PI * 2,
      };
    };
    const ps = Array.from({ length: N }, () => spawn(true));

    let raf = 0;
    let last = 0;
    let running = false;
    let revealed = false;
    let visible = true;

    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 32) return; // ±30 fps sudah halus untuk debu
      last = t;
      ctx.clearRect(0, 0, w, h);
      if (floor && vGrad && hGrad) drawFloor(t);
      ctx.globalAlpha = 1;
      for (const p of ps) {
        p.y -= p.vy;
        p.x += p.vx + Math.sin(t / 1800 + p.ph) * 0.1;
        if (p.y < -10) Object.assign(p, spawn(false));
        const cx = Math.abs(p.x / w - 0.5) * 2;
        const a = (1 - cx) * (0.25 + 0.75 * (p.y / h)) * (0.55 + 0.45 * Math.sin(t / 700 + p.ph));
        if (a <= 0.03) continue;
        ctx.globalAlpha = Math.min(1, a * 0.6);
        ctx.fillStyle = "#c8e6ff";
        ctx.fillRect(p.x, p.y, p.r * 1.6, p.r * 1.6);
      }
    };

    // Lantai: cakrawala di 52% tinggi hero; garis datar mendekat ke penonton, garis tegak menuju titik hilang.
    const drawFloor = (t: number) => {
      const top = h * 0.52;
      const fh = h - top;
      const cx = w / 2;
      ctx.lineWidth = 1;
      ctx.strokeStyle = vGrad!;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      const spacing = 110;
      for (let i = -14; i <= 14; i++) {
        ctx.moveTo(cx + i * spacing * 0.06, top);
        ctx.lineTo(cx + i * spacing, h);
      }
      ctx.stroke();
      ctx.strokeStyle = hGrad!;
      const phase = (t / 1400) % 1;
      for (let k = 0; k < 12; k++) {
        const z = 1 + (k + 1 - phase) * 0.55; // kedalaman: kecil = dekat
        const y = top + fh / z;
        if (y < top + 2) continue;
        const depth = (y - top) / fh; // 0 = cakrawala, 1 = paling dekat
        ctx.globalAlpha = Math.min(1, depth * 2.2) * (1 - depth * 0.55);
        ctx.beginPath();
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(w, Math.round(y) + 0.5);
        ctx.stroke();
      }
    };

    const sync = () => {
      const should = revealed && visible && !document.hidden;
      if (should && !running) {
        running = true;
        raf = requestAnimationFrame(draw);
      } else if (!should && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };

    const off = onIntroReveal(() => {
      revealed = true;
      sync();
    });
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      sync();
    });
    io.observe(cv);
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    document.addEventListener("visibilitychange", sync);
    return () => {
      off();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", sync);
      cancelAnimationFrame(raf);
    };
  }, []);

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
