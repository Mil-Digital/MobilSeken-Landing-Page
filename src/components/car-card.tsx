"use client";

import useEmblaCarousel from "embla-carousel-react";
import Link from "next/link";
import { useEffect, useRef, useState, ViewTransition } from "react";
import { CarPhoto } from "@/components/car-photo";
import { useTilt } from "@/components/fx/use-tilt";
import { IconCalendar, IconGauge, IconGear } from "@/components/icons";
import { RollText } from "@/components/roll-text";
import { km, priceShort, transmissionShort } from "@/lib/format";
import type { CardCar } from "@/lib/filters";

/**
 * Kartu mobil bergaya tiket: foto dibingkai di dalam kartu, chip spesifikasi berikon,
 * lalu "sobekan" (cutout setengah lingkaran + garis putus-putus) sebelum bagian harga.
 */
export function CarCard({ car, eager = false }: { car: CardCar; eager?: boolean }) {
  const photos = car.images.slice(0, 3);
  const [viewport, api] = useEmblaCarousel({ loop: false, dragFree: false, containScroll: "trimSnaps" });
  const [index, setIndex] = useState(0);
  const tiltRef = useRef<HTMLAnchorElement>(null);
  useTilt(tiltRef);

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
    <article className="card-3d group">
      <Link
        ref={tiltRef}
        href={`${car.path}${index ? `?foto=${index + 1}` : ""}`}
        className="card-tilt ticket-shadow block"
        aria-label={`${name} ${car.year}, ${priceShort(car.price)}`}
      >
        <div className="ticket">
          <div className="p-2.5">
            <ViewTransition name={`car-${car.id}`} share="morph" default="none">
              <div className="reveal-card relative aspect-[4/3] overflow-hidden rounded-[16px] bg-panel">
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

                {/* Kilau cat yang mengikuti kursor (desktop) */}
                <span aria-hidden className="card-glare pointer-events-none absolute inset-0 z-[1]" />

                {car.status === "booking" && <span className="flag flag-signal absolute top-3 left-0 z-[2]">Booking</span>}

                {photos.length > 1 && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex justify-center gap-1.5 bg-gradient-to-t from-black/45 to-transparent pt-8 pb-3">
                    {photos.map((p, i) => (
                      <span
                        key={p.src}
                        className={`h-[5px] rounded-full transition-all duration-300 ${i === index ? "w-4 bg-white" : "w-[5px] bg-white/50"}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </ViewTransition>

            <div className="px-2 pt-4 pb-4">
              <p className="text-micro text-steel">{car.brand}</p>
              <h3 className="wide mt-0.5 truncate text-title leading-tight text-platinum">{car.model}</h3>
              <p className="mt-1 truncate text-body text-steel">{car.variant}</p>

              <dl className="tnum mt-3.5 flex flex-wrap gap-1.5">
                <div className="spec-chip">
                  <dt className="sr-only">Tahun</dt>
                  <IconCalendar width={15} height={15} />
                  <dd>{car.year}</dd>
                </div>
                <div className="spec-chip">
                  <dt className="sr-only">Kilometer</dt>
                  <IconGauge width={15} height={15} />
                  <dd>{km(car.mileageKm)}</dd>
                </div>
                <div className="spec-chip">
                  <dt className="sr-only">Transmisi</dt>
                  <IconGear width={15} height={15} />
                  <dd>{transmissionShort(car.transmission)}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Sobekan tiket: harga di atas kartu biru supaya langsung terlihat */}
          <div className="ticket-stub">
            <p className="price-tag tnum">
              <span className="sr-only">Harga </span>
              {priceShort(car.price)}
            </p>
            <span className="ticket-cta">
              <RollText>Lihat detail</RollText>
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
