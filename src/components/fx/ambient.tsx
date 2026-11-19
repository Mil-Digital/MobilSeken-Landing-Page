"use client";

import { useEffect, useRef } from "react";
import { finePointer, lerp, reducedMotion, settleLoop } from "@/lib/fx";

/**
 * Lampu studio yang mengikuti kursor (desktop saja) + tombol "magnetik".
 * Elemen dengan [data-magnetic] tertarik sedikit ke arah kursor saat didekati.
 * Di HP, in-app browser, dan gerak dikurangi: tidak dirender sama sekali.
 */
export function Ambient() {
  const spot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!finePointer() || reducedMotion()) return;
    const el = spot.current;
    if (!el) return;

    let tx = innerWidth / 2;
    let ty = innerHeight / 3;
    let x = tx;
    let y = ty;
    let shown = false;

    const loop = settleLoop(() => {
      x = lerp(x, tx, 0.14);
      y = lerp(y, ty, 0.14);
      el.style.transform = `translate3d(${x - 300}px, ${y - 300}px, 0)`;
      return Math.abs(tx - x) + Math.abs(ty - y) > 0.4;
    });

    // Magnetik: cari tombol terdekat yang ditandai, geser maksimal ~6px.
    let mag: HTMLElement | null = null;
    const release = () => {
      if (!mag) return;
      mag.style.translate = "";
      mag = null;
    };

    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      tx = e.clientX;
      ty = e.clientY;
      if (!shown) {
        shown = true;
        el.dataset.on = "";
      }
      loop.kick();

      const t = (e.target as Element | null)?.closest?.<HTMLElement>("[data-magnetic]") ?? null;
      if (t !== mag) release();
      if (t) {
        mag = t;
        const r = t.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        t.style.translate = `${dx * 6}px ${dy * 4}px`;
      }
    };
    const leave = () => {
      shown = false;
      delete el.dataset.on;
      release();
    };

    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      loop.stop();
      release();
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, []);

  return <div ref={spot} aria-hidden className="cursor-light" />;
}
