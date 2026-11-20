"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { CarPhoto } from "@/components/car-photo";
import { IconPhone, IconWhatsApp } from "@/components/icons";
import { PressLink } from "@/components/press";
import { priceShort } from "@/lib/format";
import type { CardCar } from "@/lib/filters";

export function Description({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [long, setLong] = useState(false);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el) setLong(el.scrollHeight > el.clientHeight + 4);
  }, [text]);

  return (
    <div>
      <div
        ref={ref}
        className={`max-w-[65ch] text-body whitespace-pre-line text-platinum/85 ${open ? "" : "line-clamp-5"}`}
      >
        {text}
      </div>
      {long && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="press mt-2 -ml-1 min-h-11 px-1 text-body font-medium text-xenon"
        >
          Baca selengkapnya
        </button>
      )}
    </div>
  );
}

/** Bar aksi lengket di bawah layar, memperhitungkan safe area iPhone. */
export function ActionBar({ waHref, telHref }: { waHref: string; telHref: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-night/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[640px] items-center gap-3 px-4 pt-3 pb-safe">
        <PressLink href={waHref} className="flex-1">
          <IconWhatsApp width={20} height={20} />
          Tanya via WhatsApp
        </PressLink>
        <PressLink href={telHref} variant="icon" aria-label="Telepon showroom">
          <IconPhone />
        </PressLink>
      </div>
    </div>
  );
}

export function SimilarRow({ cars }: { cars: CardCar[] }) {
  return (
    <div className="flow-reveal no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-2 md:mx-0 md:grid md:grid-cols-4 md:px-0">
      {cars.map((c) => (
        <Link key={c.id} href={c.path} className="flow-x press block w-[72%] max-w-[300px] shrink-0 snap-start md:w-auto">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[12px]">
            <CarPhoto image={c.images[0]} alt={`${c.brand} ${c.model}`} sizes="(min-width: 768px) 280px, 72vw" />
            {c.status === "booking" && (
              <span className="absolute top-2.5 left-2.5 rounded-full bg-signal px-2.5 py-0.5 text-micro font-semibold text-night">
                Booking
              </span>
            )}
          </div>
          <p className="wide mt-3 truncate text-lead text-platinum">
            {c.brand} {c.model}
          </p>
          <p className="tnum mt-0.5 text-body text-steel">
            {c.year}
            <span className="mx-2 inline-block h-3 w-px translate-y-[1px] bg-hairline" />
            {priceShort(c.price)}
          </p>
        </Link>
      ))}
    </div>
  );
}
