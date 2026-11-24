import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  devIndicators: false,
  // Uji langsung di HP lewat IP laptop di Wi-Fi yang sama (hanya berlaku saat `pnpm dev`).
  allowedDevOrigins: ["192.168.*.*"],
  // Katalog mobil (hasil impor OLX) dibaca dari disk; pastikan ikut ke setiap fungsi server di Vercel.
  outputFileTracingIncludes: {
    "/*": ["./content/catalog/**/*.json"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 85],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
