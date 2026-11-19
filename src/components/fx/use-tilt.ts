"use client";

import { useEffect, type RefObject } from "react";
import { clamp, finePointer, lerp, reducedMotion, settleLoop } from "@/lib/fx";

/**
 * Kartu miring 3D mengikuti kursor + kilau (glare) yang mengikuti posisi kursor.
 * Menulis --rx/--ry (derajat), --gx/--gy (posisi kilau, %) dan --go (opasitas kilau) ke elemen.
 * Hanya untuk mouse/trackpad; di layar sentuh kartu tetap datar supaya scroll tidak terganggu.
 */
export function useTilt(ref: RefObject<HTMLElement | null>, max = 7) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !finePointer() || reducedMotion()) return;

    const t = { rx: 0, ry: 0, gx: 50, gy: 30, go: 0 };
    const v = { ...t };
    const loop = settleLoop(() => {
      let moving = false;
      for (const k of Object.keys(t) as (keyof typeof t)[]) {
        v[k] = lerp(v[k], t[k], 0.12);
        if (Math.abs(t[k] - v[k]) > 0.01) moving = true;
      }
      el.style.setProperty("--rx", `${v.rx.toFixed(3)}deg`);
      el.style.setProperty("--ry", `${v.ry.toFixed(3)}deg`);
      el.style.setProperty("--gx", `${v.gx.toFixed(2)}%`);
      el.style.setProperty("--gy", `${v.gy.toFixed(2)}%`);
      el.style.setProperty("--go", v.go.toFixed(3));
      return moving;
    });

    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      const px = clamp((e.clientX - r.left) / r.width, 0, 1);
      const py = clamp((e.clientY - r.top) / r.height, 0, 1);
      t.ry = (px - 0.5) * 2 * max;
      t.rx = -(py - 0.5) * 2 * max * 0.75;
      t.gx = px * 100;
      t.gy = py * 100;
      t.go = 1;
      loop.kick();
    };
    const leave = () => {
      Object.assign(t, { rx: 0, ry: 0, go: 0 });
      loop.kick();
    };
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", leave);
    return () => {
      loop.stop();
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [ref, max]);
}
