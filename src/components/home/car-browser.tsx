"use client";

import { AnimatePresence, LayoutGroup } from "motion/react";
import * as m from "motion/react-m";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { BRAND_EVENT } from "./brand-marquee";
import { CarCard } from "@/components/car-card";
import { IconFilter, IconWhatsApp } from "@/components/icons";
import { CATEGORIES } from "@/lib/category";
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

  const shown = useMemo(() => applyFilters(cars, filters), [cars, filters]);
  const adv = advancedCount(filters, bounds);

  const reset = () => setFilters(defaultFilters(bounds));
  const openSheet = () => {
    setSheetLoaded(true);
    setSheetOpen(true);
  };

  return (
    <section id="stok" aria-labelledby="stok-title" className="relative scroll-mt-[var(--header-h)]">
      {/* Bar kelompok mobil, lengket di bawah header */}
      <div className="ink intro-follow sticky top-[calc(var(--header-h)+env(safe-area-inset-top))] z-30 border-b border-hairline bg-night/[0.97] backdrop-blur-xl">
        <div className="mx-auto flex h-[var(--chips-h)] max-w-[1200px] items-center md:px-6">
          <LayoutGroup id="brand-chips">
            <div
              className="no-scrollbar flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto px-3 md:gap-1 md:px-0"
              style={{ maskImage: "linear-gradient(to right, #000 calc(100% - 28px), transparent)" }}
              role="tablist"
              aria-label="Jenis mobil"
            >
              <Chip
                active={filters.category === null && filters.brand === null}
                onClick={() => setFilters((f) => ({ ...f, category: null, brand: null }))}
              >
                Semua
              </Chip>
              {groups.map(({ group, count }) => (
                <Chip
                  key={group}
                  active={filters.category === group}
                  disabled={count === 0 && filters.category !== group}
                  onClick={() => setFilters((f) => ({ ...f, brand: null, category: f.category === group ? null : group }))}
                >
                  {group}
                  <span className="tnum ml-1.5 text-micro opacity-60">{count}</span>
                </Chip>
              ))}
              {filters.brand && (
                <Chip active onClick={() => setFilters((f) => ({ ...f, brand: null }))} label={`Hapus filter merek ${filters.brand}`}>
                  {filters.brand}
                  <span aria-hidden className="ml-1.5 text-micro opacity-70">✕</span>
                </Chip>
              )}
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

function Chip({
  active,
  disabled,
  onClick,
  label,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className="press relative flex h-11 shrink-0 items-center px-3.5 text-body md:px-4 font-medium whitespace-nowrap disabled:opacity-35"
    >
      {active && (
        <m.span
          layoutId="chip-active"
          className="absolute inset-x-0 inset-y-[5px] rounded-full bg-platinum"
          transition={{ type: "spring", stiffness: 520, damping: 40 }}
        />
      )}
      <span className={`relative flex items-baseline transition-colors duration-200 ${active ? "text-night" : "text-platinum/85"}`}>
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
