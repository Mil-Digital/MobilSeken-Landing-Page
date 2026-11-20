import { ViewTransition } from "react";

/**
 * Pembungkus konten halaman untuk transisi antar halaman:
 * halaman lama mundur & memudar, halaman baru mengalir naik.
 * Dipasang di tiap page.tsx (bukan layout) supaya enter/exit benar-benar terpicu.
 * Elemen bernama di dalamnya (mis. foto mobil yang "morph") tetap bergerak sendiri.
 */
export function PageFlow({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="flow-in" exit="flow-out" default="none">
      {children}
    </ViewTransition>
  );
}
