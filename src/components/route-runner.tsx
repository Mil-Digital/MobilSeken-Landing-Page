"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Garis cahaya tipis yang berlari di puncak layar setiap kali pindah halaman. */
export function RouteRunner() {
  const path = usePathname();
  const first = useRef(true);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setRun((n) => n + 1);
  }, [path]);

  if (!run) return null;
  return <span key={run} aria-hidden className="route-runner" />;
}
