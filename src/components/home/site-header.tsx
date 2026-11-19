"use client";

import { useEffect, useState } from "react";
import { Emblem } from "@/components/emblem";
import { IconWhatsApp } from "@/components/icons";
import { waLink } from "@/lib/site";

/** Header: transparan di atas hero, solid dengan blur halus setelah hero lewat. */
export function SiteHeader() {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const sentinel = document.querySelector("[data-header-sentinel]");
    if (!sentinel) return;
    // Solid hanya setelah hero lewat ke atas layar. Dihitung dari posisi sentinel saat scroll
    // (bukan IntersectionObserver) supaya tetap benar setelah lompatan scroll jauh, dan
    // hero setinggi layar di desktop tidak membuat header langsung solid.
    let raf = 0;
    const check = () => {
      raf = 0;
      setSolid(sentinel.getBoundingClientRect().top < 56);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        solid ? "border-b border-hairline bg-night/80 backdrop-blur-xl" : "border-b border-transparent"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top)", viewTransitionName: "site-header" }}
    >
      {/* Garis progres scroll tipis: seperti jarum instrumen */}
      <span aria-hidden className={`scroll-progress absolute inset-x-0 bottom-[-1px] h-px origin-left bg-xenon/80 transition-opacity duration-300 ${solid ? "opacity-100" : "opacity-0"}`} />
      <div className="mx-auto flex h-[var(--header-h)] max-w-[1200px] items-center justify-between px-3 md:px-6">
        <a
          href="#top"
          aria-label="MS Garage, kembali ke atas"
          className="grid h-11 place-items-center px-2"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <span data-brand-mark className="block w-[50px] text-platinum">
            <Emblem className="block h-auto w-full" />
          </span>
        </a>
        <a
          href={waLink("Halo MS Garage, saya ingin tanya stok mobil.")}
          aria-label="Tanya via WhatsApp"
          className="grid size-11 place-items-center rounded-full text-platinum transition-colors active:bg-white/10"
        >
          <IconWhatsApp width={24} height={24} />
        </a>
      </div>
    </header>
  );
}
