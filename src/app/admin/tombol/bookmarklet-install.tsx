"use client";

import { useEffect, useRef, useState } from "react";
import { bookmarkletHref } from "@/lib/olx/bookmarklet";

export function BookmarkletInstall() {
  const link = useRef<HTMLAnchorElement>(null);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const href = bookmarkletHref(location.origin);
    setCode(href);
    // React memblokir href "javascript:" di JSX, jadi dipasang langsung ke elemen.
    link.current?.setAttribute("href", href);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div>
      <h1 className="wide-section text-title text-platinum">Tombol &ldquo;Kirim ke MS Garage&rdquo;</h1>
      <p className="mt-2 max-w-[62ch] text-body text-steel">
        Tombol ini dipasang sekali sebagai bookmark. Setelah itu, setiap kali membuka iklan OLX MS Garage, ketuk tombolnya:
        foto, harga, dan deskripsi langsung masuk ke web. OLX tidak mengizinkan server mengambil halamannya, tapi browser Anda
        sendiri boleh, jadi tombol ini membaca data dari halaman yang sedang Anda buka.
      </p>

      <section className="mt-6 rounded-[18px] border border-hairline bg-cabin p-5">
        <h2 className="text-lead font-semibold text-platinum">Di laptop (Chrome)</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-body text-platinum/85">
          <li>Tampilkan bookmark bar: Cmd/Ctrl + Shift + B.</li>
          <li>Tarik tombol biru di bawah ini ke bookmark bar.</li>
          <li>Buka iklan OLX MS Garage, lalu klik bookmark itu.</li>
        </ol>
        <a
          ref={link}
          href="#"
          onClick={(e) => {
            e.preventDefault();
            alert("Tarik tombol ini ke bookmark bar, jangan diklik di sini.");
          }}
          className="mt-4 inline-flex h-11 cursor-grab items-center rounded-full bg-xenon px-5 text-body font-semibold text-xenon-ink"
        >
          Kirim ke MS Garage
        </a>
      </section>

      <section className="mt-4 rounded-[18px] border border-hairline bg-cabin p-5">
        <h2 className="text-lead font-semibold text-platinum">Di HP</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-body text-platinum/85">
          <li>Ketuk &ldquo;Salin kode tombol&rdquo; di bawah.</li>
          <li>Buat bookmark baru untuk halaman apa saja, beri nama <strong>Kirim ke MS Garage</strong>.</li>
          <li>Edit bookmark itu: hapus isi alamatnya (URL), tempel kode yang disalin, simpan.</li>
          <li>
            Saat membuka iklan OLX di browser (bukan aplikasi OLX): <strong>Android Chrome</strong> ketik &ldquo;Kirim ke MS&rdquo; di
            kolom alamat lalu pilih bookmark-nya; <strong>iPhone Safari</strong> buka menu Bookmark lalu ketuk.
          </li>
        </ol>
        <button
          type="button"
          onClick={copy}
          disabled={!code}
          className="press mt-4 inline-flex h-11 items-center rounded-full border border-hairline px-5 text-body font-medium text-platinum"
        >
          {copied ? "Kode tersalin" : "Salin kode tombol"}
        </button>
      </section>

      <p className="mt-4 text-micro text-steel">
        Hanya iklan dari akun OLX MS Garage yang bisa disimpan. Tidak ada data yang tersimpan sebelum Anda menekan
        &ldquo;Simpan ke web&rdquo; di halaman pratinjau.
      </p>
    </div>
  );
}
