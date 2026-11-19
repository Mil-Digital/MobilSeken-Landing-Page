"use client";

// Utilitas kecil untuk efek 3D/gerak. Semua efek dekoratif wajib lewat sini supaya
// konsisten mati saat gerak dikurangi, dan efek berbasis kursor hanya jalan di perangkat ber-mouse.

export const reducedMotion = () =>
  typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Mouse/trackpad presisi (bukan sentuh). */
export const finePointer = () =>
  typeof window !== "undefined" && matchMedia("(hover: hover) and (pointer: fine)").matches;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Loop rAF yang berhenti sendiri ketika nilai sudah diam (hemat baterai).
 * `step` mengembalikan true selama masih bergerak.
 */
export function settleLoop(step: () => boolean) {
  let raf = 0;
  const tick = () => {
    raf = step() ? requestAnimationFrame(tick) : 0;
  };
  return {
    kick() {
      if (!raf) raf = requestAnimationFrame(tick);
    },
    stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}
