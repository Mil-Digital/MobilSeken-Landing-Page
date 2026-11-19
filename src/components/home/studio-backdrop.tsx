"use client";

import { useEffect, useRef } from "react";
import { onIntroReveal } from "@/lib/intro";
import { reducedMotion } from "@/lib/fx";

/**
 * Studio di belakang panggung hero, tiga lapis:
 * 1. Lampu panjang (light bar) di atas panggung dengan kerucut cahaya tipis ke bawah.
 * 2. Lantai studio: grid perspektif yang perlahan bergerak ke arah penonton.
 * 3. Debu halus yang melayang di dalam berkas cahaya (canvas kecil, hanya saat hero terlihat).
 * Semua murni dekorasi: aria-hidden, tanpa pointer events, mati saat gerak dikurangi.
 */
export function StudioBackdrop() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv || reducedMotion()) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, devicePixelRatio || 1);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // Partikel lahir di bawah, naik pelan, berkedip seperti debu tertimpa cahaya.
    const N = w < 640 ? 26 : 46;
    const spawn = (anyY: boolean) => {
      const spread = 0.34 + Math.random() * 0.12;
      return {
        x: w * (0.5 + (Math.random() - 0.5) * 2 * spread),
        y: anyY ? Math.random() * h : h + 10,
        r: 0.5 + Math.random() * 1.4,
        vy: 0.08 + Math.random() * 0.22,
        vx: (Math.random() - 0.5) * 0.08,
        ph: Math.random() * Math.PI * 2,
      };
    };
    const ps = Array.from({ length: N }, () => spawn(true));

    let raf = 0;
    let running = false;
    let revealed = false;
    let visible = true;

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        p.y -= p.vy;
        p.x += p.vx + Math.sin(t / 1800 + p.ph) * 0.06;
        if (p.y < -10) Object.assign(p, spawn(false));
        // Paling terang di tengah kerucut cahaya, memudar ke tepi dan ke atas.
        const cx = Math.abs(p.x / w - 0.5) * 2;
        const a = (1 - cx) * (0.25 + 0.75 * (p.y / h)) * (0.55 + 0.45 * Math.sin(t / 700 + p.ph));
        if (a <= 0.02) continue;
        ctx.beginPath();
        ctx.fillStyle = `rgba(200,230,255,${(a * 0.55).toFixed(3)})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
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

    // Mulai setelah loader membuka hero supaya tidak berebut dengan LCP.
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
      <div className="studio-cone" />
      <div className="studio-bar">
        <span className="studio-bar-glint" />
      </div>
      <div className="studio-floor">
        <div className="studio-floor-plane" />
      </div>
      <canvas ref={canvas} className="studio-dust absolute inset-0 h-full w-full" />
    </div>
  );
}

/** Lampu panjang di atas panggung dengan kerucut cahaya. Ditaruh di dalam area panggung. */
export function StageLight() {
  return (
    <div aria-hidden className="stage-light">
      <div className="stage-light-cone" />
      <div className="stage-light-bar" />
    </div>
  );
}
