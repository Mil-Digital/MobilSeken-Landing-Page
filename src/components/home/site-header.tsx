"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { Emblem } from "@/components/emblem";
import { IconWhatsApp } from "@/components/icons";
import { runSweep } from "@/components/press";
import { RollText } from "@/components/roll-text";
import type { CarImage } from "@/lib/cars";
import { reducedMotion } from "@/lib/fx";
import { SITE, waLink } from "@/lib/site";

// Menu layar penuh baru dimuat saat tombol menu didekati/disentuh pertama kali.
const SiteMenu = dynamic(() => import("./site-menu").then((m) => m.SiteMenu), { ssr: false });

export type MenuCar = { id: string; path: string; name: string; image: CarImage; focus: string };
export type Section = "top" | "stok" | "showroom";

export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (id === "top") window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
  else el.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth" });
}

/**
 * Header: kiri emblem + wordmark, tengah navigasi (desktop), kanan kartu "Hubungi kami" + tombol menu.
 * Selalu gelap (biru malam) supaya terasa padat; bayangan muncul begitu halaman discroll.
 */
export function SiteHeader({ cars = [], total }: { cars?: MenuCar[]; total?: number }) {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  const [active, setActive] = useState<Section>("top");
  const menuBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const sentinel = document.querySelector("[data-header-sentinel]");
    let raf = 0;
    const check = () => {
      raf = 0;
      setSolid(window.scrollY > 8 || (!!sentinel && sentinel.getBoundingClientRect().top < 64));
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

  // Section mana yang sedang dibaca (untuk penanda di navigasi & menu).
  useEffect(() => {
    const ids: Section[] = ["top", "stok", "showroom"];
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id as Section);
      },
      { rootMargin: "-42% 0px -56% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Siapkan menu diam-diam setelah halaman tenang, supaya ketukan pertama langsung mulus
  // (kode, foto, dan tata letak menu sudah siap sebelum dibutuhkan).
  useEffect(() => {
    const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1200));
    const cic = window.cancelIdleCallback ?? window.clearTimeout;
    let idle = 0;
    const t = window.setTimeout(() => {
      idle = ric(() => setArmed(true), { timeout: 4000 });
    }, 2500);
    return () => {
      window.clearTimeout(t);
      if (idle) cic(idle);
    };
  }, []);

  const close = useCallback(() => setOpen(false), []);
  const toggle = () => {
    setArmed(true);
    setOpen((o) => !o);
  };

  // Kembalikan fokus ke tombol menu saat menu ditutup.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) menuBtn.current?.focus({ preventScroll: true });
    wasOpen.current = open;
  }, [open]);

  return (
    <>
      <header
        className={`ink hdr-dark fixed inset-x-0 top-0 z-40 ${solid && !open ? "is-solid" : ""}`}
        style={{ paddingTop: "env(safe-area-inset-top)", viewTransitionName: "site-header" }}
      >
        {/* Garis progres scroll tipis: seperti jarum instrumen */}
        <span
          aria-hidden
          className={`scroll-progress absolute inset-x-0 bottom-[-1px] h-px origin-left bg-xenon/80 transition-opacity duration-300 ${
            solid && !open ? "opacity-100" : "opacity-0"
          }`}
        />
        <div className="relative mx-auto flex h-[var(--header-h)] max-w-[1280px] items-center justify-between gap-2 px-3 md:px-6 lg:px-10">
          <a
            href="#top"
            aria-label="MS Garage, kembali ke atas"
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-[12px] pr-1 lg:gap-2.5"
            onClick={(e) => {
              e.preventDefault();
              if (open) setOpen(false);
              scrollToSection("top");
            }}
          >
            <span data-brand-mark className="block w-[42px] shrink-0 text-platinum lg:w-[52px]">
              <Emblem className="block h-auto w-full" />
            </span>
            <span className="hdr-in leading-none whitespace-nowrap max-[383px]:hidden" style={{ "--i": 0 } as React.CSSProperties}>
              <span className="wordmark block text-[14px] text-platinum lg:text-[17px]">MS Garage</span>
              <span className="mt-1 block text-[11px] text-steel lg:text-micro">
                <span className="lg:hidden">Bandung</span>
                <span className="hidden lg:inline">{SITE.legalName}</span>
              </span>
            </span>
          </a>

          {/* Navigasi tengah (desktop) */}
          <nav aria-label="Bagian halaman" className="hdr-in absolute left-1/2 hidden -translate-x-1/2 lg:block" style={{ "--i": 1 } as React.CSSProperties}>
            <ul className="flex items-center gap-1">
              {(
                [
                  ["stok", "Stok tersedia"],
                  ["showroom", "Showroom"],
                ] as const
              ).map(([id, label]) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection(id);
                    }}
                    aria-current={active === id ? "location" : undefined}
                    className="nav-link relative flex h-11 items-center gap-2 rounded-[10px] px-3.5 text-body text-platinum/80 transition-colors hover:text-platinum"
                  >
                    <span aria-hidden className={`nav-dot ${active === id ? "is-on" : ""}`} />
                    <RollText>{label}</RollText>
                  </a>
                </li>
              ))}
              <li>
                <a
                  href={SITE.mapsUrl}
                  target="_blank"
                  rel="noopener"
                  className="nav-link flex h-11 items-center gap-2 rounded-[10px] px-3.5 text-body text-platinum/80 transition-colors hover:text-platinum"
                >
                  <span aria-hidden className="nav-dot" />
                  <RollText>Petunjuk arah</RollText>
                </a>
              </li>
            </ul>
          </nav>

          <div className="hdr-in flex items-center gap-2" style={{ "--i": 2 } as React.CSSProperties}>
            <ContactCard />
            <button
              ref={menuBtn}
              type="button"
              onClick={toggle}
              onPointerEnter={() => setArmed(true)}
              onTouchStart={() => setArmed(true)}
              onFocus={() => setArmed(true)}
              aria-expanded={open}
              aria-controls="site-menu"
              aria-label={open ? "Tutup menu" : "Buka menu"}
              className={`menu-btn press ${open ? "is-open" : ""}`}
            >
              <span aria-hidden className="menu-lines">
                <span />
                <span />
              </span>
            </button>
          </div>
        </div>
      </header>

      {armed && <SiteMenu open={open} onClose={close} cars={cars} total={total} active={active} />}
    </>
  );
}

/** Kartu kontak: chip WhatsApp + label dua baris, kilau cahaya saat didekati/ditekan. */
function ContactCard() {
  const ref = useRef<HTMLAnchorElement>(null);
  return (
    <a
      ref={ref}
      href={waLink("Halo MS Garage, saya ingin tanya stok mobil.")}
      data-magnetic=""
      onPointerEnter={(e) => e.pointerType === "mouse" && runSweep(ref.current)}
      onPointerDown={() => runSweep(ref.current)}
      className="contact-card press sweep sweep-strong"
      style={{ "--sweep-dur": "900ms" } as React.CSSProperties}
      aria-label="Hubungi kami via WhatsApp"
    >
      <span className="contact-chip">
        <IconWhatsApp width={18} height={18} />
      </span>
      <span className="flex flex-col items-start leading-none whitespace-nowrap">
        <span className="text-[11px] text-steel">WhatsApp</span>
        <RollText className="mt-1 text-[14px] font-semibold text-platinum lg:text-body">Hubungi kami</RollText>
      </span>
    </a>
  );
}
