"use client";

import useEmblaCarousel from "embla-carousel-react";
import Link from "next/link";
import { useEffect, useState, ViewTransition } from "react";
import { CarPhoto } from "@/components/car-photo";
import { km, priceShort, transmissionShort } from "@/lib/format";
import type { CardCar } from "@/lib/filters";

export function CarCard({ car, eager = false }: { car: CardCar; eager?: boolean }) {
  const photos = car.images.slice(0, 3);
  const [viewport, api] = useEmblaCarousel({ loop: false, dragFree: false, containScroll: "trimSnaps" });
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!api) return;
    const on = () => setIndex(api.selectedScrollSnap());
    api.on("select", on);
    return () => {
      api.off("select", on);
    };
  }, [api]);

  const name = `${car.brand} ${car.model}`;

  return (
    <article className="group">
      <Link href={`${car.path}${index ? `?foto=${index + 1}` : ""}`} className="block" aria-label={`${name} ${car.year}, ${priceShort(car.price)}`}>
        <ViewTransition name={`car-${car.id}`} share="morph" default="none">
          <div className="reveal-card relative aspect-[4/3] overflow-hidden rounded-[14px] bg-cabin">
            <div ref={viewport} className="reveal-zoom absolute inset-0 overflow-hidden">
              <div className="flex h-full touch-pan-y">
                {photos.map((img, i) => (
                  <div key={img.src} className="relative h-full min-w-0 flex-[0_0_100%]">
                    <CarPhoto
                      image={img}
                      alt={i === 0 ? name : ""}
                      sizes="(min-width: 1024px) 380px, (min-width: 768px) 50vw, 100vw"
                      hero={eager && i === 0}
                    />
                  </div>
                ))}
              </div>
            </div>

            {car.status === "booking" && (
              <span className="absolute top-3 left-3 rounded-full bg-signal px-3 py-1 text-micro font-semibold text-night">
                Booking
              </span>
            )}

            {photos.length > 1 && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center gap-1.5 bg-gradient-to-t from-black/45 to-transparent pt-8 pb-3">
                {photos.map((p, i) => (
                  <span
                    key={p.src}
                    className={`h-[5px] rounded-full transition-all duration-300 ${i === index ? "w-4 bg-platinum" : "w-[5px] bg-platinum/45"}`}
                  />
                ))}
              </div>
            )}
          </div>
        </ViewTransition>

        <div className="mt-4">
          <h3 className="wide text-title text-platinum">{name}</h3>
          <p className="mt-1 truncate text-body text-steel">{car.variant}</p>
        </div>

        <div className="tnum relative mt-3 flex items-center justify-between pt-3">
          <span aria-hidden className="reveal-line absolute inset-x-0 top-0 h-px bg-hairline" />
          <dl className="flex items-center text-body text-platinum/90">
            <div className="pr-3">
              <dt className="sr-only">Tahun</dt>
              <dd>{car.year}</dd>
            </div>
            <div className="border-l border-hairline px-3">
              <dt className="sr-only">Kilometer</dt>
              <dd>{km(car.mileageKm)}</dd>
            </div>
            <div className="border-l border-hairline pl-3">
              <dt className="sr-only">Transmisi</dt>
              <dd>{transmissionShort(car.transmission)}</dd>
            </div>
          </dl>
          <p className="text-lead font-semibold text-platinum">{priceShort(car.price)}</p>
        </div>
      </Link>
    </article>
  );
}
