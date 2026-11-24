import type { Metadata } from "next";
import Link from "next/link";
import { PageFlow } from "@/components/page-flow";
import { SiteFooter } from "@/components/showroom";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Kebijakan privasi" };

// DRAF: wajib ditinjau pemilik (dan sebaiknya penasihat hukum) sebelum rilis. Mengacu UU No. 27/2022 (UU PDP).
export default function Privacy() {
  return (
    <>
      <PageFlow>
      <main className="mx-auto max-w-[680px] px-5 pt-[max(24px,env(safe-area-inset-top))] pb-20">
        <Link href="/" className="press -ml-2 inline-flex min-h-11 items-center px-2 text-body text-steel">
          Kembali ke beranda
        </Link>
        <h1 className="flow-mask wide-section mt-6 text-display text-platinum"><span>Kebijakan privasi</span></h1>
        <p className="mt-3 text-micro text-signal">Draf, menunggu tinjauan pemilik.</p>

        <div className="mt-10 space-y-8 text-body text-platinum/85 [&_h2]:mb-3 [&_h2]:text-title [&_h2]:text-platinum [&_h2]:wide-section">
          <section className="flow-reveal">
            <h2>Siapa kami</h2>
            <p>
              Situs ini dikelola oleh {SITE.legalName} ({SITE.brand}), {SITE.address.street}, {SITE.address.area},{" "}
              {SITE.address.city}.
            </p>
          </section>
          <section className="flow-reveal">
            <h2>Data yang kami kumpulkan</h2>
            <p>
              Kami tidak meminta kamu mengisi formulir. Saat kamu membuka situs ini, kami dan mitra iklan kami dapat mencatat
              data teknis: halaman yang dilihat, mobil yang dibuka, tombol yang ditekan (misalnya WhatsApp atau telepon),
              alamat IP, jenis perangkat dan peramban, serta parameter kampanye iklan (UTM, fbclid).
            </p>
          </section>
          <section className="flow-reveal">
            <h2>Cookie dan Meta Pixel</h2>
            <p>
              Kami memakai penyimpanan peramban pihak pertama (cookie/local storage) berisi kode acak untuk menghitung
              kunjungan dan mengingat sumber kunjungan, serta Meta Pixel dan
              Conversions API untuk mengukur hasil iklan dan menampilkan iklan yang relevan di Facebook dan Instagram.
              Data dikirim ke Meta Platforms dalam bentuk teknis dan tidak berisi nama atau nomor telepon kamu.
            </p>
          </section>
          <section className="flow-reveal">
            <h2>Untuk apa data dipakai</h2>
            <p>
              Mengukur efektivitas iklan, menampilkan kembali mobil yang pernah kamu lihat, dan memperbaiki situs. Kami tidak
              menjual data pribadi.
            </p>
          </section>
          <section className="flow-reveal">
            <h2>Hak kamu</h2>
            <p>
              Sesuai UU Pelindungan Data Pribadi, kamu berhak meminta akses, koreksi, atau penghapusan data, dan menarik
              persetujuan. Kamu juga bisa menghapus cookie lewat pengaturan peramban dan mengatur preferensi iklan di akun
              Meta kamu. Hubungi kami lewat WhatsApp untuk permintaan terkait data.
            </p>
          </section>
          <section className="flow-reveal">
            <h2>Perubahan</h2>
            <p>Kebijakan ini dapat diperbarui. Versi terbaru selalu tersedia di halaman ini.</p>
          </section>
        </div>
      </main>
      </PageFlow>
      <SiteFooter />
    </>
  );
}
