"use client";

import { useState, useTransition } from "react";
import { refreshWeb } from "./actions";

export function RefreshButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await refreshWeb();
            setMsg(r.ok ? "Web sudah memuat data terbaru." : (r.error ?? "Gagal"));
          })
        }
        className="press inline-flex h-10 items-center rounded-full bg-xenon px-4 text-micro font-semibold text-xenon-ink disabled:opacity-60"
      >
        {pending ? "Memperbarui…" : "Perbarui web sekarang"}
      </button>
      {msg && <span className="text-micro text-steel">{msg}</span>}
    </span>
  );
}
