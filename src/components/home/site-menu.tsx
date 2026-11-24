"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Emblem } from "@/components/emblem";
import { IconPhone, IconPin, IconWhatsApp } from "@/components/icons";
import { RollText } from "@/components/roll-text";
import { SITE, phoneDisplay, telLink, waLink } from "@/lib/site";
import { scrollToSection, type MenuCar, type Section } from "./site-header";

/**
 * Menu layar penuh. Panel turun seperti tirai, link naik dari balik mask satu per satu,
 * garis cahaya tergambar di bawah bagian yang sedang dibaca, foto unggulan terbuka bertahap.
 * Semua lewat transform/opacity/clip-path kecil, dikendalikan atribut data-open.
 */
export function SiteMenu({
  open,
  onClose,
  cars,
  total,
  active,
}: {
  open: boolean;
  onClose: () => void;
  cars: MenuCar[];
  total?: number;
  active: Section;
}) {
  const first = useRef<HTMLAnchorElement>(null);
  // Tampil satu-dua frame dalam keadaan tertutup dulu, supaya transisi masuk selalu berjalan
  // (juga ketika menu baru dipasang tepat saat tombol ditekan).
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!open) {
      setShown(false);
      return;
    }
    let alive = true;
    requestAnimationFrame(() => requestAnimationFrame(() => alive && setShown(true)));
    return () => {
      alive = false;
    };
  }, [open]);

  // Kunci scroll halaman, Esc untuk menutup, fokus ke link pertama.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => first.current?.focus({ preventScroll: true }), 350);
    return () => {
      html.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);

  const go = (id: Section) => (e: React.MouseEvent) => {
    e.preventDefault();
    onClose();
    // Tunggu kunci scroll dilepas, lalu meluncur ke bagian yang dipilih sementara tirai naik.
    setTimeout(() => scrollToSection(id), 60);
  };

  const links: { id: Section; label: string; sup?: string }[] = [
    { id: "top", label: "Beranda" },
    { id: "stok", label: "Stok", sup: total ? String(total) : undefined },
    { id: "showroom", label: "Showroom" },
  ];

  return createPortal(
    <div
      id="site-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      aria-hidden={!open}
      data-open={shown ? "" : undefined}
      className="site-menu fixed inset-0 z-[39]"
    >
      <div className="menu-panel absolute inset-0 overflow-y-auto overscroll-contain bg-night">
        <div className="menu-inner mx-auto grid min-h-full max-w-[1280px] content-start gap-9 px-5 pt-[calc(var(--header-h)+env(safe-area-inset-top)+28px)] pb-[max(28px,env(safe-area-inset-bottom))] md:px-6 lg:grid-cols-2 lg:content-center lg:gap-x-20 lg:px-10 lg:pt-[calc(var(--header-h)+24px)]">
          {/* Link utama */}
          <nav aria-label="Menu utama" className="lg:order-2">
            <ul className="menu-links">
              {links.map((l, i) => (
                <li key={l.id} className="menu-row" style={{ "--i": i } as React.CSSProperties}>
                  <a
                    ref={i === 0 ? first : undefined}
                    href={`#${l.id}`}
                    onClick={go(l.id)}
                    tabIndex={open ? undefined : -1}
                    aria-current={active === l.id ? "location" : undefined}
                    className="menu-link group"
                  >
                    <span className="menu-index tnum">{String(i + 1).padStart(2, "0")}</span>
                    <span className="menu-mask">
                      <span className="menu-word">
                        <RollText>{l.label}</RollText>
                        {l.sup && (
                          <span className="menu-sup tnum" aria-label={`${l.sup} mobil`}>
                            {l.sup}
                          </span>
                        )}
                      </span>
                    </span>
                    {active === l.id && (
                      <svg aria-hidden className="menu-streak" viewBox="0 0 240 16" preserveAspectRatio="none">
                        <path d="M2 10 C 40 3, 78 14, 120 8 S 196 4, 238 9" pathLength={1} />
                      </svg>
                    )}
                  </a>
                </li>
              ))}
              <li className="menu-row" style={{ "--i": 3 } as React.CSSProperties}>
                <a
                  href={SITE.mapsUrl}
                  target="_blank"
                  rel="noopener"
                  tabIndex={open ? undefined : -1}
                  className="menu-link group"
                >
                  <span className="menu-index tnum">04</span>
                  <span className="menu-mask">
                    <span className="menu-word">
                      <RollText>Lokasi</RollText>
                    </span>
                  </span>
                </a>
              </li>
            </ul>
          </nav>

          {/* Foto unggulan: pintas ke detail mobil */}
          {cars.length > 0 && (
            <div className="grid grid-cols-4 gap-2 lg:order-1 lg:max-w-[440px] lg:grid-cols-2 lg:gap-4">
              {cars.slice(0, 4).map((c, i) => (
                <Link
                  key={c.id}
                  href={c.path}
                  tabIndex={open ? undefined : -1}
                  onClick={onClose}
                  className="menu-photo group relative block aspect-[3/4] overflow-hidden rounded-[10px] bg-cabin lg:aspect-[4/5] lg:rounded-[14px]"
                  style={{ "--i": i } as React.CSSProperties}
                  aria-label={c.name}
                >
                  <Image
                    src={c.image.src}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 280px, 25vw"
                    className="menu-photo-img object-cover"
                    style={{ objectPosition: c.focus }}
                  />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-black/70 to-transparent p-3 pt-10 text-body text-white lg:block">
                    {c.name}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {/* Kontak & identitas */}
          <div className="menu-foot grid gap-6 border-t border-hairline pt-6 lg:order-3 lg:col-span-2 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-12">
            <div className="flex items-center gap-3">
              <Emblem className="w-14 text-platinum/85" />
              <p className="text-micro leading-snug text-steel">
                {SITE.legalName}
                <br />
                {SITE.brand}
              </p>
            </div>
            <ul className="grid gap-3 text-body sm:grid-cols-3 lg:justify-items-end">
              <li>
                <a href={waLink("Halo MS Garage, saya ingin tanya stok mobil.")} tabIndex={open ? undefined : -1} className="menu-contact group">
                  <IconWhatsApp width={18} height={18} />
                  <span className="flex flex-col leading-tight">
                    <span className="text-micro text-steel">WhatsApp</span>
                    <span className="tnum text-platinum">{phoneDisplay(SITE.waNumber)}</span>
                  </span>
                </a>
              </li>
              <li>
                <a href={telLink()} tabIndex={open ? undefined : -1} className="menu-contact group">
                  <IconPhone width={18} height={18} />
                  <span className="flex flex-col leading-tight">
                    <span className="text-micro text-steel">Telepon</span>
                    <span className="tnum text-platinum">{phoneDisplay(SITE.phoneNumber)}</span>
                  </span>
                </a>
              </li>
              <li>
                <a href={SITE.mapsUrl} target="_blank" rel="noopener" tabIndex={open ? undefined : -1} className="menu-contact group">
                  <IconPin width={18} height={18} />
                  <span className="flex flex-col leading-tight">
                    <span className="text-micro text-steel">Buka {SITE.hoursShort}</span>
                    <span className="text-platinum">{SITE.address.street}</span>
                  </span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
