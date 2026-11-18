"use client";

import { useAnimate } from "motion/react";
import { useEffect, useState } from "react";
import { Emblem } from "@/components/emblem";
import { getIntroState, heroReady, setIntroState } from "@/lib/intro";

const MIN_MS = 950; // koin selesai berputar
const MAX_MS = 1500; // setelah ini konten tampil apa pun kondisinya

/**
 * Loader kunjungan pertama: emblem berputar seperti koin lalu terbang ke posisi logo di header,
 * sementara foto hero terbuka dengan light sweep. Dirender server agar menutupi paint pertama.
 */
export function Intro() {
  const [scope, animate] = useAnimate();
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (getIntroState() === "skip") {
      setGone(true);
      return;
    }
    let cancelled = false;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elapsed = () => performance.now();
    const fonts = document.fonts?.ready ?? Promise.resolve();
    const ready = Promise.all([heroReady, fonts]);
    const cap = new Promise((r) => setTimeout(r, Math.max(0, MAX_MS - elapsed())));

    Promise.race([ready, cap]).then(async () => {
      const wait = Math.max(0, MIN_MS - elapsed());
      if (wait) await new Promise((r) => setTimeout(r, wait));
      if (cancelled || !scope.current) return;

      const mark = scope.current.querySelector("[data-intro-mark]") as HTMLElement;
      const target = document.querySelector("[data-brand-mark]") as HTMLElement | null;
      setIntroState("reveal");

      const bg = scope.current.querySelector("[data-intro-bg]") as HTMLElement;
      const fade = animate(bg, { opacity: 0 }, { duration: reduced ? 0.25 : 0.55, delay: reduced ? 0 : 0.18, ease: [0.4, 0, 0.2, 1] });
      if (target && !reduced) {
        const a = mark.getBoundingClientRect();
        const b = target.getBoundingClientRect();
        const dx = b.left + b.width / 2 - (a.left + a.width / 2);
        const dy = b.top + b.height / 2 - (a.top + a.height / 2);
        await animate(
          mark,
          { x: dx, y: dy, scale: b.width / a.width },
          { type: "spring", stiffness: 170, damping: 24, mass: 0.9 },
        );
      } else {
        await fade;
      }
      await fade;
      setIntroState("done");
      setGone(true);
    });
    return () => {
      cancelled = true;
    };
  }, [animate, scope]);

  if (gone) return null;

  return (
    <div ref={scope} className="intro" aria-hidden>
      <div data-intro-bg className="absolute inset-0 bg-night" />
      <div data-intro-mark className="intro-mark w-[132px] text-platinum will-change-transform">
        <div className="coin">
          <div className="coin-once relative">
            <Emblem className="block h-auto w-full" />
            <span className="emblem-gloss" />
          </div>
        </div>
      </div>
    </div>
  );
}
