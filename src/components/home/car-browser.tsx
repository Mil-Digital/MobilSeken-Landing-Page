"use client";

import { AnimatePresence, LayoutGroup } from "motion/react";
import * as m from "motion/react-m";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { BRAND_EVENT } from "./brand-marquee";
import { CarCard } from "@/components/car-card";
import { IconFilter, IconWhatsApp } from "@/components/icons";
import { PressButton, PressLink } from "@/components/press";
import { advancedCount, applyFilters, boundsOf, defaultFilters, type CardCar, type Filters } from "@/lib/filters";
import { waLink } from "@/lib/site";

// Bottom sheet berat dimuat hanya saat dibuka.
const FilterSheet = dynamic(() => import("./filter-sheet").then((x) => x.FilterSheet), { ssr: false });

const layoutSpring = { type: "spring", stiffness: 380, damping: 36, mass: 0.9 } as const;

export function CarBrowser({ cars }: { cars: CardCar[] }) {
  const bounds = useMemo(() => boundsOf(cars), [cars]);
  const [filters, setFilters] = useState<Filters>(() => defaultFilters(bounds));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetLoaded, setSheetLoaded] = useState(false);

  const brands = useMemo(() => {
    const pool = applyFilters(cars, filters, { ignoreBrand: true });
    const all = [...new Set(cars.map((c) => c.brand))].sort((a, b) => a.localeCompare(b));
    return all.map((b) => ({ brand: b, count: pool.filter((c) => c.brand === b).length }));
  }, [cars, filters]);

  // Ketukan di pita merek (di atas) memilih merek di sini.
  useEffect(() => {
    const on = (e: Event) => setFilters((f) => ({ ...f, brand: (e as CustomEvent<string>).detail }));
    window.addEventListener(BRAND_EVENT, on);
    return () => window.removeEventListener(BRAND_EVENT, on);
  }, []);

  const shown = useMemo(() => applyFilters(cars, filters), [cars, filters]);
  const adv = advancedCount(filters, bounds);

  const reset = () => setFilters(defaultFilters(bounds));
  const openSheet = () => {
    setSheetLoaded(true);
    setSheetOpen(true);
  };

  return (
    <section id="stok" aria-labelledby="stok-title" className="relative scroll-mt-[var(--header-h)]">
      {/* Bar merek lengket */}
      <div className="intro-follow sticky top-[calc(var(--header-h)+env(safe-area-inset-top))] z-30 border-b border-hairline bg-night/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[var(--chips-h)] max-w-[1200px] items-center md:px-6">
          <LayoutGroup id="brand-chips">
            <div
              className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-4 md:px-0"
              style={{ maskImage: "linear-gradient(to right, #000 calc(100% - 28px), transparent)" }}
              role="tablist"
              aria-label="Merek"
            >
              <Chip active={filters.brand === null} onClick={() => setFilters((f) => ({ ...f, brand: null }))}>
                Semua
              </Chip>
              {brands.map(({ brand, count }) => (
                <Chip
                  key={brand}
                  active={filters.brand === brand}
                  disabled={count === 0 && filters.brand !== brand}
                  onClick={() => setFilters((f) => ({ ...f, brand: f.brand === brand ? null : brand }))}
                >
                  {brand}
                </Chip>
              ))}
              <span className="w-6 shrink-0" />
            </div>
          </LayoutGroup>
          <button
            type="button"
            onClick={openSheet}
            onPointerEnter={() => setSheetLoaded(true)}
            aria-label={adv ? `Filter lanjutan, ${adv} aktif` : "Filter lanjutan"}
            className="press relative mr-2 grid size-11 shrink-0 place-items-center rounded-full text-platinum md:mr-0"
          >
            <IconFilter />
            {adv > 0 && (
              <span className="tnum absolute top-1 right-1 grid size-[18px] place-items-center rounded-full bg-xenon text-[11px] font-semibold text-xenon-ink">
                {adv}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-5 pt-10 pb-20 md:px-10">
        <div className="intro-follow mb-8 flex items-baseline justify-between">
          <h2 id="stok-title" className="wide-section text-title text-platinum md:text-display">
            Stok tersedia
          </h2>
          <p className="tnum text-body text-steel" aria-live="polite">
            {shown.length} mobil
          </p>
        </div>

        {shown.length > 0 ? (
          <div className="grid gap-x-6 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
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

function Chip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      className="press relative flex h-11 shrink-0 items-center px-4 text-body font-medium whitespace-nowrap disabled:opacity-35"
    >
      {active && (
        <m.span
          layoutId="chip-active"
          className="absolute inset-x-0 inset-y-[5px] rounded-full bg-platinum"
          transition={{ type: "spring", stiffness: 520, damping: 40 }}
        />
      )}
      <span className={`relative transition-colors duration-200 ${active ? "text-night" : "text-platinum/85"}`}>
        {children}
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
