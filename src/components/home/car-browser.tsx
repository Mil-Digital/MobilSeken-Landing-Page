"use client";

import { AnimatePresence, LayoutGroup } from "motion/react";
import * as m from "motion/react-m";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { BRAND_EVENT } from "./brand-marquee";
import { CarCard } from "@/components/car-card";
import { IconAllCars, IconClose, IconFilter, IconMPV, IconSedan, IconSUV, IconWhatsApp } from "@/components/icons";
import { CATEGORIES, type Category } from "@/lib/category";
import { slugify } from "@/lib/format";
import { PressButton, PressLink } from "@/components/press";
import { advancedCount, applyFilters, boundsOf, defaultFilters, type CardCar, type Filters } from "@/lib/filters";
import { waLink } from "@/lib/site";
import { track } from "@/lib/track";

// Bottom sheet berat dimuat hanya saat dibuka.
const FilterSheet = dynamic(() => import("./filter-sheet").then((x) => x.FilterSheet), { ssr: false });

const layoutSpring = { type: "spring", stiffness: 380, damping: 36, mass: 0.9 } as const;

export function CarBrowser({ cars }: { cars: CardCar[] }) {
  const bounds = useMemo(() => boundsOf(cars), [cars]);
  const [filters, setFilters] = useState<Filters>(() => defaultFilters(bounds));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetLoaded, setSheetLoaded] = useState(false);

  // Kelompok yang punya stok saja yang tampil (mis. belum ada MPV = chip MPV tidak muncul).
  const groups = useMemo(() => {
    const pool = applyFilters(cars, filters, { ignoreCategory: true });
    return CATEGORIES.filter((g) => cars.some((c) => c.category === g)).map((g) => ({
      group: g,
      count: pool.filter((c) => c.category === g).length,
    }));
  }, [cars, filters]);

  // Ketukan di pita merek (di atas) memilih merek di sini; tampil sebagai chip yang bisa dilepas.
  useEffect(() => {
    const on = (e: Event) => setFilters((f) => ({ ...f, category: null, brand: (e as CustomEvent<string>).detail }));
    window.addEventListener(BRAND_EVENT, on);
    return () => window.removeEventListener(BRAND_EVENT, on);
  }, []);

  // Unit teratas per jenis, dikirim bersama ViewCategory ke Meta (iklan katalog per jenis).
  const idsIn = (g: Category) => cars.filter((c) => c.category === g).slice(0, 10).map((c) => c.id);

  // Link tujuan iklan: /?jenis=suv, /?merek=toyota, atau keduanya → stok langsung tersaring dan halaman
  // melompat ke daftar stok. Dibaca di browser supaya beranda tetap halaman statis yang cepat.
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const jenis = q.get("jenis")?.trim().toLowerCase();
    const merek = q.get("merek") ? slugify(q.get("merek")!) : null;
    const category = CATEGORIES.find((g) => g.toLowerCase() === jenis) ?? null;
    const brand = merek ? (cars.find((c) => slugify(c.brand) === merek)?.brand ?? null) : null;
    if (!category && !brand) return;
    setFilters((f) => ({ ...f, category, brand }));
    if (category) track("category", { label: category, ids: idsIn(category) });
    requestAnimationFrame(() => document.getElementById("stok")?.scrollIntoView({ block: "start" }));
    // Sekali saat halaman dibuka.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = useMemo(() => applyFilters(cars, filters), [cars, filters]);
  const adv = advancedCount(filters, bounds);

  const reset = () => setFilters(defaultFilters(bounds));
  const openSheet = () => {
    setSheetLoaded(true);
    setSheetOpen(true);
  };

  return (
    <section id="stok" data-track-area="stok" aria-labelledby="stok-title" className="relative scroll-mt-[var(--header-h)]">
      {/* Konsol jenis mobil: kartu gelap mengambang, lengket di bawah header */}
      <div className="intro-follow pointer-events-none sticky top-[calc(var(--header-h)+env(safe-area-inset-top)+10px)] z-30 px-3 pt-6 md:px-6 md:pt-8">
        <div className="pointer-events-auto mx-auto flex max-w-[760px] items-stretch gap-2">
          <LayoutGroup id="type-console">
            <div className="ink cat-console grid min-w-0 flex-1 grid-cols-4" role="tablist" aria-label="Jenis mobil">
              <Segment
                active={filters.category === null && filters.brand === null}
                onClick={() => {
                  track("category", { label: "Semua" });
                  setFilters((f) => ({ ...f, category: null, brand: null }));
                }}
                icon={<IconAllCars />}
                label="Semua"
                count={cars.length}
              />
              {groups.map(({ group, count }) => {
                const Icon = TYPE_ICON[group];
                return (
                  <Segment
                    key={group}
                    active={filters.category === group}
                    disabled={count === 0 && filters.category !== group}
                    onClick={() => {
                      if (filters.category !== group) track("category", { label: group, ids: idsIn(group) });
                      setFilters((f) => ({ ...f, brand: null, category: f.category === group ? null : group }));
                    }}
                    icon={<Icon />}
                    label={group}
                    count={count}
                  />
                );
              })}
            </div>
          </LayoutGroup>
          <button
            type="button"
            onClick={openSheet}
            onPointerEnter={() => setSheetLoaded(true)}
            aria-label={adv ? `Filter lanjutan, ${adv} aktif` : "Filter lanjutan"}
            className="ink cat-console press relative grid w-[58px] shrink-0 place-items-center text-platinum md:w-[66px]"
          >
            <IconFilter />
            {adv > 0 && (
              <span className="tnum absolute top-1.5 right-1.5 grid size-[18px] place-items-center rounded-full bg-xenon text-[11px] font-semibold text-xenon-ink">
                {adv}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-5 pt-8 pb-20 md:px-10 md:pt-10">
        <div className="intro-follow mb-8 flex items-baseline justify-between">
          <h2 id="stok-title" className="wide-section text-title text-platinum md:text-display">
            Stok tersedia
          </h2>
          <div className="flex items-center gap-3">
            {filters.brand && (
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, brand: null }))}
                aria-label={`Hapus filter merek ${filters.brand}`}
                className="press inline-flex h-9 items-center gap-2 rounded-full border border-hairline bg-cabin pr-3 pl-3.5 text-micro font-medium text-platinum"
              >
                {filters.brand}
                <IconClose width={14} height={14} />
              </button>
            )}
            <p className="tnum text-body text-steel" aria-live="polite">
              {shown.length} mobil
            </p>
          </div>
        </div>

        {shown.length > 0 ? (
          <div className="grid gap-x-5 gap-y-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-y-8">
            <AnimatePresence mode="popLayout" initial={false}>
              {shown.map((car, i) => (
                <m.div
                  key={car.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
                  transition={layoutSpring}
                >
                  <CarCard car={car} eager={i === 0} />
                </m.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <EmptyState onReset={reset} />
        )}
      </div>

      {sheetLoaded && (
        <FilterSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          filters={filters}
          bounds={bounds}
          onChange={setFilters}
          resultCount={(f: Filters) => applyFilters(cars, f).length}
        />
      )}
    </section>
  );
}

const TYPE_ICON = { SUV: IconSUV, MPV: IconMPV, Sedan: IconSedan } as const;

/** Satu segmen konsol: siluet + nama jenis + jumlah. Sorotan emas meluncur ke segmen aktif. */
function Segment({
  active,
  disabled,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      className={`cat-seg press ${active ? "is-active" : ""}`}
    >
      {active && (
        <m.span
          layoutId="type-active"
          className="cat-seg-glow"
          transition={{ type: "spring", stiffness: 480, damping: 38 }}
        />
      )}
      <span className="cat-seg-icon">{icon}</span>
      <span className="cat-seg-text">
        <span className="cat-seg-label">{label}</span>
        <span className="cat-seg-count tnum">{count}</span>
      </span>
    </button>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="border-y border-hairline py-14 text-center">
      <p className="wide text-title text-platinum">Belum ada yang cocok</p>
      <p className="mx-auto mt-3 max-w-[32ch] text-body text-steel">
        Coba longgarkan filter, atau ceritakan mobil yang kamu cari. Stok baru sering masuk sebelum sempat tayang.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3">
        <PressButton variant="ghost" onClick={onReset} className="w-full max-w-[280px]">
          Reset filter
        </PressButton>
        <PressLink
          variant="wa"
          href={waLink("Halo MS Garage, saya sedang mencari mobil. Apakah ada stok yang belum tayang?")}
          className="w-full max-w-[280px]"
        >
          <IconWhatsApp width={20} height={20} />
          Tanya via WhatsApp
        </PressLink>
      </div>
    </div>
  );
}
