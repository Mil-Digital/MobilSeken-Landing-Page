"use client";

import { useEffect, useRef } from "react";
import { track as trackEvent } from "@/lib/track";

export const BRAND_EVENT = "ms-brand";

/**
 * Pita merek berjalan di antara hero dan stok. Kecepatannya mengikuti kecepatan scroll
 * (dan berbalik arah saat scroll ke atas), lalu kembali tenang. Ketuk merek = filter stok.
 */
export function BrandMarquee({ brands }: { brands: { name: string; count: number }[] }) {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const anim = el.animate([{ transform: "translateX(0)" }, { transform: "translateX(-50%)" }], {
      duration: 9000 + Math.max(8, brands.length) * 3500,
      iterations: Infinity,
    });

    // Loop rAF hanya hidup selama halaman discroll; begitu laju kembali normal, loop berhenti
    // (animasi pita sendiri berjalan di compositor, tidak membebani thread utama).
    let raf = 0;
    let lastY = window.scrollY;
    let lastT = 0;
    let rate = 1;
    let visible = false;

    const loop = (t: number) => {
      const y = window.scrollY;
      const dt = lastT ? Math.max(1, t - lastT) : 16;
      const v = (y - lastY) / dt; // px per ms
      lastY = y;
      lastT = t;
      const dir = v < -0.05 ? -1 : 1;
      const target = dir * (1 + Math.min(6, Math.abs(v) * 4));
      rate += (target - rate) * 0.08;
      if (Math.abs(rate - 1) < 0.01 && Math.abs(v) < 0.01) {
        rate = 1;
        anim.playbackRate = 1;
        raf = 0;
        return;
      }
      anim.playbackRate = rate;
      raf = requestAnimationFrame(loop);
    };
    const kick = () => {
      if (!visible || raf) return;
      lastT = 0;
      raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) {
        anim.play();
        lastY = window.scrollY;
      } else {
        anim.pause();
        cancelAnimationFrame(raf);
        raf = 0;
      }
    });
    io.observe(el);
    window.addEventListener("scroll", kick, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", kick);
      cancelAnimationFrame(raf);
      anim.cancel();
    };
  }, [brands.length]);

  const pick = (name: string) => {
    trackEvent("brand", { label: name });
    window.dispatchEvent(new CustomEvent(BRAND_EVENT, { detail: name }));
    const target = document.getElementById("stok");
    target?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  // Dua salinan supaya putaran mulus; salinan kedua disembunyikan dari pembaca layar.
  // Dengan sedikit merek, daftar diulang supaya satu putaran tetap lebih lebar dari layar terlebar.
  const reps = Math.max(1, Math.ceil(8 / Math.max(1, brands.length)));
  const items = Array.from({ length: reps }, () => brands).flat();
  const row = (copy: number) =>
    items.map((b, i) => (
      <li key={`${copy}-${i}`} className="flex shrink-0 items-center" aria-hidden={copy || i >= brands.length ? true : undefined}>
        <button
          type="button"
          tabIndex={copy || i >= brands.length ? -1 : undefined}
          onClick={() => pick(b.name)}
          className={`marquee-word wide px-5 text-[44px] leading-none md:text-[72px] ${
            i % 2 ? "marquee-outline" : "text-platinum"
          }`}
        >
          {b.name}
        </button>
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-xenon/70" />
      </li>
    ));

  return (
    <nav aria-label="Merek di showroom" className="ink marquee-band border-t border-hairline py-6 md:py-9">
      <div className="marquee overflow-hidden">
        <div ref={track} className="flex w-max will-change-transform">
          <ul className="flex">{row(0)}</ul>
          <ul className="flex">{row(1)}</ul>
        </div>
      </div>
    </nav>
  );
}
