import Image from "next/image";
import Link from "next/link";
import { Emblem } from "@/components/emblem";
import { IconPhone, IconPin, IconWhatsApp } from "@/components/icons";
import { PressLink } from "@/components/press";
import { SITE, telLink, waLink } from "@/lib/site";
import map from "../../public/img/peta-showroom-terang.webp";

export function Showroom() {
  return (
    <section id="showroom" data-track-area="showroom" aria-labelledby="showroom-title" className="flow-divider scroll-mt-[var(--header-h)] border-t border-hairline">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-16 md:grid-cols-2 md:items-center md:px-10 md:py-24">
        <div>
          <h2 id="showroom-title" className="flow-mask wide-section text-title text-platinum md:text-display">
            Lihat langsung di showroom
          </h2>
          <p className="flow-reveal mt-4 max-w-[40ch] text-body text-steel">
            Foto tidak pernah cukup. Datang, buka pintunya, dengarkan mesinnya. Kabari kami dulu supaya unitnya sudah siap.
          </p>

          <address className="flow-reveal mt-8 not-italic">
            <p className="text-lead text-platinum">{SITE.address.street}</p>
            <p className="text-body text-steel">
              {SITE.address.area}, {SITE.address.city}
            </p>
          </address>

          <dl className="tnum mt-6 border-t border-hairline">
            {SITE.hours.map((h) => (
              <div key={h.days} className="flow-row flex justify-between border-b border-hairline py-3 text-body">
                <dt className="text-steel">{h.days}</dt>
                <dd className="text-platinum">{h.time}</dd>
              </div>
            ))}
          </dl>

          <div className="flow-reveal mt-8 flex gap-3">
            <PressLink variant="wa" href={waLink("Halo MS Garage, saya ingin datang ke showroom.")} className="flex-1 md:flex-none">
              <IconWhatsApp width={20} height={20} />
              Tanya via WhatsApp
            </PressLink>
            <PressLink href={telLink()} variant="icon" aria-label="Telepon showroom">
              <IconPhone />
            </PressLink>
          </div>
        </div>

        {/* Peta sebagai bidang 3D: miring seperti dilihat dari udara, menegak saat discroll/disentuh.
            Pin berdiri di atas bidang dengan gelombang radar di lantai peta. */}
        <div className="map-stage">
          <a
            href={SITE.mapsUrl}
            target="_blank"
            rel="noopener"
            className="map-3d group relative block aspect-[3/2]"
            aria-label="Buka petunjuk arah di Google Maps"
          >
            <span className="map-plane absolute inset-0 overflow-hidden rounded-[18px] border border-hairline">
              <Image src={map} alt="" fill sizes="(min-width: 768px) 560px, 100vw" className="object-cover" placeholder="blur" />
              <span aria-hidden className="map-tint absolute inset-0" />
              <span aria-hidden className="map-scan absolute inset-y-0 w-1/3" />
              <span aria-hidden className="map-radar absolute top-1/2 left-1/2" />
              <span aria-hidden className="map-radar absolute top-1/2 left-1/2 [animation-delay:-1.3s]" />
            </span>
            <span className="map-pin absolute top-[57%] left-1/2 grid place-items-center">
              <span className="grid size-11 place-items-center rounded-full bg-xenon text-xenon-ink shadow-[0_0_0_8px_rgb(168_216_255/0.16),0_18px_30px_-8px_rgb(0_0_0/0.7)]">
                <IconPin width={22} height={22} />
              </span>
              <span aria-hidden className="map-pin-stem" />
            </span>
            <span className="absolute right-3 bottom-3 left-3 flex items-center justify-between">
              <span className="rounded-full bg-night/85 px-4 py-2 text-body font-medium text-platinum backdrop-blur">
                Petunjuk arah
              </span>
              <span className="text-[11px] text-steel/80">© OpenStreetMap</span>
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer data-track-area="footer" className="flow-divider border-t border-hairline">
      <div className="flow-reveal mx-auto flex max-w-[1200px] flex-col gap-6 px-5 pt-10 pb-[max(40px,env(safe-area-inset-bottom))] md:flex-row md:items-center md:justify-between md:px-10">
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
