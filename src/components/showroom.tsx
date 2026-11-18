import Image from "next/image";
import Link from "next/link";
import { Emblem } from "@/components/emblem";
import { IconPhone, IconPin, IconWhatsApp } from "@/components/icons";
import { PressLink } from "@/components/press";
import { SITE, telLink, waLink } from "@/lib/site";
import map from "../../public/img/peta-showroom.webp";

export function Showroom() {
  return (
    <section id="showroom" aria-labelledby="showroom-title" className="scroll-mt-[var(--header-h)] border-t border-hairline">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-16 md:grid-cols-2 md:items-center md:px-10 md:py-24">
        <div>
          <h2 id="showroom-title" className="wide-section text-title text-platinum md:text-display">
            Lihat langsung di showroom
          </h2>
          <p className="mt-4 max-w-[40ch] text-body text-steel">
            Foto tidak pernah cukup. Datang, buka pintunya, dengarkan mesinnya. Kabari kami dulu supaya unitnya sudah siap.
          </p>

          <address className="mt-8 not-italic">
            <p className="text-lead text-platinum">{SITE.address.street}</p>
            <p className="text-body text-steel">
              {SITE.address.area}, {SITE.address.city}
            </p>
          </address>

          <dl className="tnum mt-6 border-t border-hairline">
            {SITE.hours.map((h) => (
              <div key={h.days} className="flex justify-between border-b border-hairline py-3 text-body">
                <dt className="text-steel">{h.days}</dt>
                <dd className="text-platinum">{h.time}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex gap-3">
            <PressLink href={waLink("Halo MS Garage, saya ingin datang ke showroom.")} className="flex-1 md:flex-none">
              <IconWhatsApp width={20} height={20} />
              Tanya via WhatsApp
            </PressLink>
            <PressLink href={telLink()} variant="icon" aria-label="Telepon showroom">
              <IconPhone />
            </PressLink>
          </div>
        </div>

        <a
          href={SITE.mapsUrl}
          target="_blank"
          rel="noopener"
          className="press group relative block aspect-[3/2] overflow-hidden rounded-[18px] border border-hairline"
          aria-label="Buka petunjuk arah di Google Maps"
        >
          <Image src={map} alt="" fill sizes="(min-width: 768px) 560px, 100vw" className="object-cover" placeholder="blur" />
          <span className="absolute top-1/2 left-1/2 grid -translate-x-1/2 -translate-y-full place-items-center">
            <span className="grid size-11 place-items-center rounded-full bg-xenon text-xenon-ink shadow-[0_0_0_8px_rgb(168_216_255/0.16)]">
              <IconPin width={22} height={22} />
            </span>
          </span>
          <span className="absolute right-3 bottom-3 left-3 flex items-center justify-between">
            <span className="rounded-full bg-night/85 px-4 py-2 text-body font-medium text-platinum backdrop-blur">
              Petunjuk arah
            </span>
            <span className="text-[11px] text-steel/80">© OpenStreetMap</span>
          </span>
        </a>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 pt-10 pb-[max(40px,env(safe-area-inset-bottom))] md:flex-row md:items-center md:justify-between md:px-10">
        <div className="flex items-center gap-4">
          <Emblem className="w-12 text-platinum/80" />
          <p className="text-micro text-steel">
            {SITE.legalName}
            <br />{SITE.brand}
          </p>
        </div>
        <Link href="/kebijakan-privasi" className="text-micro text-steel underline-offset-4 hover:underline">
          Kebijakan privasi
        </Link>
      </div>
    </footer>
  );
}
