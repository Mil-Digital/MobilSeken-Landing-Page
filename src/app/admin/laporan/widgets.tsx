"use client";

import { useEffect, useState } from "react";
import { IGNORE_KEY } from "@/lib/track";

/** Parameter URL untuk iklan Meta: diisi otomatis oleh Meta dengan nama kampanye / ad set / iklan. */
export const META_URL_PARAMS =
  "utm_source={{site_source_name}}&utm_medium=paid&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}";

export function CopyParams() {
  const [done, setDone] = useState(false);
  return (
    <div className="dash-inset flex flex-col gap-3 p-4 md:flex-row md:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-micro font-medium text-platinum">Parameter URL untuk semua iklan Meta</p>
        <p className="mt-0.5 text-[12px] text-steel">
          Tempel di Ads Manager → Iklan → Tujuan → <em>Parameter URL</em>. Tanpa ini, kunjungan dari iklan terhitung organik.
        </p>
        <code className="mt-2 block truncate rounded-[10px] bg-night px-3 py-2 font-mono text-[11.5px] text-platinum/85">{META_URL_PARAMS}</code>
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(META_URL_PARAMS);
            setDone(true);
            setTimeout(() => setDone(false), 1800);
          } catch {
            /* clipboard diblokir */
          }
        }}
        className="press h-10 shrink-0 rounded-full bg-platinum px-4 text-micro font-semibold text-night"
      >
        {done ? "Tersalin ✓" : "Salin parameter"}
      </button>
    </div>
  );
}

/** Supaya kunjungan pemilik/tim sendiri tidak ikut terhitung (berlaku per browser). */
export function IgnoreMe() {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      setOn(localStorage.getItem(IGNORE_KEY) === "1");
    } catch {
      setOn(false);
    }
  }, []);
  if (on === null) return null;
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5 text-micro text-steel select-none">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => {
          const v = e.target.checked;
          try {
            if (v) localStorage.setItem(IGNORE_KEY, "1");
            else localStorage.removeItem(IGNORE_KEY);
          } catch {
            /* abaikan */
          }
          setOn(v);
        }}
        className="size-4 accent-[var(--platinum)]"
      />
      Abaikan kunjungan saya di browser ini
    </label>
  );
}
