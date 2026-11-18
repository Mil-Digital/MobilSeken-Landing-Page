"use client";

import { useEffect, useState } from "react";
import { IconWhatsApp } from "@/components/icons";
import { waLink } from "@/lib/site";

/**
 * Tombol WhatsApp mengambang: muncul setelah hero lewat (tombol WA hero tidak terlihat lagi),
 * menghilang saat bagian showroom terlihat (di sana sudah ada tombol WA besar).
 */
export function FloatingWa() {
  const [pastHero, setPastHero] = useState(false);
  const [nearShowroom, setNearShowroom] = useState(false);

  useEffect(() => {
    const sentinel = document.querySelector("[data-header-sentinel]");
    const showroom = document.getElementById("showroom");
    const ios: IntersectionObserver[] = [];
    if (sentinel) {
      const io = new IntersectionObserver(([e]) => setPastHero(!e.isIntersecting && e.boundingClientRect.top < 0));
      io.observe(sentinel);
      ios.push(io);
    }
    if (showroom) {
      const io = new IntersectionObserver(([e]) => setNearShowroom(e.isIntersecting), { rootMargin: "0px 0px -30% 0px" });
      io.observe(showroom);
      ios.push(io);
    }
    return () => ios.forEach((io) => io.disconnect());
  }, []);

  const show = pastHero && !nearShowroom;

  return (
    <a
      href={waLink("Halo MS Garage, saya ingin tanya stok mobil.")}
      aria-hidden={!show}
      tabIndex={show ? undefined : -1}
      data-show={show ? "" : undefined}
      className="floating-wa press fixed right-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-30 inline-flex h-[52px] items-center gap-2.5 rounded-full border border-hairline bg-cabin/85 pr-5 pl-4 text-body font-semibold text-platinum shadow-[0_12px_32px_-12px_rgb(0_0_0/0.7)] backdrop-blur-xl"
    >
      <span className="grid size-8 place-items-center rounded-full bg-xenon text-xenon-ink">
        <IconWhatsApp width={18} height={18} />
      </span>
      Tanya stok
    </a>
  );
}
