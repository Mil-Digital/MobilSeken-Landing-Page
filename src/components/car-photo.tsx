"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import type { CarImage } from "@/lib/cars";

/** Foto dengan blur placeholder yang memudar ke foto tajam. Wadah menentukan ukuran (fill). */
export function CarPhoto({
  image,
  alt,
  sizes,
  hero = false,
  className = "",
  imgClassName = "",
  objectPosition,
  onReady,
}: {
  image: CarImage;
  alt: string;
  sizes: string;
  /** Foto LCP: dimuat segera dan tidak disembunyikan menunggu hidrasi. */
  hero?: boolean;
  className?: string;
  imgClassName?: string;
  objectPosition?: string;
  onReady?: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const done = useCallback(() => {
    setLoaded(true);
    onReady?.();
  }, [onReady]);
  // Foto yang sudah termuat sebelum hidrasi tidak memicu onLoad lagi.
  const ref = useCallback(
    (el: HTMLImageElement | null) => {
      if (el?.complete && el.naturalWidth > 0) done();
    },
    [done],
  );

  return (
    <div
      className={`absolute inset-0 overflow-hidden bg-cabin ${className}`}
      style={{
        backgroundImage: `url(${image.blurDataURL})`,
        backgroundSize: "cover",
        backgroundPosition: objectPosition ?? "center",
      }}
    >
      <Image
        ref={ref}
        src={image.src}
        alt={alt}
        fill
        sizes={sizes}
        preload={hero}
        fetchPriority={hero ? "high" : undefined}
        loading={hero ? "eager" : "lazy"}
        draggable={false}
        onLoad={done}
        className={`object-cover select-none ${
          hero ? "" : `transition-opacity duration-500 ease-out ${loaded ? "opacity-100" : "opacity-0"}`
        } ${imgClassName}`}
        style={objectPosition ? { objectPosition } : undefined}
      />
    </div>
  );
}
