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
        <Link key={c.id} href={c.path} className="flow-x press ticket-shadow block w-[72%] max-w-[300px] shrink-0 snap-start md:w-auto">
          <div className="ticket ticket-sm">
          <div className="p-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[12px] bg-panel">
            <CarPhoto image={c.images[0]} alt={`${c.brand} ${c.model}`} sizes="(min-width: 768px) 280px, 72vw" />
            {c.status === "booking" && (
              <span className="flag flag-signal absolute top-2.5 left-0">
                Booking
              </span>
            )}
          </div>
          <p className="mt-3 px-1.5 text-micro text-steel">{c.brand}</p>
          <p className="wide truncate px-1.5 pb-3 text-lead text-platinum">{c.model}</p>
          </div>
          <div className="ticket-stub">
            <p className="price-tag tnum">{priceShort(c.price)}</p>
            <span className="tnum text-body text-steel">{c.year}</span>
          </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
