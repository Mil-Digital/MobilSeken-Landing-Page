import type { Metadata, Viewport } from "next";
import { Anybody, Instrument_Sans } from "next/font/google";
import { MotionProvider } from "@/components/motion-provider";
import { SITE } from "@/lib/site";
import "./globals.css";

const anybody = Anybody({
  variable: "--font-anybody",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  display: "swap",
});

const allowIndexing = process.env.ALLOW_INDEXING === "true";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.siteUrl),
  title: {
    default: `${SITE.brand} · Mobil bekas pilihan di Bandung`,
    template: `%s · ${SITE.brand}`,
  },
  description:
    "Koleksi mobil bekas pilihan di Bandung: Mercedes-Benz, MINI, BMW, Jeep, dan lainnya. Lihat foto lengkap, harga jelas, tanya langsung via WhatsApp.",
  robots: allowIndexing ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#10141b",
  colorScheme: "dark",
  viewportFit: "cover",
};

// Loader penuh hanya pada kunjungan pertama per sesi. Dijalankan sebelum paint agar tidak berkedip.
const introScript = `try{var s=sessionStorage,d=document.documentElement;if(s.getItem('ms-intro'))d.dataset.intro='skip';else s.setItem('ms-intro','1')}catch(e){document.documentElement.dataset.intro='skip'}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${anybody.variable} ${instrument.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: introScript }} />
        {/* Tanpa JS loader tidak pernah membuka hero: tampilkan langsung. */}
        <noscript>
          <style>{`.hero-meta,.hero-info,.hero-cta,.hero-lineup,.hero-line>span,.intro-follow{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <link rel="preload" href="/brand/emblem-sprite.svg" as="image" type="image/svg+xml" />
      </head>
      <body>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
