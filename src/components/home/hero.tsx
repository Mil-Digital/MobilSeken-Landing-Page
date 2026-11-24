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
import { RollText } from "@/components/roll-text";
import type { CarImage, CarStatus } from "@/lib/cars";
import { clamp, finePointer, lerp, reducedMotion, settleLoop } from "@/lib/fx";
import { kmCompact, priceShort } from "@/lib/format";
import { markHeroReady, onIntroReveal } from "@/lib/intro";
import { SITE, waLink } from "@/lib/site";
import mapImg from "../../../public/img/peta-showroom-terang.webp";
import { StageLight, StudioBackdrop, type BackdropFx } from "./studio-backdrop";

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
const RAIL_SIZE = 5;

/** Indeks mobil yang tampil di rail: mobil tersorot di posisi tengah, tidak melewati ujung daftar. */
function railWindow(total: number, selected: number): number[] {
  const n = Math.min(RAIL_SIZE, total);
  const start = Math.max(0, Math.min(selected - Math.floor(n / 2), total - n));
  return Array.from({ length: n }, (_, k) => start + k);
}

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
  const fx = useRef<BackdropFx | null>(null);
  const [selected, setSelected] = useState(0);
  const [switches, setSwitches] = useState(0);
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
        if (shade) shade.style.opacity = (ad * 0.42).toFixed(3);
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
      setSwitches((n) => n + 1);
      runSweep(glints.current[i]);
      fx.current?.boost();
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
      data-track-area="hero"
      className="hero-stage hero-sky relative isolate overflow-hidden pt-[calc(var(--header-h)+env(safe-area-inset-top))] lg:flex lg:min-h-[100svh] lg:items-center"
    >
      <StudioBackdrop fxRef={fx} anchorRef={tiltRef} />

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
            {/* Garis kecepatan sesaat setiap kali mobil berganti */}
            {switches > 0 && (
              <span key={switches} aria-hidden className="whoosh">
                {[4, 9, 24, 47, 71, 90, 95].map((top, k) => (
                  <span
                    key={k}
                    style={
                      {
                        top: `${top}%`,
                        width: `${34 + ((k * 23) % 40)}%`,
                        animationDelay: `${(k % 3) * 45}ms`,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </span>
            )}
            <div ref={emblaRef} className="stage-viewport overflow-hidden" aria-roledescription="carousel" aria-label="Stok di showroom">
              <ul className="flex touch-pan-y pt-8 pb-12 lg:pt-12 lg:pb-16">
                {cars.map((c, i) => (
                  <li
                    key={c.id}
                    ref={(el) => {
                      slides.current[i] = el;
                    }}
                    className={`relative min-w-0 shrink-0 grow-0 basis-[74%] px-[5px] sm:basis-[46%] md:basis-[38%] lg:basis-[60%] xl:basis-[56%] ${
                      i === selected ? "is-lit" : ""
                    }`}
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
                        {/* Bendera keterangan: rapi bertumpuk di kiri atas, "berkibar" masuk saat mobil naik panggung */}
                        <span aria-hidden className="flags">
                          {c.status === "booking" && (
                            <span className="flag flag-signal" style={{ "--k": 0 } as React.CSSProperties}>
                              Booking
                            </span>
                          )}
                          <span className="flag flag-accent tnum" style={{ "--k": 1 } as React.CSSProperties}>
                            {c.year}
                          </span>
                          <span className="flag flag-light tnum" style={{ "--k": 2 } as React.CSSProperties}>
                            {kmCompact(c.mileageKm)} km
                          </span>
                          <span className="flag flag-ink" style={{ "--k": 3 } as React.CSSProperties}>
                            {c.transmission === "Manual" ? "Manual" : "Otomatis"}
                          </span>
                        </span>
                      </Link>
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

          {/* Nama model dicat di aspal, berganti bersama mobil (desktop) */}
          <div aria-hidden className="floor-name">
            <span key={car.id} style={{ "--len": car.model.length } as React.CSSProperties}>
              {car.model}
            </span>
          </div>
        </div>

        {/* Info mobil yang sedang tersorot */}
        <div className="hero-info [grid-area:info] px-5 lg:mt-9 lg:px-0" aria-live="polite">
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

          {/* Rail thumbnail (desktop): jendela 5 mobil yang bergeser mengikuti mobil tersorot */}
          <div className="mt-6 hidden items-center gap-2.5 lg:flex" role="tablist" aria-label="Pilih mobil">
            {railWindow(cars.length, selected).map((i) => {
              const c = cars[i];
              return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={i === selected}
                aria-label={`${c.brand} ${c.model}`}
                onClick={() => embla?.scrollTo(i)}
                className={`thumb relative h-[52px] w-[68px] shrink-0 overflow-hidden rounded-[10px] bg-cabin ${i === selected ? "is-active" : ""}`}
              >
                <Image src={c.image.src} alt="" fill sizes="68px" className="object-cover" style={{ objectPosition: c.focus }} />
                <span className="absolute inset-x-1.5 bottom-1.5 block h-[2px] overflow-hidden rounded-full bg-platinum/20">
                  {i === selected && <Progress run={playing} k={selected} />}
                </span>
              </button>
              );
            })}
            {cars.length > RAIL_SIZE && (
              <p className="tnum ml-3 shrink-0 text-body text-steel">
                <span className="text-platinum">{String(selected + 1).padStart(2, "0")}</span>
                <span className="mx-1.5">/</span>
                {String(cars.length).padStart(2, "0")}
              </p>
            )}
          </div>
        </div>

        <div className="hero-cta [grid-area:cta] mt-6 flex gap-3 px-5 pb-[max(22px,env(safe-area-inset-bottom))] lg:mt-7 lg:px-0 lg:pb-0">
          <StockLink />
          <PressLink
            href={waLink("Halo MS Garage, saya ingin tanya stok mobil.")}
            variant="icon"
            className="wa-chip border-0"
            aria-label="Tanya via WhatsApp"
          >
            <IconWhatsApp width={22} height={22} />
          </PressLink>
        </div>
      </div>

      <RouteCard />

      <div data-header-sentinel className="absolute inset-x-0 bottom-0 h-px" />
    </section>
  );
}

/** Kartu navigasi ke showroom: potongan peta, rute, dan mobil kecil yang berjalan di rute (desktop). */
function RouteCard() {
  return (
    <a
      href={SITE.mapsUrl}
      target="_blank"
      rel="noopener"
      data-magnetic=""
      className="route-card press group"
      aria-label={`Navigasi ke showroom, ${SITE.address.street}, buka ${SITE.hoursShort}`}
    >
      <span className="route-map relative block">
        <Image src={mapImg} alt="" fill sizes="120px" className="object-cover opacity-80" />
        <svg viewBox="0 0 120 72" className="route-svg" aria-hidden>
          <path className="route-line" d={ROUTE} />
          <path className="route-run" d={ROUTE} pathLength={1} />
        </svg>
        <span className="route-car" aria-hidden>
          <svg viewBox="0 0 16 9" width="16" height="9">
            <rect x="0.5" y="0.5" width="15" height="8" rx="2.6" fill="#e6eaf0" />
            <rect x="9.2" y="1.5" width="3.2" height="6" rx="1" fill="#0b1a28" opacity="0.8" />
            <rect x="2.6" y="1.8" width="2.2" height="5.4" rx="0.8" fill="#0b1a28" opacity="0.55" />
          </svg>
        </span>
        <span className="route-pin" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="text-micro text-steel">Navigasi ke showroom</span>
        <span className="mt-1 truncate text-body font-medium text-platinum">
          <RollText>{SITE.address.street}</RollText>
        </span>
        <span className="tnum mt-1 text-micro text-steel">Bandung · buka {SITE.hoursShort}</span>
      </span>
    </a>
  );
}

const ROUTE = "M8 62 C 26 62, 26 40, 46 40 S 70 54, 84 34 S 100 12, 112 12";

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
      className="press sweep sweep-strong inline-flex min-h-[52px] flex-1 items-center justify-center gap-3 rounded-full btn-lux px-7 text-lead font-semibold lg:flex-none"
      style={{ "--sweep-dur": "650ms" } as React.CSSProperties}
      onPointerDown={() => runSweep(ref.current)}
      onClick={(e) => {
        const target = document.getElementById("stok");
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth" });
      }}
    >
      <RollText>Lihat semua stok</RollText>
      <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="lux-arrow">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </a>
  );
}
