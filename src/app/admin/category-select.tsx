"use client";

import { useState, useTransition } from "react";
import { CATEGORIES, type Category } from "@/lib/category";
import { setCarCategory } from "./actions";

/** Kelompok mobil di navigasi stok (SUV / MPV / Sedan). Tersimpan langsung saat diganti. */
export function CategorySelect({ id, value }: { id: string; value: Category }) {
  const [current, setCurrent] = useState(value);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-end">
      <select
        aria-label={`Kategori ${id}`}
        value={current}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as Category;
          const prev = current;
          setCurrent(next);
          setError(null);
          start(async () => {
            const res = await setCarCategory(id, next);
            if (!res.ok) {
              setCurrent(prev);
              setError(res.error ?? "Gagal");
            }
          });
        }}
        className="h-9 rounded-[10px] border border-hairline bg-panel px-2 text-micro text-platinum"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      {error && <span className="mt-1 text-[11px] text-sold">{error}</span>}
    </span>
  );
}
