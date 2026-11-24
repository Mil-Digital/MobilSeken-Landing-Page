import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const IconWhatsApp = (p: P) => (
  <svg {...base} {...p} fill="currentColor" stroke="none">
    <path d="M12.04 2.5a9.43 9.43 0 0 0-8.1 14.26L2.6 21.5l4.86-1.3a9.43 9.43 0 1 0 4.58-17.7Zm0 17.2a7.8 7.8 0 0 1-3.97-1.09l-.28-.17-2.88.77.77-2.8-.19-.29a7.81 7.81 0 1 1 6.55 3.58Zm4.29-5.85c-.23-.12-1.39-.69-1.6-.76-.22-.08-.37-.12-.53.11-.16.24-.61.77-.75.93-.14.16-.27.18-.5.06-.24-.12-1-.37-1.9-1.17a7.1 7.1 0 0 1-1.32-1.64c-.14-.24-.01-.36.1-.48.11-.1.24-.27.36-.41.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.53-1.28-.73-1.75-.19-.46-.39-.4-.53-.4h-.45a.87.87 0 0 0-.63.29c-.22.24-.83.81-.83 1.97 0 1.16.85 2.29.97 2.45.12.16 1.67 2.55 4.05 3.57.57.25 1.01.4 1.35.5.57.18 1.09.16 1.5.1.46-.07 1.39-.57 1.59-1.12.2-.55.2-1.02.14-1.12-.06-.1-.22-.16-.45-.28Z" />
  </svg>
);

export const IconPhone = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5.2 3.5h3l1.5 4-2 1.3a10.5 10.5 0 0 0 7.5 7.5l1.3-2 4 1.5v3a1.7 1.7 0 0 1-1.8 1.7A16.5 16.5 0 0 1 3.5 5.3 1.7 1.7 0 0 1 5.2 3.5Z" />
  </svg>
);

export const IconFilter = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </svg>
);

export const IconBack = (p: P) => (
  <svg {...base} {...p}>
    <path d="M14.5 5.5 8 12l6.5 6.5" />
  </svg>
);

export const IconClose = (p: P) => (
  <svg {...base} {...p}>
    <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />
  </svg>
);

export const IconPin = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.3" />
  </svg>
);

export const IconExpand = (p: P) => (
  <svg {...base} {...p}>
    <path d="M14 4h6v6M10 20H4v-6M20 4l-6.5 6.5M4 20l6.5-6.5" />
  </svg>
);

/* Ikon kecil untuk spesifikasi di kartu mobil */
export const IconCalendar = (p: P) => (
  <svg {...base} {...p}>
    <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
    <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
  </svg>
);

export const IconGauge = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4.2 17.5a8.5 8.5 0 1 1 15.6 0" />
    <path d="M12 13.5 15.8 9" />
    <circle cx="12" cy="13.8" r="1.4" />
  </svg>
);

export const IconGear = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="6" cy="5.5" r="1.6" />
    <circle cx="12" cy="5.5" r="1.6" />
    <circle cx="18" cy="5.5" r="1.6" />
    <circle cx="6" cy="18.5" r="1.6" />
    <circle cx="12" cy="18.5" r="1.6" />
    <path d="M6 7.1v9.8M12 7.1v9.8M18 7.1V12H6" />
  </svg>
);

// Siluet samping untuk navigasi jenis mobil (lebar 36×18).
const body = { ...base, width: 36, height: 18, viewBox: "0 0 36 18", strokeWidth: 1.5 };
const Wheels = () => (
  <>
    <circle cx="9.5" cy="13.4" r="2.5" />
    <circle cx="26.5" cy="13.4" r="2.5" />
    <path d="M2.5 13.4H7M12 13.4h12M29 13.4h4.5" />
  </>
);

export const IconSedan = (p: P) => (
  <svg {...body} {...p}>
    <path d="M2.5 13.4v-2.2c0-.8.5-1.4 1.3-1.6L9 8.5l4.4-3.5c.6-.5 1.3-.7 2-.7h6.2c.8 0 1.5.3 2 .9L27 8.5l4.6.7c1.1.2 1.9 1.1 1.9 2.2v2" />
    <Wheels />
  </svg>
);

export const IconSUV = (p: P) => (
  <svg {...body} {...p}>
    <path d="M2.5 13.4V9.6c0-.8.6-1.5 1.4-1.6L7.5 7.6l3-3.7c.4-.5 1-.8 1.6-.8h14.8c.7 0 1.3.4 1.6 1l1.8 3.7 1.9.5c.9.2 1.5 1 1.5 1.9v3.2" />
    <path d="M17.5 3.1v4.6" />
    <Wheels />
  </svg>
);

export const IconMPV = (p: P) => (
  <svg {...body} {...p}>
    <path d="M2.5 13.4v-3.3c0-.7.4-1.3 1.1-1.5L8.4 6.8l4-3c.5-.4 1.1-.6 1.7-.6h17.4c1.1 0 2 .9 2 2v8.2" />
    <path d="M15 3.2v4.4M23.5 3.2v4.4" />
    <Wheels />
  </svg>
);

export const IconAllCars = (p: P) => (
  <svg {...body} {...p} fill="currentColor" stroke="none">
    <rect x="11" y="2.5" width="6" height="6" rx="1.6" />
    <rect x="19" y="2.5" width="6" height="6" rx="1.6" opacity=".55" />
    <rect x="11" y="10.5" width="6" height="6" rx="1.6" opacity=".55" />
    <rect x="19" y="10.5" width="6" height="6" rx="1.6" />
  </svg>
);
