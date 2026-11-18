import type { SVGProps } from "react";

const SPRITE = "/brand/emblem-sprite.svg";

type Part = "emblem" | "letters" | "wreath";

/** Emblem MS (laurel + M|S). Satu sprite eksternal yang di-cache, warna mengikuti currentColor. */
export function Emblem({
  part = "emblem",
  title,
  ...props
}: SVGProps<SVGSVGElement> & { part?: Part; title?: string }) {
  return (
    <svg
      viewBox="0 0 827 590"
      fill="currentColor"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      <use href={`${SPRITE}#${part}`} />
    </svg>
  );
}

/** Indikator loading mini: emblem berputar seperti koin. */
export function Spinner({ size = 36, label = "Memuat" }: { size?: number; label?: string }) {
  return (
    <span role="status" aria-label={label} className="coin inline-grid text-platinum" style={{ width: size }}>
      <span className="coin-face coin-loop block">
        <Emblem style={{ width: size, height: "auto", display: "block" }} />
      </span>
    </span>
  );
}
