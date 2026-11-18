"use client";

import useEmblaCarousel from "embla-carousel-react";
import { AnimatePresence, animate, useMotionValue, useTransform, type PanInfo } from "motion/react";
import * as m from "motion/react-m";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconClose } from "@/components/icons";
import type { CarImage } from "@/lib/cars";

/** Galeri layar penuh: geser kiri/kanan, cubit untuk zoom, ketuk dua kali, geser ke bawah untuk menutup. */
export function Viewer({
  images,
  alt,
  openAt,
  onClose,
}: {
  images: CarImage[];
  alt: string;
  openAt: number | null;
  onClose: (lastIndex: number) => void;
}) {
  const open = openAt !== null;
  return createPortal(
    <AnimatePresence>
      {open && <ViewerInner key="viewer" images={images} alt={alt} start={openAt} onClose={onClose} />}
    </AnimatePresence>,
    document.body,
  );
}

function ViewerInner({
  images,
  alt,
  start,
  onClose,
}: {
  images: CarImage[];
  alt: string;
  start: number;
  onClose: (lastIndex: number) => void;
}) {
  const [viewport, api] = useEmblaCarousel({ startIndex: start, loop: false });
  const [index, setIndex] = useState(start);
  const [zoomed, setZoomed] = useState(false);
  const y = useMotionValue(0);
  const bg = useTransform(y, [-300, 0, 300], [0.2, 1, 0.2]);
  const scale = useTransform(y, [-300, 0, 300], [0.86, 1, 0.86]);

  useEffect(() => {
    if (!api) return;
    const on = () => setIndex(api.selectedScrollSnap());
    api.on("select", on);
    return () => {
      api.off("select", on);
    };
  }, [api]);

  useEffect(() => {
    api?.reInit({ watchDrag: !zoomed });
  }, [api, zoomed]);

  const close = useCallback(() => onClose(index), [onClose, index]);

  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") api?.scrollNext();
      if (e.key === "ArrowLeft") api?.scrollPrev();
    };
    window.addEventListener("keydown", key);
    return () => {
      html.style.overflow = prev;
      window.removeEventListener("keydown", key);
    };
  }, [api, close]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.y) > 120 || Math.abs(info.velocity.y) > 700) close();
    else animate(y, 0, { type: "spring", stiffness: 500, damping: 40 });
  };

  return (
    <m.div
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-label="Foto layar penuh"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <m.div className="absolute inset-0 bg-black" style={{ opacity: bg }} />

      <m.div
        className="absolute inset-0"
        style={{ y, scale }}
        drag={zoomed ? false : "y"}
        dragDirectionLock
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.9}
        onDragEnd={onDragEnd}
      >
        <div ref={viewport} className="h-full overflow-hidden">
          <div className="flex h-full">
            {images.map((img, i) => (
              <div key={img.src} className="relative h-full min-w-0 flex-[0_0_100%]">
                <Zoomable active={i === index} onZoom={setZoomed}>
                  <Image
                    src={img.src}
                    alt={i === 0 ? alt : ""}
                    fill
                    sizes="100vw"
                    quality={85}
                    className="object-contain"
                    placeholder="blur"
                    blurDataURL={img.blurDataURL}
                    draggable={false}
                    loading={Math.abs(i - start) <= 1 ? "eager" : "lazy"}
                  />
                </Zoomable>
              </div>
            ))}
          </div>
        </div>
      </m.div>

      <div
        className="absolute inset-x-0 top-0 flex items-center justify-between px-3"
        style={{ paddingTop: "max(8px, env(safe-area-inset-top))" }}
      >
        <span className="tnum px-3 text-body text-platinum/85">
          {index + 1}/{images.length}
        </span>
        <button
          type="button"
          onClick={close}
          aria-label="Tutup"
          className="press grid size-11 place-items-center rounded-full bg-white/10 text-platinum backdrop-blur-md"
        >
          <IconClose />
        </button>
      </div>
    </m.div>
  );
}

/** Pinch-to-zoom + geser + ketuk dua kali, hanya transform (GPU). */
function Zoomable({
  active,
  onZoom,
  children,
}: {
  active: boolean;
  onZoom: (z: boolean) => void;
  children: React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const s = useMotionValue(1);
  const x = useMotionValue(0);
  const yv = useMotionValue(0);
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; s: number; mx: number; my: number; x: number; y: number } | null>(null);
  const lastTap = useRef(0);

  const clampPan = useCallback(
    (sc: number) => {
      const el = box.current;
      if (!el) return;
      const maxX = ((sc - 1) * el.clientWidth) / 2;
      const maxY = ((sc - 1) * el.clientHeight) / 2;
      x.set(Math.max(-maxX, Math.min(maxX, x.get())));
      yv.set(Math.max(-maxY, Math.min(maxY, yv.get())));
    },
    [x, yv],
  );

  const reset = useCallback(() => {
    const sp = { type: "spring", stiffness: 420, damping: 38 } as const;
    animate(s, 1, sp);
    animate(x, 0, sp);
    animate(yv, 0, sp);
    onZoom(false);
  }, [s, x, yv, onZoom]);

  useEffect(() => {
    if (!active && s.get() !== 1) reset();
  }, [active, reset, s]);

  const zoomTo = (sc: number, cx: number, cy: number) => {
    const el = box.current!;
    const r = el.getBoundingClientRect();
    const ox = cx - (r.left + r.width / 2);
    const oy = cy - (r.top + r.height / 2);
    const sp = { type: "spring", stiffness: 380, damping: 36 } as const;
    animate(s, sc, sp);
    animate(x, -ox * (sc - 1), sp);
    animate(yv, -oy * (sc - 1), sp);
    onZoom(sc > 1);
  };

  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

  return (
    <div
      ref={box}
      className="absolute inset-0 touch-none overflow-hidden"
      onPointerDown={(e) => {
        pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.current.size === 2) {
          const [a, b] = [...pts.current.values()];
          pinch.current = { d: dist(a, b), s: s.get(), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, x: x.get(), y: yv.get() };
          onZoom(true);
          e.stopPropagation();
        } else if (s.get() > 1) {
          e.stopPropagation();
        }
        // ketuk dua kali
        const now = performance.now();
        if (pts.current.size === 1 && now - lastTap.current < 280) {
          if (s.get() > 1.05) reset();
          else zoomTo(2.5, e.clientX, e.clientY);
          lastTap.current = 0;
        } else lastTap.current = now;
      }}
      onPointerMove={(e) => {
        const prev = pts.current.get(e.pointerId);
        if (!prev) return;
        pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.current.size === 2 && pinch.current) {
          const [a, b] = [...pts.current.values()];
          const p = pinch.current;
          const ns = Math.max(1, Math.min(4, (p.s * dist(a, b)) / p.d));
          s.set(ns);
          x.set(p.x + ((a.x + b.x) / 2 - p.mx));
          yv.set(p.y + ((a.y + b.y) / 2 - p.my));
          clampPan(ns);
          e.stopPropagation();
        } else if (pts.current.size === 1 && s.get() > 1) {
          x.set(x.get() + e.clientX - prev.x);
          yv.set(yv.get() + e.clientY - prev.y);
          clampPan(s.get());
          e.stopPropagation();
        }
      }}
      onPointerUp={(e) => {
        pts.current.delete(e.pointerId);
        if (pts.current.size < 2) pinch.current = null;
        if (pts.current.size === 0 && s.get() < 1.04) reset();
      }}
      onPointerCancel={(e) => {
        pts.current.delete(e.pointerId);
        pinch.current = null;
      }}
    >
      <m.div className="absolute inset-0 will-change-transform" style={{ scale: s, x, y: yv }}>
        {children}
      </m.div>
    </div>
  );
}
