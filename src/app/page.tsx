import { CarBrowser } from "@/components/home/car-browser";
import { BrandMarquee } from "@/components/home/brand-marquee";
import { FloatingWa } from "@/components/home/floating-wa";
import { Hero, type LineupCar } from "@/components/home/hero";
import { Intro } from "@/components/home/intro";
import { SiteHeader } from "@/components/home/site-header";
import { Showroom, SiteFooter } from "@/components/showroom";
import { carPath, listCars, type Car } from "@/lib/cars";
import type { CardCar } from "@/lib/filters";

// Fase 1: foto & titik fokus untuk kartu potret di deretan hero dipilih manual.
// Fase 2+: foto pertama + titik fokus bisa diatur dari back office.
const LINEUP_PICK: Record<string, { image: number; focus: string }> = {
  "MS-0001": { image: 0, focus: "36% 62%" },
  "MS-0002": { image: 0, focus: "42% 62%" },
  "MS-0003": { image: 0, focus: "34% 62%" },
  "MS-0004": { image: 0, focus: "48% 64%" },
  "MS-0005": { image: 0, focus: "40% 64%" },
};

export default async function Home() {
  const cars = await listCars();

  // Unggulan di depan, sisanya mengikuti urutan terbaru.
  const lineup: LineupCar[] = [...cars]
    .sort((a, b) => Number(b.featured) - Number(a.featured))
    .map((c) => {
      const pick = LINEUP_PICK[c.id] ?? { image: 0, focus: "50% 60%" };
      return {
        id: c.id,
        path: carPath(c),
        brand: c.brand,
        model: c.model,
        year: c.year,
        price: c.price,
        mileageKm: c.mileageKm,
        transmission: c.transmission,
        status: c.status,
        image: c.images[pick.image],
        focus: pick.focus,
      };
    });

  const brands = [...new Set(cars.map((c) => c.brand))]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ name, count: cars.filter((c) => c.brand === name).length }));

  const cards: CardCar[] = cars.map((c: Car) => ({
    id: c.id,
    path: carPath(c),
    brand: c.brand,
    model: c.model,
    variant: c.variant,
    year: c.year,
    price: c.price,
    mileageKm: c.mileageKm,
    transmission: c.transmission,
    status: c.status,
    createdAt: c.createdAt,
    images: c.images.slice(0, 3),
  }));

  return (
    <>
      <Intro />
      <SiteHeader />
      <main>
        <Hero cars={lineup} total={cars.length} />
        <BrandMarquee brands={brands} />
        <CarBrowser cars={cards} />
        <Showroom />
      </main>
      <SiteFooter />
      <FloatingWa />
    </>
  );
}
