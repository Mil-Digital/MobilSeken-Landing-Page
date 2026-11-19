"use client";

import { useRef, type ComponentProps } from "react";

type Variant = "primary" | "ghost" | "icon";

const styles: Record<Variant, string> = {
  primary:
    "sweep sweep-strong inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-full bg-xenon px-6 text-lead font-semibold text-xenon-ink",
  ghost:
    "inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-full border border-platinum/20 px-6 text-lead font-medium text-platinum",
  icon: "inline-grid size-[52px] shrink-0 place-items-center rounded-full border border-platinum/20 text-platinum",
};

/** Light sweep singkat saat tombol utama ditekan. */
export function runSweep(el: HTMLElement | null) {
  if (!el) return;
  el.removeAttribute("data-sweep");
  void el.offsetWidth;
  el.setAttribute("data-sweep", "run");
}

const sweepStyle = { "--sweep-dur": "650ms" } as React.CSSProperties;

export function PressLink({
  variant = "primary",
  className = "",
  onPointerDown,
  ...props
}: ComponentProps<"a"> & { variant?: Variant }) {
  const ref = useRef<HTMLAnchorElement>(null);
  return (
    <a
      ref={ref}
      className={`press ${styles[variant]} ${className}`}
      style={sweepStyle}
      data-magnetic=""
      onPointerDown={(e) => {
        if (variant === "primary") runSweep(ref.current);
        onPointerDown?.(e);
      }}
      {...props}
    />
  );
}

export function PressButton({
  variant = "primary",
  className = "",
  onPointerDown,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={ref}
      type="button"
      className={`press ${styles[variant]} ${className}`}
      style={sweepStyle}
      onPointerDown={(e) => {
        if (variant === "primary") runSweep(ref.current);
        onPointerDown?.(e);
      }}
      {...props}
    />
  );
}
