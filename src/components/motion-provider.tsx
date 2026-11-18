"use client";

import { LazyMotion, MotionConfig } from "motion/react";

// Fitur motion dimuat terpisah agar JS awal tetap kecil.
const loadFeatures = () => import("./motion-features").then((m) => m.default);

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 420, damping: 38 }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
