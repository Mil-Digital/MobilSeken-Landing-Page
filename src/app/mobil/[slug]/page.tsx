import { Odometer } from "@/components/odometer";
import { PageFlow } from "@/components/page-flow";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Gallery } from "@/components/detail/gallery";
import { KmGauge } from "@/components/detail/gauge";
import { ActionBar, Description, SimilarRow } from "@/components/detail/parts";
import { IconPhone, IconWhatsApp } from "@/components/icons";
import { PressLink } from "@/components/press";
import { SiteFooter } from "@/components/showroom";
import { allCarIds, carPath, carTitle, getCar, similarCars, type Car } from "@/lib/cars";
import { km, priceFull } from "@/lib/format";
import type { CardCar } from "@/lib/filters";
import { SITE, telLink, waLink } from "@/lib/site";

// URL kanonis diprerender lewat generateStaticParams (navigasi dari kartu tetap instan).
// URL dengan slug lama/tanpa slug butuh params saat request untuk redirect 308, jadi boleh blocking.
export const instant = false;

export async function generateStaticParams() {
  const ids = await allCarIds();
  return ids.map((c) => ({ slug: c.path.replace("/mobil/", "") }));
}

async function resolve(slug: string) {
  const match = /^(MS-\d{4})(?:-.*)?$/i.exec(slug);
  if (!match) return null;
  return getCar(match[1].toUpperCase());
}

export async function generateMetadata({ params }: PageProps<"/mobil/[slug]">): Promise<Metadata> {
  const car = await resolve((await params).slug);
  if (!car) return {};
  const title = carTitle(car);
  const available = car.status !== "sold";
  return {
    title,
    description: `${title}, ${km(car.mileageKm)}, ${car.transmission.toLowerCase()}. ${priceFull(car.price)}. Tanya langsung via WhatsApp.`,
    alternates: { canonical: carPath(car) },
    openGraph: { title, images: [car.images[0].src] },
    // Halaman terjual/tidak tersedia tidak diindeks.
    ...(available ? {} : { robots: { index: false, follow: false } }),
  };
}

const toCard = (c: Car): CardCar => ({
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
  images: c.images.slice(0, 1),
});

export default async function CarPage({ params }: PageProps<"/mobil/[slug]">) {
  const { slug } = await params;
  const car = await resolve(slug);
  if (!car) notFound();

  // ID adalah kunci; slug kosmetik. Slug salah → 308 ke URL kanonis.
  const canonical = carPath(car);
  if (`/mobil/${slug}` !== canonical) permanentRedirect(canonical);

  const similar = (await similarCars(car)).map(toCard);
  const title = carTitle(car);
  const url = `${SITE.siteUrl}${canonical}`;

  if (car.status === "sold") return <SoldView car={car} similar={similar} />;

  const waText = `Halo, saya tertarik dengan ${car.brand} ${car.model} ${car.year} (${car.id}). ${url}`;

  const instruments = [
    { label: "Tahun", value: String(car.year), roll: true, full: undefined },
    { label: "Transmisi", value: car.transmission, full: car.transmission, roll: false },
    { label: "Bahan bakar", value: car.fuel, full: undefined, roll: false },
  ];

  const specs = [
    { label: "Warna", value: car.color },
    { label: "Tipe bodi", value: car.bodyType },
    { label: "Kilometer", value: km(car.mileageKm) },
    ...car.specs,
    { label: "Kode unit", value: car.id },
  ];

  return (
    <>
      <PageFlow>
      <main className="pb-[calc(92px+env(safe-area-inset-bottom))] lg:pb-0">
        {/* HP: galeri → info → detail. Desktop: galeri & detail di kiri, info + tombol menempel di kanan. */}
        <div className="lg:mx-auto lg:grid lg:max-w-[1200px] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-x-12 lg:px-10 lg:pt-8">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <Gallery id={car.id} images={car.images} alt={title} />
        </div>

        <aside className="px-5 md:px-10 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start lg:px-0 lg:sticky lg:top-8">
          <header className="pt-7 lg:pt-0">
            <p className="text-lead text-steel">{car.brand}</p>
            <h1 className="hero-rise wide mt-1 text-display text-platinum md:text-hero">{car.model}</h1>
            <p className="mt-2 text-body text-steel">{car.variant}</p>
            <div className="mt-5 flex items-center gap-3">
              <p className="tnum text-title font-semibold text-platinum">
                <Odometer value={priceFull(car.price)} delay={250} stagger={45} />
              </p>
              {car.status === "booking" && (
                <span className="rounded-full bg-signal px-3 py-1 text-micro font-semibold text-[var(--signal-ink)]">Booking</span>
              )}
            </div>
          </header>

          {/* Panel instrumen: speedometer jarak tempuh + bacaan digital di sampingnya */}
          <div className="flow-reveal cluster tnum relative mt-7 grid grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] items-center gap-4 overflow-hidden rounded-[20px] border border-hairline bg-cabin/60 px-3 py-5 md:max-w-[640px] md:gap-8 md:px-8">
            <span aria-hidden className="cluster-glow pointer-events-none absolute inset-0" />
            <KmGauge km={car.mileageKm} label={km(car.mileageKm).replace(" km", "")} />
            <dl className="relative">
              <div className="sr-only">
                <dt>Kilometer</dt>
                <dd>{km(car.mileageKm)}</dd>
              </div>
              {instruments.map((it, i) => (
                <div key={it.label} className={`py-2.5 ${i ? "border-t border-hairline" : ""}`}>
                  <dt className="text-micro text-steel">{it.label}</dt>
                  <dd className="mt-0.5 truncate text-lead font-medium text-platinum" title={it.full}>
                    {it.roll ? <Odometer value={it.value} delay={500 + i * 120} /> : it.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Tombol kontak di panel (desktop); di HP memakai bar bawah */}
          <div className="mt-6 hidden gap-3 lg:flex">
            <PressLink href={waLink(waText)} className="flex-1">
              <IconWhatsApp width={20} height={20} />
              Tanya via WhatsApp
            </PressLink>
            <PressLink href={telLink()} variant="icon" aria-label="Telepon showroom">
              <IconPhone />
            </PressLink>
          </div>
          <p className="tnum mt-3 hidden text-micro text-steel lg:block">Kode unit {car.id} · sebutkan saat menghubungi kami</p>
        </aside>

        <div className="min-w-0 px-5 md:px-10 lg:col-start-1 lg:row-start-2 lg:px-0">
          <section className="flow-reveal mt-10" aria-labelledby="desc-title">
            <h2 id="desc-title" className="sr-only">
              Deskripsi
            </h2>
            <Description text={car.description} />
          </section>

          <section className="mt-12" aria-labelledby="spec-title">
            <h2 id="spec-title" className="flow-mask wide-section text-title text-platinum">
              Spesifikasi
            </h2>
            <dl className="tnum mt-4 border-t border-hairline">
              {specs.map((s) => (
                <div key={s.label} className="flow-row flex justify-between gap-6 border-b border-hairline py-3.5 text-body">
                  <dt className="shrink-0 text-steel">{s.label}</dt>
                  <dd className="text-right text-platinum">{s.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
        </div>

        <div className="mx-auto max-w-[1200px] px-5 md:px-10">
          {similar.length > 0 && (
            <section className="mt-14 mb-14" aria-labelledby="similar-title">
              <h2 id="similar-title" className="flow-mask wide-section mb-5 text-title text-platinum">
                Mobil serupa
              </h2>
              <SimilarRow cars={similar} />
            </section>
          )}
        </div>
        <SiteFooter />
      </main>
      </PageFlow>

      <ActionBar waHref={waLink(waText)} telHref={telLink()} />
    </>
  );
}

function SoldView({ car, similar }: { car: Car; similar: CardCar[] }) {
  const name = `${car.brand} ${car.model} ${car.year}`;
  return (
    <PageFlow>
    <main>
      <div className="relative">
        <Gallery id={car.id} images={car.images} alt={name} dim />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto max-w-[1200px] px-5 pb-6 md:px-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-sold/60 bg-black/55 px-3 py-1 text-micro font-semibold text-white backdrop-blur">
            <span className="size-1.5 rounded-full bg-sold" />
            Terjual
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-5 md:px-10">
        <header className="pt-8">
          <p className="text-body text-steel">{name}</p>
          <h1 className="wide-section mt-2 text-display text-platinum">Mobil ini sudah terjual</h1>
          <p className="mt-4 max-w-[46ch] text-body text-steel">
            Unit ini sudah menemukan pemilik barunya. Masih ada pilihan serupa di bawah, atau ceritakan mobil yang kamu cari ke tim kami.
          </p>
          <PressLink
            href={waLink(`Halo, saya lihat ${name} (${car.id}) sudah terjual. Ada unit serupa?`)}
            className="mt-7 w-full md:w-auto"
          >
            <IconWhatsApp width={20} height={20} />
            Tanya unit serupa
          </PressLink>
        </header>

        {similar.length > 0 && (
          <section className="mt-14 mb-16" aria-labelledby="similar-title">
            <h2 id="similar-title" className="flow-mask wide-section mb-5 text-title text-platinum">
              Masih tersedia
            </h2>
            <SimilarRow cars={similar} />
          </section>
        )}
      </div>
      <SiteFooter />
    </main>
    </PageFlow>
  );
}
