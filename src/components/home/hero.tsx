"use client";

import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CarPhoto } from "@/components/car-photo";
import { IconWhatsApp } from "@/components/icons";
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
 * Pembuka = showroom. Judul muncul baris per baris, lalu "panggung" coverflow:
 * mobil aktif di tengah tersorot, tetangganya mundur, miring, dan redup seperti di bayangan studio.
 * Foto di dalam kartu bergeser berlawanan arah (parallax) saat digeser, dan kilau
 * menyapu cat setiap kali mobil baru naik panggung.
 */
export function Hero({ cars, total }: { cars: LineupCar[]; total: number }) {
  const ref = useRef<HTMLElement>(null);
  const slides = useRef<(HTMLLIElement | null)[]>([]);
  const glints = useRef<(HTMLSpanElement | null)[]>([]);
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, align: "center", duration: 34, skipSnaps: false }, [
    Autoplay({ playOnInit: false, delay: ADVANCE_MS, stopOnInteraction: false, stopOnMouseEnter: true, stopOnFocusIn: true }),
  ]);

  // Coverflow: jarak tiap slide ke titik tengah (−1 … 0 … 1) ditulis ke CSS variable.
  const tween = useCallback((api: EmblaApi, event?: string) => {
    const engine = api.internalEngine();
    const progress = api.scrollProgress();
    const inView = api.slidesInView();
    const snaps = api.scrollSnapList();
    snaps.forEach((snap, snapIndex) => {
      engine.slideRegistry[snapIndex].forEach((slideIndex) => {
        if (event === "scroll" && !inView.includes(slideIndex)) return;
        let diff = snap - progress;
        if (engine.options.loop) {
          engine.slideLooper.loopPoints.forEach((lp) => {
            const target = lp.target();
            if (slideIndex === lp.index && target !== 0) {
              diff = Math.sign(target) === -1 ? snap - (1 + progress) : snap + (1 - progress);
            }
          });
        }
        const d = Math.max(-1.6, Math.min(1.6, diff * snaps.length));
        slides.current[slideIndex]?.style.setProperty("--d", d.toFixed(4));
        slides.current[slideIndex]?.style.setProperty("--ad", Math.min(1, Math.abs(d)).toFixed(4));
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
    tween(embla);
    setSelected(embla.selectedScrollSnap());
    embla
      .on("select", sel)
      .on("scroll", tween)
      .on("slideFocus", tween)
      .on("reInit", tween)
      .on("autoplay:play", () => setPlaying(true))
      .on("autoplay:stop", () => setPlaying(false));
    return () => {
      embla.off("select", sel).off("scroll", tween).off("slideFocus", tween).off("reInit", tween);
    };
  }, [embla, tween]);

  // Berpindah otomatis hanya setelah loader membuka hero; berhenti saat hero tidak terlihat,
  // tab tersembunyi, atau pengguna memilih gerak dikurangi.
  useEffect(() => {
    if (!embla) return;
    const auto = embla.plugins().autoplay;
    if (!auto || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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

  // Panggung 3D: miring mengikuti kursor (desktop) atau kemiringan HP (Android, tanpa izin).
  // Nilai −1…1 ditulis ke --tx/--ty; CSS yang mengubahnya jadi rotasi, glare, dan geser lampu.
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    const loop = settleLoop(() => {
      x = lerp(x, tx, 0.08);
      y = lerp(y, ty, 0.08);
      el.style.setProperty("--tx", x.toFixed(4));
      el.style.setProperty("--ty", y.toFixed(4));
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
    const tilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      tx = clamp(e.gamma / 25, -1, 1);
      ty = clamp((e.beta - 45) / 30, -1, 1);
      loop.kick();
    };
    const fine = finePointer();
    // iOS meminta izin untuk sensor gerak; di in-app browser itu mengganggu, jadi dilewati.
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: unknown } | undefined;
    const gyro = !fine && DOE && typeof DOE.requestPermission !== "function";
    if (fine) {
      el.addEventListener("pointermove", move, { passive: true });
      el.addEventListener("pointerleave", leave);
    } else if (gyro) window.addEventListener("deviceorientation", tilt, { passive: true });
    return () => {
      loop.stop();
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      window.removeEventListener("deviceorientation", tilt);
    };
  }, []);

  const car = cars[selected] ?? cars[0];

  return (
    <section
      ref={ref}
      id="top"
      className="hero-stage relative isolate flex flex-col overflow-hidden bg-night pt-[calc(var(--header-h)+env(safe-area-inset-top))] md:min-h-[100svh]"
    >
      <StudioBackdrop />
      <div className="hero-copy relative mx-auto w-full max-w-[1200px] px-5 pt-7 md:px-10 md:pt-16">
        <h1 className="hero-title font-display text-[clamp(26px,7.2vw,30px)] leading-[1.14] font-[520] text-platinum md:text-[56px]">
          <span className="hero-line">
            <span>Mobil seken pilihan</span>
          </span>
          <span className="hero-line text-steel">
            <span>di Bandung.</span>
          </span>
        </h1>
        <p className="hero-meta tnum mt-4 flex text-body text-steel">
          <span className="pr-4 text-platinum">
            <Odometer value={String(total)} /> unit tersedia
          </span>
          <span className="border-l border-hairline pl-4">Buka {SITE.hoursShort}</span>
        </p>
      </div>

      {/* Panggung */}
      <div className="hero-lineup relative mt-6 md:mt-10">
        <StageLight />
        <div className="stage-tilt">
        <div ref={emblaRef} className="overflow-hidden" aria-roledescription="carousel" aria-label="Stok di showroom">
          <ul className="flex touch-pan-y pt-7 pb-16 [perspective:1100px]">
            {cars.map((c, i) => (
              <li
                key={c.id}
                ref={(el) => {
                  slides.current[i] = el;
                }}
                className="coverflow min-w-0 shrink-0 grow-0 basis-[76%] sm:basis-[46%] md:basis-[32%] lg:basis-[26%]"
                aria-roledescription="slide"
                aria-label={`${i + 1} dari ${cars.length}`}
              >
                <div className="coverflow-card relative">
                <Link
                  href={c.path}
                  draggable={false}
                  onFocus={() => embla?.scrollTo(i)}
                  className="coverflow-face relative block aspect-[4/5] overflow-hidden rounded-[20px] bg-cabin"
                  aria-label={`${c.brand} ${c.model} ${c.year}, ${priceShort(c.price)}`}
                >
                  <div className="coverflow-photo absolute inset-y-0 -inset-x-[14%]">
                    <CarPhoto
                      image={c.image}
                      alt=""
                      sizes="(min-width: 1024px) 380px, (min-width: 768px) 40vw, (min-width: 640px) 60vw, 100vw"
                      hero={i === 0}
                      objectPosition={c.focus}
                      onReady={i === 0 ? markHeroReady : undefined}
                    />
                  </div>
                  <span
                    ref={(el) => {
                      glints.current[i] = el;
                    }}
                    className="sweep sweep-strong pointer-events-none absolute inset-0"
                    style={{ "--sweep-dur": "1300ms" } as React.CSSProperties}
                  />
                  <span className="coverflow-glare pointer-events-none absolute inset-0" />
                  <span className="coverflow-shade pointer-events-none absolute inset-0 bg-night" />
                  {c.status === "booking" && (
                    <span className="absolute top-3 left-3 rounded-full bg-signal px-3 py-1 text-micro font-semibold text-night">
                      Booking
                    </span>
                  )}
                </Link>
                {/* HUD kaca yang melayang di sekitar mobil yang sedang tersorot */}
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
                </div>
              </li>
            ))}
          </ul>
        </div>
        </div>

      </div>

      {/* Info mobil yang sedang tersorot */}
      <div className="hero-info relative mx-auto -mt-6 w-full max-w-[1200px] px-5 md:px-10" aria-live="polite">
        <div className="flex items-end justify-between gap-4">
          <div key={car.id} className="roll-in min-w-0">
            <p className="text-micro text-steel">{car.brand}</p>
            <p className="wide truncate text-title leading-tight text-platinum">{car.model}</p>
          </div>
          <p className="tnum shrink-0 pb-0.5 text-body text-steel">
            <span className="text-platinum">{String(selected + 1).padStart(2, "0")}</span>
            <span className="mx-1.5">/</span>
            {String(cars.length).padStart(2, "0")}
          </p>
        </div>
        <div className="mt-2 flex items-center justify-between gap-4">
          <p key={car.id} className="roll-in tnum text-body text-steel" style={{ animationDelay: "60ms" }}>
            {car.year}
            <span className="mx-2 text-hairline">|</span>
            {kmCompact(car.mileageKm)} km
            <span className="mx-2 text-hairline">|</span>
            <span className="font-semibold text-platinum">{priceShort(car.price)}</span>
          </p>
          <span className="relative block h-[2px] w-16 shrink-0 overflow-hidden rounded-full bg-platinum/15">
            <span
              key={`${selected}-${playing}`}
              className="hero-progress absolute inset-0 origin-left bg-xenon"
              data-run={playing ? "" : undefined}
              style={{ "--rotate": `${ADVANCE_MS}ms` } as React.CSSProperties}
            />
          </span>
        </div>
      </div>

      <div className="hero-cta relative mx-auto mt-6 flex w-full max-w-[1200px] gap-3 px-5 pb-[max(22px,env(safe-area-inset-bottom))] md:px-10 md:pb-14">
        <StockLink />
        <PressLink
          href={waLink("Halo MS Garage, saya ingin tanya stok mobil.")}
          variant="icon"
          aria-label="Tanya via WhatsApp"
        >
          <IconWhatsApp width={22} height={22} />
        </PressLink>
      </div>

      <div data-header-sentinel className="absolute inset-x-0 bottom-0 h-px" />
    </section>
  );
}

function StockLink() {
  const ref = useRef<HTMLAnchorElement>(null);
  return (
    <a
      ref={ref}
      href="#stok"
      data-magnetic=""
      className="press sweep sweep-strong inline-flex min-h-[52px] flex-1 items-center justify-center rounded-full bg-xenon px-7 text-lead font-semibold text-xenon-ink md:flex-none"
      style={{ "--sweep-dur": "650ms" } as React.CSSProperties}
      onPointerDown={() => runSweep(ref.current)}
      onClick={(e) => {
        const target = document.getElementById("stok");
        if (!target) return;
        e.preventDefault();
        const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
        target.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
      }}
    >
      Lihat semua stok
    </a>
  );
}
