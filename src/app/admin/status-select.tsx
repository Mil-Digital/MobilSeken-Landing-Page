"use client";

import { useState, useTransition } from "react";
import type { CarStatus } from "@/lib/cars";
import { setCarStatus } from "./actions";

const OPTIONS: { value: CarStatus; label: string }[] = [
  { value: "ready", label: "Ready" },
  { value: "booking", label: "Booking" },
  { value: "sold", label: "Terjual" },
];

export function StatusSelect({ id, value }: { id: string; value: CarStatus }) {
  const [current, setCurrent] = useState(value);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-end">
      <select
        aria-label={`Status ${id}`}
        value={current}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as CarStatus;
          const prev = current;
          setCurrent(next);
          setError(null);
          start(async () => {
            const res = await setCarStatus(id, next);
            if (!res.ok) {
              setCurrent(prev);
              setError(res.error ?? "Gagal");
            }
          });
        }}
        className="h-9 rounded-[10px] border border-hairline bg-panel px-2 text-micro text-platinum"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <span className="mt-1 text-[11px] text-sold">{error}</span>}
    </span>
  );
}
