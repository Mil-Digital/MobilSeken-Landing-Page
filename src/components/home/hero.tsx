"use client";

import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CarPhoto } from "@/components/car-photo";
import { IconBack, IconWhatsApp } from "@/components/icons";
import { Odometer } from "@/components/odometer";
import { PressLink, runSweep } from "@/components/press";
import type { CarImage, CarStatus } from "@/lib/cars";
import { clamp, finePointer, lerp, reducedMotion, settleLoop } from "@/lib/fx";
import { kmCompact, priceShort, transmissionShort } from "@/lib/format";
import { markHeroReady, onIntroReveal } from "@/lib/intro";
import { SITE, waLink } from "@/lib/site";
import { StageLight, StudioBackdrop } from "./studio-backdrop";

export type LineupCar = {
  id: string;
  path: string;
  brand: string;
  model: string;
  variant: string;
  year: number;
  price: number;
  mileageKm: number;
  transmission: string;
  status: CarStatus;
  image: CarImage;
  focus: string;
};

const ADVANCE_MS = 5200;

type EmblaApi = NonNullable<UseEmblaCarouselType[1]>;

/**
 * Pembuka = showroom.
 * HP: judul → panggung coverflow → info mobil aktif → tombol.
 * Desktop: dua kolom; kiri judul + info + rail thumbnail, kanan panggung 3D yang miring mengikuti kursor.
 *
 * Performa: setiap frame hanya menulis transform/opacity langsung ke elemen (tanpa CSS variable di
 * induk, tanpa blur/blend/pantulan), jadi seluruh gerak dikerjakan compositor GPU.
 */
export function Hero({ cars, total }: { cars: LineupCar[]; total: number }) {
  const ref = useRef<HTMLElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const photos = useRef<(HTMLDivElement | null)[]>([]);
  const shades = useRef<(HTMLSpanElement | null)[]>([]);
  const slides = useRef<(HTMLLIElement | null)[]>([]);
  const glints = useRef<(HTMLSpanElement | null)[]>([]);
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, align: "center", duration: 32 }, [
    Autoplay({ playOnInit: false, delay: ADVANCE_MS, stopOnInteraction: false, stopOnMouseEnter: true, stopOnFocusIn: true }),
  ]);

  // Coverflow: jarak tiap slide ke tengah (d: −1…0…1) langsung jadi transform & opacity.
  const tween = useCallback((api: EmblaApi, event?: string) => {
    const engine = api.internalEngine();
    const progress = api.scrollProgress();
    const inView = api.slidesInView();
    const snaps = api.scrollSnapList();
    snaps.forEach((snap, snapIndex) => {
      engine.slideRegistry[snapIndex].forEach((i) => {
        if (event === "scroll" && !inView.includes(i)) return;
        let diff = snap - progress;
        if (engine.options.loop) {
          engine.slideLooper.loopPoints.forEach((lp) => {
            const target = lp.target();
            if (i === lp.index && target !== 0) {
              diff = Math.sign(target) === -1 ? snap - (1 + progress) : snap + (1 - progress);
            }
          });
        }
        const d = clamp(diff * snaps.length, -1.6, 1.6);
        const ad = Math.min(1, Math.abs(d));
        const card = cards.current[i];
        if (card) {
          card.style.transform = `perspective(1100px) translate3d(${(-9 * d).toFixed(2)}%,0,0) rotateY(${(-14 * d).toFixed(2)}deg) scale(${(1 - 0.14 * ad).toFixed(4)})`;
        }
        const photo = photos.current[i];
        if (photo) photo.style.transform = `translate3d(${(-12 * d).toFixed(2)}%,0,0)`;
        const shade = shades.current[i];
        if (shade) shade.style.opacity = (ad * 0.62).toFixed(3);
        const slide = slides.current[i];
        if (slide) {
          const z = String(10 - Math.round(ad * 9));
          if (slide.style.zIndex !== z) slide.style.zIndex = z;
        }
      });
    });
  }, []);

  useEffect(() => {
    if (!embla) return;
    const sel = () => {
      const i = embla.selectedScrollSnap();
      setSelected(i);
      runSweep(glints.current[i]);
    };
    const play = () => setPlaying(true);
    const stop = () => setPlaying(false);
    tween(embla);
    setSelected(embla.selectedScrollSnap());
    embla
      .on("select", sel)
      .on("scroll", tween)
      .on("slideFocus", tween)
      .on("reInit", tween)
      .on("autoplay:play", play)
      .on("autoplay:stop", stop);
    return () => {
      embla
        .off("select", sel)
        .off("scroll", tween)
        .off("slideFocus", tween)
        .off("reInit", tween)
        .off("autoplay:play", play)
        .off("autoplay:stop", stop);
    };
  }, [embla, tween]);

  // Autoplay hanya setelah loader membuka hero; berhenti saat hero tak terlihat / tab tersembunyi.
  useEffect(() => {
    if (!embla) return;
    const auto = embla.plugins().autoplay;
    if (!auto || reducedMotion()) return;
    let revealed = false;
    let visible = true;
    const sync = () => {
      if (revealed && visible && !document.hidden) {
        if (!auto.isPlaying()) auto.play();
      } else if (auto.isPlaying()) auto.stop();
    };
    const off = onIntroReveal(() => {
      revealed = true;
      setTimeout(() => runSweep(glints.current[embla.selectedScrollSnap()]), 700);
      sync();
    });
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        sync();
      },
      { threshold: 0.3 },
    );
    if (ref.current) io.observe(ref.current);
    document.addEventListener("visibilitychange", sync);
    return () => {
      off();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      auto.stop();
    };
  }, [embla]);

  // Desktop: panggung miring mengikuti kursor. Hanya satu elemen yang ditulis per frame.
  useEffect(() => {
    const el = ref.current;
    const stage = tiltRef.current;
    const light = lightRef.current;
    if (!el || !stage || !finePointer() || reducedMotion()) return;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    const loop = settleLoop(() => {
      x = lerp(x, tx, 0.07);
      y = lerp(y, ty, 0.07);
      stage.style.transform = `perspective(1600px) rotateX(${(-y * 3).toFixed(3)}deg) rotateY(${(x * 5).toFixed(3)}deg)`;
      if (light) light.style.transform = `translate3d(${(x * 18).toFixed(2)}px,0,0)`;
      return Math.abs(tx - x) + Math.abs(ty - y) > 0.002;
    });
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      tx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      ty = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
      loop.kick();
    };
    const leave = () => {
      tx = 0;
      ty = 0;
      loop.kick();
    };
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", leave);
    return () => {
      loop.stop();
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);

  const car = cars[selected] ?? cars[0];

  return (
    <section
      ref={ref}
      id="top"
      className="hero-stage relative isolate overflow-hidden bg-night pt-[calc(var(--header-h)+env(safe-area-inset-top))] lg:flex lg:min-h-[100svh] lg:items-center"
    >
      <StudioBackdrop />

      <div className="hero-grid relative mx-auto w-full max-w-[1280px] lg:px-10 lg:pb-10">
        {/* Judul */}
        <div className="hero-copy [grid-area:copy] px-5 pt-7 lg:px-0 lg:pt-0">
          <h1 className="hero-title font-display text-[clamp(26px,7.2vw,30px)] leading-[1.12] font-[520] text-platinum lg:text-[44px] xl:text-[48px]">
            <span className="hero-line">
              <span>Mobil seken pilihan</span>
            </span>
            <span className="hero-line text-steel">
              <span>di Bandung.</span>
            </span>
          </h1>
          <p className="hero-meta tnum mt-4 flex text-body text-steel lg:mt-6 lg:text-lead">
            <span className="pr-4 text-platinum">
              <Odometer value={String(total)} /> unit tersedia
            </span>
            <span className="border-l border-hairline pl-4">Buka {SITE.hoursShort}</span>
          </p>
        </div>

        {/* Panggung */}
        <div className="hero-lineup relative [grid-area:stage] mt-5 lg:mt-0">
          <StageLight lightRef={lightRef} />
          <div ref={tiltRef} className="stage-tilt relative">
            <div ref={emblaRef} className="stage-viewport overflow-hidden" aria-roledescription="carousel" aria-label="Stok di showroom">
              <ul className="flex touch-pan-y pt-8 pb-12 lg:pt-12 lg:pb-16">
                {cars.map((c, i) => (
                  <li
                    key={c.id}
                    ref={(el) => {
                      slides.current[i] = el;
                    }}
                    className="relative min-w-0 shrink-0 grow-0 basis-[74%] px-[5px] sm:basis-[46%] md:basis-[38%] lg:basis-[60%] xl:basis-[56%]"
                    aria-roledescription="slide"
                    aria-label={`${i + 1} dari ${cars.length}`}
                  >
                    <div
                      ref={(el) => {
                        cards.current[i] = el;
                      }}
                      className="coverflow-card relative"
                    >
                      <Link
                        href={c.path}
                        draggable={false}
                        onFocus={() => embla?.scrollTo(i)}
                        className="coverflow-face relative block aspect-[4/5] overflow-hidden rounded-[22px] bg-cabin"
                        aria-label={`${c.brand} ${c.model} ${c.year}, ${priceShort(c.price)}`}
                      >
                        <div
                          ref={(el) => {
                            photos.current[i] = el;
                          }}
                          className="coverflow-photo absolute inset-y-0 -inset-x-[14%]"
                        >
                          <CarPhoto
                            image={c.image}
                            alt=""
                            sizes="(min-width: 1024px) 420px, (min-width: 768px) 50vw, (min-width: 640px) 60vw, 100vw"
                            hero={i === 0}
                            objectPosition={c.focus}
                            onReady={i === 0 ? markHeroReady : undefined}
                          />
                        </div>
                        <span className="coverflow-top pointer-events-none absolute inset-0" />
                        <span
                          ref={(el) => {
                            glints.current[i] = el;
                          }}
                          className="sweep sweep-strong pointer-events-none absolute inset-0"
                          style={{ "--sweep-dur": "1300ms" } as React.CSSProperties}
                        />
                        <span
                          ref={(el) => {
                            shades.current[i] = el;
                          }}
                          className="coverflow-shade pointer-events-none absolute inset-0 bg-night"
                        />
                        {c.status === "booking" && (
                          <span className="absolute top-3 left-3 rounded-full bg-signal px-3 py-1 text-micro font-semibold text-night">
                            Booking
                          </span>
                        )}
                      </Link>
                      {/* HUD: hanya untuk mobil aktif, muncul bertahap saat naik panggung */}
                      {i === selected && (
                        <>
                          <span aria-hidden className="hud hud-a tnum">
                            <span className="hud-dot" />
                            {c.year}
                          </span>
                          <span aria-hidden className="hud hud-b tnum">
                            {kmCompact(c.mileageKm)} km
                          </span>
                          <span aria-hidden className="hud hud-c">
                            {transmissionShort(c.transmission)}
                          </span>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {/* Bayangan lantai di bawah mobil aktif */}
            <div aria-hidden className="stage-shadow pointer-events-none" />
          </div>

          {/* Tombol sebelumnya/berikutnya (desktop) */}
          <div className="absolute right-0 bottom-2 z-30 hidden gap-2 lg:flex">
            <button
              type="button"
              onClick={() => embla?.scrollPrev()}
              aria-label="Mobil sebelumnya"
              data-magnetic=""
              className="press grid size-12 place-items-center rounded-full border border-hairline text-platinum transition-colors hover:border-platinum/40"
            >
              <IconBack />
            </button>
            <button
              type="button"
              onClick={() => embla?.scrollNext()}
              aria-label="Mobil berikutnya"
              data-magnetic=""
              className="press grid size-12 place-items-center rounded-full border border-hairline text-platinum transition-colors hover:border-platinum/40"
            >
              <IconBack className="rotate-180" />
            </button>
          </div>
        </div>

        {/* Info mobil yang sedang tersorot */}
        <div className="hero-info [grid-area:info] px-5 lg:mt-12 lg:px-0" aria-live="polite">
          <div className="flex items-end justify-between gap-4">
            <div key={car.id} className="roll-in min-w-0">
              <p className="text-micro text-steel lg:text-body">{car.brand}</p>
              <p className="wide truncate text-title leading-tight text-platinum lg:text-[34px]">{car.model}</p>
              <p className="mt-1 hidden truncate text-body text-steel lg:block">{car.variant}</p>
            </div>
            <p className="tnum shrink-0 pb-0.5 text-body text-steel lg:hidden">
              <span className="text-platinum">{String(selected + 1).padStart(2, "0")}</span>
              <span className="mx-1.5">/</span>
              {String(cars.length).padStart(2, "0")}
            </p>
          </div>
          <div className="mt-2 flex items-center justify-between gap-4 lg:mt-5">
            <p key={car.id} className="roll-in tnum text-body text-steel lg:text-lead" style={{ animationDelay: "60ms" }}>
              {car.year}
              <span className="mx-2 text-hairline">|</span>
              {kmCompact(car.mileageKm)} km
              <span className="mx-2 text-hairline">|</span>
              <span className="font-semibold text-platinum">
                <Odometer key={car.id} value={priceShort(car.price)} stagger={40} />
              </span>
            </p>
            <span className="relative block h-[2px] w-16 shrink-0 overflow-hidden rounded-full bg-platinum/15 lg:hidden">
              <Progress run={playing} k={selected} />
            </span>
          </div>

          {/* Rail thumbnail (desktop): lompat langsung ke mobil mana pun */}
          <div className="mt-8 hidden items-center gap-2.5 lg:flex" role="tablist" aria-label="Pilih mobil">
            {cars.map((c, i) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={i === selected}
                aria-label={`${c.brand} ${c.model}`}
                onClick={() => embla?.scrollTo(i)}
                className={`thumb relative h-[52px] w-[68px] overflow-hidden rounded-[10px] bg-cabin ${i === selected ? "is-active" : ""}`}
              >
                <Image src={c.image.src} alt="" fill sizes="68px" className="object-cover" style={{ objectPosition: c.focus }} />
                <span className="absolute inset-x-1.5 bottom-1.5 block h-[2px] overflow-hidden rounded-full bg-platinum/20">
                  {i === selected && <Progress run={playing} k={selected} />}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="hero-cta [grid-area:cta] mt-6 flex gap-3 px-5 pb-[max(22px,env(safe-area-inset-bottom))] lg:mt-8 lg:px-0 lg:pb-0">
          <StockLink />
          <PressLink
            href={waLink("Halo MS Garage, saya ingin tanya stok mobil.")}
            variant="icon"
            aria-label="Tanya via WhatsApp"
          >
            <IconWhatsApp width={22} height={22} />
          </PressLink>
        </div>
      </div>

      <div data-header-sentinel className="absolute inset-x-0 bottom-0 h-px" />
    </section>
  );
}

function Progress({ run, k }: { run: boolean; k: number }) {
  return (
    <span
      key={`${k}-${run}`}
      className="hero-progress absolute inset-0 origin-left bg-xenon"
      data-run={run ? "" : undefined}
      style={{ "--rotate": `${ADVANCE_MS}ms` } as React.CSSProperties}
    />
  );
}

function StockLink() {
  const ref = useRef<HTMLAnchorElement>(null);
  return (
    <a
      ref={ref}
      href="#stok"
      data-magnetic=""
      className="press sweep sweep-strong inline-flex min-h-[52px] flex-1 items-center justify-center rounded-full bg-xenon px-7 text-lead font-semibold text-xenon-ink lg:flex-none"
      style={{ "--sweep-dur": "650ms" } as React.CSSProperties}
      onPointerDown={() => runSweep(ref.current)}
      onClick={(e) => {
        const target = document.getElementById("stok");
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth" });
      }}
    >
      Lihat semua stok
    </a>
  );
}
