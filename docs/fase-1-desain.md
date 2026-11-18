# Fase 1 — Rencana desain "studio malam"

## Palet
Logo emblem MS (laurel + M|S) monokrom, tanpa warna brand kuat → palet brief dipakai apa adanya:
`--night #10141B`, `--cabin #181E27`, `--panel #222A35`, `--platinum #E6EAF0`, `--steel #8E99A8`,
aksen `--xenon #A8D8FF`, `--signal #F5B544` (Booking), `--sold #E5484D`. Dark-only.

## Tipografi
- Anybody (variable, wdth): nama mobil wdth 132, judul section wdth 112 (agar muat 1 baris di 390px).
- Instrument Sans: body/UI/angka, `tabular-nums`.
- Skala: 13 / 15 / 17 / 22 / 32 / 48 (token `text-micro…text-hero`).

## Momen gerak
1. Loader (kunjungan pertama per sesi): emblem berputar seperti koin, kilau xenon menyapu bentuk emblem,
   lalu emblem terbang ke posisi logo header; tirai hero terbuka + light sweep + judul melebar (wdth 92→132).
   Min ~950 ms, maks 1,5 dtk, failsafe CSS 2,5 dtk tanpa JS.
2. Kartu → detail: shared element (React `<ViewTransition>`), blur tipis di tengah morph.
3. Chip merek: pil aktif bergeser (layoutId), grid menata ulang dengan spring.
4. Bottom sheet filter: ditarik dari pegangan, spring, latar redup + blur.
5. Galeri layar penuh: geser, cubit zoom, ketuk dua kali, geser ke bawah untuk tutup.
6. Tombol: skala 0,97 dengan pantulan; tombol utama memunculkan light sweep.

## Kritik diri (yang sudah diubah)
- Hero awal memakai foto lanskap 100svh → di HP hanya terlihat kap mesin. Diubah: foto mengisi 66% atas
  lalu melebur ke latar, dan hero memakai foto tampak depan yang simetris.
- Judul "Stok tersedia" pecah dua baris → wdth judul section diturunkan ke 112.
- Tidak ada kartu SaaS (tanpa bayangan/kotak); info kartu langsung di latar, dipisah garis rambut.

## Data dummy
6 mobil dari stok di website lama (nama, tahun, km, harga, spesifikasi, foto milik showroom, disimpan lokal).
KIA Seltos dijadikan contoh status terjual, Jeep Wrangler contoh Booking.

## Placeholder yang menunggu konfirmasi
`TODO_JAM_BUKA`, `TODO_NOMOR_TELEPON` (sementara = nomor WA), `TODO_LINK_GOOGLE_MAPS`, `TODO_INSTAGRAM`.

## Revisi 1 (18 Nov 2026): hero jadi pembuka showroom

Masukan pemilik: hero yang langsung menampilkan satu mobil terasa seperti iklan satu unit, bukan beranda.

- Hero sekarang: judul "Mobil seken pilihan di Bandung", jumlah unit tersedia (dihitung dari data), alamat dan jam buka 08.00–17.00.
- Di bawahnya: deretan seluruh stok (unggulan di depan) sebagai kartu potret yang bergeser pelan otomatis (Embla + AutoScroll). Bisa digeser dan diketuk ke detail. Gerak berhenti saat hero tidak terlihat, tab tersembunyi, atau gerak dikurangi.
- Tombol "Lihat semua stok" menggulir ke daftar. WhatsApp tersedia sebagai tombol ikon.
- Di HP, hero tidak lagi dipaksa setinggi layar, sehingga bar merek di bawahnya ikut terlihat sebagai ajakan scroll.
- Urutan loader: emblem terbang ke header, judul melebar, deretan mobil masuk dari kanan, lalu tombol dan bar merek muncul.
- Data dari pemilik: jam 08.00–17.00 dan link Google Maps resmi. Palet xenon disetujui.
- Screenshot terbaru: screenshots/fase-1b/.

## Revisi 2 (18 Nov 2026): pembuka lebih elegan

Masukan pemilik: pembuka "kurang elegan" (judul 4 baris terlalu besar, kartu terpotong di kiri).

- Judul hero lebih kecil dan tenang: 2 baris, dua warna ("Mobil seken pilihan" platinum, "di Bandung." steel), Anybody wdth 112 berat 520.
- Satu baris info: jumlah unit dan jam buka. Alamat cukup di bagian showroom.
- Deretan stok tidak lagi bergeser terus. Berpindah satu mobil tiap 4,8 dtk dan selalu berhenti sejajar dengan teks (tidak ada kartu terpotong di kiri).
- Efek "lampu studio": mobil aktif terang, sisanya redup dan kurang saturasi.
- Nama dan harga dipindah ke bawah foto seperti label galeri, tidak lagi menimpa foto.
- Judul section ("Stok tersedia", "Lihat langsung di showroom") jadi 22px di HP dengan berat yang sama, supaya tidak lebih besar daripada judul hero.
- Screenshot: screenshots/fase-1c/ (termasuk 02-hero-360.png untuk HP 360px).
