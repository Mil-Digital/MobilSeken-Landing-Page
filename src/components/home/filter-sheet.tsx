"use client";

import { AnimatePresence, useDragControls, type PanInfo } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useState } from "react";
import { IconClose } from "@/components/icons";
import { PressButton } from "@/components/press";
import { priceShort } from "@/lib/format";
import { defaultFilters, priceStep, type Bounds, type Filters, type Sort, type Trans } from "@/lib/filters";

const sheetSpring = { type: "spring", stiffness: 420, damping: 40, mass: 0.9 } as const;

export function FilterSheet({
  open,
  onClose,
  filters,
  bounds,
  onChange,
  resultCount,
}: {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  bounds: Bounds;
  onChange: (f: Filters) => void;
  resultCount: (f: Filters) => number;
}) {
  // Draf lokal: hasil baru diterapkan saat menekan tombol tampilkan.
  const [draft, setDraft] = useState(filters);
  const drag = useDragControls();

  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => {
      html.style.overflow = prev;
      window.removeEventListener("keydown", esc);
    };
  }, [open, onClose]);

  const count = resultCount(draft);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="filter-title">
          <m.div
            className="absolute inset-0 bg-[rgb(var(--platinum-rgb)/0.32)] backdrop-blur-[6px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <m.div
            className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[88svh] max-w-[560px] flex-col rounded-t-[26px] border-t border-hairline bg-cabin"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={sheetSpring}
            drag="y"
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.7 }}
            onDragEnd={onDragEnd}
          >
            {/* Pegangan: area tarik */}
            <div className="cursor-grab touch-none px-5 pt-2.5 pb-3" onPointerDown={(e) => drag.start(e)}>
              <div className="mx-auto h-[5px] w-10 rounded-full bg-platinum/25" />
              <div className="mt-4 flex items-center justify-between">
                <h2 id="filter-title" className="wide text-title text-platinum">
                  Filter
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Tutup"
                  className="press -mr-2 grid size-11 place-items-center rounded-full text-platinum"
                >
                  <IconClose />
                </button>
              </div>
            </div>

            <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-5">
              <Field label="Urutkan">
                <Segmented<Sort>
                  id="sort"
                  value={draft.sort}
                  onChange={(v) => set("sort", v)}
                  options={[
                    ["newest", "Terbaru"],
                    ["price-asc", "Termurah"],
                    ["price-desc", "Termahal"],
                  ]}
                />
              </Field>

              <Field
                label="Harga"
                readout={`${priceShort(draft.price[0])} – ${priceShort(draft.price[1])}`}
              >
                <DualRange
                  min={bounds.price[0]}
                  max={bounds.price[1]}
                  step={priceStep}
                  value={draft.price}
                  onChange={(v) => set("price", v)}
                  labels={["Harga minimum", "Harga maksimum"]}
                />
              </Field>

              <Field label="Tahun" readout={`${draft.year[0]} – ${draft.year[1]}`}>
                <DualRange
                  min={bounds.year[0]}
                  max={bounds.year[1]}
                  step={1}
                  value={draft.year}
                  onChange={(v) => set("year", v)}
                  labels={["Tahun minimum", "Tahun maksimum"]}
                />
              </Field>

              <Field label="Transmisi" last>
                <Segmented<Trans>
                  id="trans"
                  value={draft.trans}
                  onChange={(v) => set("trans", v)}
                  options={[
                    ["all", "Semua"],
                    ["Otomatis", "Otomatis"],
                    ["Manual", "Manual"],
                  ]}
                />
              </Field>
            </div>

            <div className="flex items-center gap-3 border-t border-hairline px-5 pt-3 pb-safe">
              <PressButton
                variant="ghost"
                className="px-5"
                onClick={() => setDraft({ ...defaultFilters(bounds), category: draft.category, brand: draft.brand })}
              >
                Reset
              </PressButton>
              <PressButton
                className="tnum flex-1"
                disabled={count === 0}
                onClick={() => {
                  onChange(draft);
                  onClose();
                }}
              >
                {count === 0 ? "Tidak ada mobil" : `Tampilkan ${count} mobil`}
              </PressButton>
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Field({
  label,
  readout,
  last,
  children,
}: {
  label: string;
  readout?: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`py-6 ${last ? "" : "border-b border-hairline"}`}>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-body font-medium text-platinum">{label}</h3>
        {readout && <p className="tnum text-body text-steel">{readout}</p>}
      </div>
      {children}
    </section>
  );
}

function Segmented<T extends string>({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="grid rounded-full bg-panel p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }} role="radiogroup">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className="relative h-11 rounded-full text-body font-medium"
        >
          {value === v && (
            <m.span
              layoutId={`seg-${id}`}
              className="absolute inset-0 rounded-full bg-platinum"
              transition={{ type: "spring", stiffness: 520, damping: 40 }}
            />
          )}
          <span className={`relative transition-colors ${value === v ? "text-night" : "text-platinum/80"}`}>{label}</span>
        </button>
      ))}
    </div>
  );
}

function DualRange({
  min,
  max,
  step,
  value,
  onChange,
  labels,
}: {
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  labels: [string, string];
}) {
  const span = max - min || 1;
  const a = ((value[0] - min) / span) * 100;
  const b = ((value[1] - min) / span) * 100;
  return (
    <div className="dual relative h-11">
      <div className="absolute inset-x-[13px] top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-panel">
        <div className="absolute inset-y-0 rounded-full bg-xenon" style={{ left: `${a}%`, right: `${100 - b}%` }} />
      </div>
      <input
        type="range"
        aria-label={labels[0]}
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={(e) => onChange([Math.min(+e.target.value, value[1]), value[1]])}
      />
      <input
        type="range"
        aria-label={labels[1]}
        min={min}
        max={max}
        step={step}
        value={value[1]}
        onChange={(e) => onChange([value[0], Math.max(+e.target.value, value[0])])}
      />
    </div>
  );
}
