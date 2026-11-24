"use client";

import useEmblaCarousel from "embla-carousel-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, ViewTransition } from "react";
import Image from "next/image";
import { CarPhoto } from "@/components/car-photo";
import { IconBack } from "@/components/icons";
import type { CarImage } from "@/lib/cars";
import { track } from "@/lib/track";

const Viewer = dynamic(() => import("./viewer").then((m) => m.Viewer), { ssr: false });

export function Gallery({
  id,
  images,
  alt,
  dim = false,
}: {
  id: string;
  images: CarImage[];
  alt: string;
  /** Untuk mobil terjual: foto pertama saja, diredupkan. */
  dim?: boolean;
}) {
  const router = useRouter();
  // dragThreshold kecil: geser pendek sudah dianggap swipe (lebih responsif di HP).
  const [viewport, api] = useEmblaCarousel({ loop: false, containScroll: "trimSnaps", watchDrag: !dim, dragThreshold: 4 });
  const strip = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const [viewerLoaded, setViewerLoaded] = useState(false);

  // Thumbnail aktif selalu terlihat di strip.
  useEffect(() => {
    const el = strip.current?.children[index] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index]);

  useEffect(() => {
    if (!api) return;
    const on = () => setIndex(api.selectedScrollSnap());
    api.on("select", on);
    return () => {
      api.off("select", on);
    };
  }, [api]);

  // Lanjut dari foto yang terakhir dilihat di kartu (?foto=2).
  useLayoutEffect(() => {
    if (!api) return;
    const n = Number(new URLSearchParams(window.location.search).get("foto"));
    if (n > 1) api.scrollTo(n - 1, true);
  }, [api]);

  const back = () => {
    const sameOrigin = document.referrer.startsWith(window.location.origin);
    if (sameOrigin && window.history.length > 1) router.back();
    else router.push("/");
  };

  const shown = dim ? images.slice(0, 1) : images;

  return (
    <div className="relative mx-auto max-w-[1200px] md:px-10 md:pt-6 lg:max-w-none lg:px-0 lg:pt-0">
      <ViewTransition name={`car-${id}`} share="morph" default="none">
        <div className="relative aspect-[4/3] overflow-hidden bg-cabin md:rounded-[18px]">
          <div ref={viewport} className="absolute inset-0 overflow-hidden">
            <div className="flex h-full touch-pan-y">
              {shown.map((img, i) => (
                <button
                  key={img.src}
                  type="button"
                  data-gallery-open
                  className="relative h-full min-w-0 flex-[0_0_100%] cursor-zoom-in"
                  aria-label={`Buka foto ${i + 1} dari ${shown.length} layar penuh`}
                  disabled={dim}
                  onPointerEnter={() => setViewerLoaded(true)}
                  // Embla sendiri membatalkan klik setelah geser.
                  onClick={() => {
                    setViewerLoaded(true);
                    setOpen(i);
                    track("photo_open", { label: "galeri" });
                  }}
                >
                  <CarPhoto
                    image={img}
                    alt={i === 0 ? alt : ""}
                    sizes="(min-width: 1200px) 1120px, 100vw"
                    hero={i === 0}
                    imgClassName={dim ? "grayscale-[0.6] brightness-[0.45]" : ""}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/40 to-transparent" />
        </div>
      </ViewTransition>

      {/* Kontrol di atas foto */}
      <div
        className="absolute inset-x-0 top-0 flex items-center justify-between px-3 md:px-12 md:pt-6 lg:px-3 lg:pt-3"
        style={{ paddingTop: "max(8px, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={back}
          aria-label="Kembali"
          className="press grid size-11 place-items-center rounded-full bg-black/35 text-white backdrop-blur-md md:mt-3"
        >
          <IconBack />
        </button>
        {!dim && shown.length > 1 && (
          <span className="tnum rounded-full bg-black/35 px-3 py-1.5 text-micro font-medium text-white backdrop-blur-md md:mt-3">
            {index + 1}/{shown.length}
          </span>
        )}
      </div>

      {/* Panah: selalu bisa dipakai meski gestur geser tidak terbaca */}
      {!dim && shown.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto aspect-[4/3] max-w-[1200px] md:mt-6 md:px-10 lg:mt-0 lg:max-w-none lg:px-0">
          <div className="relative h-full">
            {index > 0 && (
              <button
                type="button"
                onClick={() => api?.scrollPrev()}
                aria-label="Foto sebelumnya"
                className="press pointer-events-auto absolute top-1/2 left-2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white md:left-4 md:size-12"
              >
                <IconBack width={20} height={20} />
              </button>
            )}
            {index < shown.length - 1 && (
              <button
                type="button"
                onClick={() => api?.scrollNext()}
                aria-label="Foto berikutnya"
                className="press pointer-events-auto absolute top-1/2 right-2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white md:right-4 md:size-12"
              >
                <IconBack width={20} height={20} className="rotate-180" />
              </button>
            )}
          </div>
        </div>
      )}

      {!dim && shown.length > 1 && (
        <div className="absolute inset-x-0 top-0 mx-auto mt-[calc(75vw-3px)] flex h-[3px] max-w-[1120px] gap-[3px] px-0 md:hidden" aria-hidden>
          {shown.map((img, i) => (
            <span
              key={img.src}
              className={`h-full flex-1 transition-colors duration-300 ${i === index ? "bg-platinum" : "bg-platinum/20"}`}
            />
          ))}
        </div>
      )}

      {/* Strip thumbnail: ketuk untuk lompat ke foto mana pun */}
      {!dim && shown.length > 1 && (
        <div
          ref={strip}
          className="no-scrollbar mx-auto flex max-w-[1200px] gap-2 overflow-x-auto px-5 pt-3 md:px-10 lg:max-w-none lg:px-0"
          role="tablist"
          aria-label="Pilih foto"
        >
          {shown.map((img, i) => (
            <button
              key={img.src}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Foto ${i + 1}`}
              onClick={() => api?.scrollTo(i)}
              className={`thumb relative h-12 w-16 shrink-0 overflow-hidden rounded-[8px] bg-cabin ${i === index ? "is-active" : ""}`}
            >
              <Image src={img.src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {viewerLoaded && (
        <Viewer
          images={shown}
          alt={alt}
          openAt={open}
          onClose={(last) => {
            setOpen(null);
            api?.scrollTo(last, true);
          }}
        />
      )}
    </div>
  );
}
