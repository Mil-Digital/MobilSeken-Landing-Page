# Brief Proyek: Landing Page Iklan Mobil Seken Bandung

Dokumen ini adalah spesifikasi lengkap untuk membangun landing page iklan + back office + sinkronisasi data mobil dari OLX. Baca seluruh dokumen sebelum menulis kode.

## 0. Cara kerja untuk Claude Code

- Kerjakan per fase (lihat bagian 14). Di akhir setiap fase, **berhenti dan minta review** sebelum lanjut. Fase desain wajib disertai screenshot di viewport 390×844.
- Jangan mengarang data bisnis (nomor WA, alamat, harga, nama brand). Kalau belum ada, pakai placeholder yang jelas (`TODO_NOMOR_WA`) dan tanyakan.
- Pemilik proyek **sangat ketat soal tampilan**. Kualitas visual dan animasi adalah prioritas setara dengan fungsi. Lebih baik sedikit elemen yang sempurna daripada banyak elemen yang biasa.
- Utamakan mobile. Mayoritas pengunjung datang dari iklan Instagram dan membuka halaman di in-app browser Instagram (iOS dan Android).
- Website lama (https://www.mobilsekenbandung.com/, dibangun di Wix) **hanya referensi aset**: ambil logo, nama brand, alamat, kontak, dan warna brand. Jangan meniru layout atau gayanya. Website baru harus terasa futuristik, mahal, dan jauh lebih premium.

## 1. Konteks dan tujuan

Showroom mobil bekas premium di Bandung (stok didominasi Mercedes-Benz, MINI, VW Golf GTI, Abarth, BMW, Lexus, Mazda, Mitsubishi, dll). Selama ini iklan Meta diarahkan ke website Wix, tetapi tracking Pixel tidak stabil dan data remarketing kacau setiap ada mobil baru.

Tujuan proyek:

1. **Landing page khusus iklan** yang menjadi tujuan semua iklan berbayar, dengan tracking yang bersih dan stabil (Meta Pixel + Conversions API).
2. **Satu sumber data**: tim showroom cukup mengisi Google Sheet berisi link iklan OLX. Sistem mengambil detail mobil (foto, harga, deskripsi, spesifikasi) dari link tersebut, menyimpannya ke database sendiri, dan menampilkannya di landing page.
3. **Feed Meta Catalog** otomatis dari database yang sama, untuk iklan dinamis (retargeting per mobil).
4. **Back office** di alamat terpisah untuk memicu sinkronisasi, melihat status, dan mengoreksi data.
5. Mobil yang terjual otomatis hilang dari landing page dan feed.

Website Wix tetap berjalan seperti biasa; proyek ini tidak menyentuhnya.

## 2. Input yang perlu disiapkan pemilik proyek

Tanyakan item yang belum tersedia sebelum fase yang membutuhkannya:

- [ ] File logo resolusi tinggi, idealnya **SVG** (dibutuhkan untuk loader logo berputar). Jika hanya ada PNG, coba ambil dari website lama, lalu konfirmasi.
- [ ] Nomor WhatsApp sales (satu atau beberapa, untuk rotasi jika perlu) dan nomor telepon.
- [ ] Alamat showroom, link Google Maps, jam buka, akun Instagram.
- [ ] Domain/subdomain untuk publik dan admin (contoh: `promo.mobilsekenbandung.com` dan `admin.mobilsekenbandung.com`).
- [ ] 3–5 contoh link iklan OLX milik showroom (untuk membangun dan menguji parser).
- [ ] Google Sheet ID dan akses service account.
- [ ] Meta Pixel ID, Conversions API access token, dan test event code.
- [ ] Jenis katalog Meta yang dipakai: `vehicle` (jika tersedia untuk akun Indonesia) atau `product`.
- [ ] Daftar email yang boleh masuk back office.

## 3. Arsitektur dan stack

| Bagian | Pilihan |
|---|---|
| Framework | Next.js (App Router, versi stabil terbaru), TypeScript strict |
| Styling | Tailwind CSS + CSS variables untuk design tokens |
| Animasi | `motion` (Framer Motion) untuk interaksi dan transisi; CSS untuk animasi sederhana |
| Galeri swipe | Embla Carousel atau gesture `motion` dengan spring physics |
| Database | Neon Postgres + Drizzle ORM + drizzle-kit migrations |
| Storage foto | Cloudflare R2 (S3 compatible, tanpa biaya egress) dengan custom domain. Alternatif: Vercel Blob |
| Pemrosesan foto | `sharp` saat sinkronisasi (bukan saat request) |
| Parsing OLX | `fetch` + `cheerio`, prioritaskan data terstruktur (JSON-LD / JSON yang tertanam) |
| Google Sheet | `googleapis` dengan service account (baca dan tulis) |
| Auth admin | Auth.js dengan Google sign-in + allowlist email |
| Hosting | Vercel, termasuk Vercel Cron |
| Testing | Vitest (unit, parser), Playwright (e2e di viewport mobile) |

Alur data:

```
Google Sheet (tim isi link OLX + status)
        │  sinkron (tombol admin / cron / webhook dari Apps Script)
        ▼
Parser OLX ──► foto diproses sharp ──► R2
        │
        ▼
Neon Postgres (sumber data utama)
   ├──► Landing page publik
   ├──► Feed Meta Catalog (/feed/meta.csv)
   └──► Tulis balik status sinkron ke Sheet
```

## 4. Domain dan routing

Satu aplikasi Next.js, dua alamat:

- **Publik**: `PUBLIC_HOST` (contoh `promo.mobilsekenbandung.com`)
- **Admin**: `ADMIN_HOST` (contoh `admin.mobilsekenbandung.com`)

Gunakan middleware berbasis host untuk me-rewrite request admin ke route group `(admin)`. Route admin tidak boleh bisa diakses dari host publik dan sebaliknya. Di development, admin bisa diakses lewat `/admin`.

URL publik:

- `/` — beranda dengan daftar mobil
- `/mobil/[id]-[slug]` — detail mobil, contoh `/mobil/MS-0001-mercedes-a200-progressive-2019`. **ID adalah kunci**; slug hanya kosmetik. Jika slug berubah, redirect 308 ke slug yang benar.
- `/kebijakan-privasi`
- `/feed/meta.csv` — feed katalog (lihat bagian 12)

Indexing mesin pencari: default `noindex` lewat env `ALLOW_INDEXING=false`, supaya tidak bersaing dengan website utama. Bisa diubah nanti.

## 5. Google Sheet

Buat tab baru bernama **`Katalog LP`** di spreadsheet yang ditentukan. Tab lain jangan diubah.

### Kolom yang diisi tim showroom

| Kolom | Isi | Catatan |
|---|---|---|
| ID | Kosongkan | **Diisi otomatis oleh sistem** (format `MS-0001`). Tim tidak boleh mengubah. |
| Plat | `D 1164 MMA` | Referensi internal, tidak tampil di website |
| Nama Mobil | `Mercy A200 Progressive` | Nama internal; judul publik diambil dari OLX |
| Link OLX | URL iklan OLX | Wajib |
| Status | Dropdown: `Ready` / `Booking` / `Sold` | Sama dengan istilah yang sudah dipakai tim |
| Tampilkan di LP | Checkbox | Centang agar tampil |
| Unggulan | Checkbox | Tampil di posisi atas / hero |
| Override Harga | Angka, opsional | Mengalahkan harga dari OLX |
| Catatan Internal | Teks bebas | Tidak tampil di website |

### Kolom yang diisi sistem (beri warna abu-abu, protected range)

| Kolom | Isi |
|---|---|
| Status Sinkron | `OK`, `Gagal`, `Iklan OLX tidak aktif`, `Menunggu` |
| Pesan | Penjelasan singkat dalam bahasa Indonesia jika ada masalah, plus apa yang harus dilakukan |
| Terakhir Sinkron | Tanggal dan jam WIB |
| Link LP | URL halaman mobil di landing page |

Sediakan script setup (`pnpm sheet:setup`) yang membuat tab, header, dropdown, checkbox, warna, dan protected range secara otomatis.

### Aturan

- Mobil tampil di landing page **hanya jika** Status = `Ready` **dan** Tampilkan di LP dicentang **dan** data OLX berhasil diambil.
- `Booking` tampil dengan badge "Booking" tetapi tidak masuk feed iklan. (Bisa diubah lewat env `SHOW_BOOKED_ON_LP`.)
- `Sold` disembunyikan dari daftar dan feed. **Baris tidak dihapus**, supaya ID tidak pernah dipakai ulang.
- Jika baris dihapus dari Sheet, mobil di database ditandai `removed_from_sheet` dan disembunyikan, **bukan dihapus**.
- Jika tim mengganti Link OLX di baris yang sama (misalnya iklan dipasang ulang), ID tetap sama dan data diambil ulang.
- Status di Sheet adalah sumber kebenaran tertinggi.

## 6. Skema database

Gunakan Drizzle. Gambaran tabel (sesuaikan detail tipe data):

```
cars
  id                  text pk          -- MS-0001, permanen
  sheet_row_key       text             -- untuk mencocokkan baris
  plate               text
  internal_name       text
  olx_url             text
  olx_listing_id      text             -- ID dari URL OLX
  status              enum(ready, booking, sold)
  show_on_lp          boolean
  featured            boolean
  removed_from_sheet  boolean default false

  -- data hasil parsing OLX
  title               text
  brand               text
  model               text
  variant             text
  year                int
  price               bigint           -- rupiah, tanpa desimal
  mileage_km          int
  transmission        text
  fuel                text
  color               text
  body_type           text
  location            text
  description         text
  specs               jsonb            -- atribut lain dari OLX
  raw_snapshot        jsonb            -- data mentah terakhir, untuk debugging

  -- override dari admin (selalu menang atas data OLX)
  override_title       text null
  override_price       bigint null
  override_description text null

  -- kondisi OLX
  olx_state           enum(active, missing, error, unknown)
  olx_error_count     int default 0
  olx_checked_at      timestamptz

  slug                text
  sold_at             timestamptz null
  created_at, updated_at, last_synced_at

car_images
  id, car_id fk, position int, hidden boolean default false,
  source_url text, storage_key text,
  width int, height int, blur_data_url text,
  variants jsonb   -- { avif: {640,1080,1600}, webp: {640,1080,1600} }

sync_runs
  id, trigger enum(manual, cron, webhook, olx_check),
  started_at, finished_at, status, summary jsonb, log jsonb

counters
  name pk, value int   -- untuk nomor urut ID MS-xxxx
```

Field publik yang ditampilkan selalu `coalesce(override_x, x)`.

## 7. Sinkronisasi

### Pemicu

1. Tombol **"Sinkron sekarang"** di back office (utama).
2. Endpoint `POST /api/sync` dengan header `Authorization: Bearer SYNC_SECRET`, supaya nanti bisa dipanggil dari tombol di Google Sheet via Apps Script.
3. Vercel Cron setiap pagi (pengecekan OLX, lihat di bawah).

Hanya boleh ada satu proses sinkron berjalan pada satu waktu (gunakan lock di database).

### Alur per baris Sheet

1. Baris punya Link OLX tetapi belum punya ID: buat ID baru dari counter, tulis balik ke Sheet.
2. Link OLX baru atau berubah: ambil dan parsing halaman OLX, proses foto, simpan.
3. Link sama seperti sebelumnya: jangan ambil ulang foto. Perbarui hanya status, checkbox, dan override dari Sheet.
4. Tulis balik Status Sinkron, Pesan, Terakhir Sinkron, dan Link LP ke Sheet (batch update, bukan per sel).

Back office menampilkan progres sinkron secara langsung (streaming), contoh: "12 dari 30 mobil diproses".

### Parser OLX

- Sebelum menulis parser, ambil HTML dari contoh link yang diberikan pemilik proyek, simpan sebagai fixture di `tests/fixtures/olx/`, dan pelajari strukturnya.
- Urutan prioritas sumber data: JSON-LD → state JSON yang tertanam di halaman → meta tag (og:title, og:image) → selector CSS sebagai pilihan terakhir.
- Hasil parsing divalidasi dengan Zod. Jika field wajib (judul, harga, minimal 1 foto) tidak ada, tandai `Gagal` dengan pesan yang jelas, jangan simpan data setengah jadi.
- Sopan terhadap server OLX: proses berurutan, jeda acak 2–4 detik antar request, timeout 15 detik, maksimal 2 percobaan ulang dengan backoff. Hanya ambil link yang ada di Sheet (iklan milik showroom sendiri), jangan crawl halaman lain.
- Bedakan dengan tegas:
  - **Iklan jelas tidak ada** (HTTP 404/410, atau halaman menyatakan iklan tidak aktif/dihapus) → `olx_state = missing`.
  - **Gagal mengambil** (timeout, 403, 429, 5xx, struktur halaman tidak dikenali) → `olx_state = error`, **jangan sembunyikan mobil**.
- Unit test parser wajib memakai fixture, termasuk fixture untuk iklan yang sudah tidak aktif.

### Pemrosesan foto

- Unduh semua foto dari iklan, buang duplikat (hash konten).
- Dengan `sharp`: perbaiki orientasi, buat varian lebar 640, 1080, 1600 dalam AVIF dan WebP, kualitas tinggi (foto mobil harus tajam dan warnanya akurat).
- Buat blur placeholder kecil (base64) untuk efek loading.
- Simpan ke R2 dengan key `cars/{id}/{hash}-{width}.{ext}`, cache header immutable.
- Jangan pernah menampilkan foto langsung dari server OLX (hotlink).
- Jangan mencoba menghapus watermark.

### Pengecekan OLX harian (cron)

Untuk setiap mobil berstatus `ready` atau `booking`:

- Ambil ulang halaman OLX.
- `missing` → sembunyikan dari landing page dan feed, tulis ke Sheet: "Iklan OLX tidak aktif. Jika mobil terjual, ubah Status ke Sold. Jika iklan dipasang ulang, ganti Link OLX."
- `error` → naikkan `olx_error_count`, tetap tampil. Jika gagal 3 hari berturut-turut, tampilkan peringatan di back office dan Sheet, tetap jangan disembunyikan.
- `active` → reset error count. Jika harga atau deskripsi di OLX berubah, perbarui (kecuali ada override) dan catat perubahannya di log.

### Revalidasi

Setelah sinkron atau perubahan di admin, panggil `revalidateTag` untuk halaman yang terdampak dan feed. Halaman publik di-render statis/ISR supaya sangat cepat.

## 8. Halaman publik

### Beranda `/`

- Hero layar penuh menampilkan satu mobil unggulan (atau rotasi pelan beberapa mobil unggulan) dengan foto besar, nama mobil, harga, dan tombol ke detail.
- Baris filter merek yang lengket di atas saat scroll (chip horizontal yang bisa digeser), plus tombol untuk membuka bottom sheet filter lanjutan: rentang harga, tahun, transmisi. Urutkan: terbaru, harga terendah, harga tertinggi.
- Daftar mobil: di mobile satu kartu per baris dengan foto besar rasio 4:3; di tablet dua kolom; di desktop tiga kolom.
- Kartu berisi: foto (bisa digeser untuk melihat 3 foto pertama), nama, tahun, kilometer, transmisi, harga ringkas (`Rp 185 jt`), badge "Booking" jika berlaku.
- Bagian penutup: info showroom (alamat, jam buka, peta statis yang ringan, tombol WA dan telepon).
- Empty state jika filter tidak menghasilkan mobil: kalimat yang mengarahkan, plus tombol reset filter dan tombol tanya via WA.

### Detail `/mobil/[id]-[slug]`

- Galeri foto full-bleed di bagian atas: swipe dengan spring physics, indikator posisi, ketuk untuk membuka tampilan layar penuh dengan pinch-to-zoom.
- Nama, varian, tahun, harga lengkap (`Rp 185.000.000`).
- Deretan spesifikasi utama (tahun, kilometer, transmisi, bahan bakar, warna) dengan gaya seperti panel instrumen mobil.
- Deskripsi (dengan "Baca selengkapnya" jika panjang) dan spesifikasi tambahan.
- **Bar aksi lengket di bawah layar**: tombol utama "Tanya via WhatsApp" dan tombol ikon telepon. Bar memperhitungkan safe area iPhone.
- Rekomendasi mobil serupa (merek atau rentang harga mirip).

### Mobil terjual atau disembunyikan

URL tetap berfungsi (iklan lama dan link yang dibagikan di WA tidak boleh berakhir di error). Tampilkan: foto pertama dengan efek redup, keterangan "Mobil ini sudah terjual" (atau "Sedang tidak tersedia"), lalu daftar mobil serupa dan tombol WA. Halaman ini `noindex` dan tidak mengirim ViewContent.

### Kebijakan privasi

Halaman sederhana yang menjelaskan penggunaan cookie dan Pixel untuk iklan, sesuai UU PDP. Teks draf, tandai untuk ditinjau pemilik.

### Copywriting

- Bahasa Indonesia yang santai tapi berkelas. Kalimat pendek, kata kerja jelas.
- Tombol menyebut apa yang terjadi: "Tanya via WhatsApp", "Lihat detail", "Reset filter".
- Jangan menambahkan panah "→" di teks tombol, jangan label huruf kapital semua, jangan eyebrow label di atas setiap judul.

## 9. Back office

Login dengan Google, hanya email di `ADMIN_EMAILS`. Tampilan bersih, fungsional, tetap memakai palet brand, nyaman dipakai di HP.

- **Dashboard**: tombol "Sinkron sekarang" dengan progres langsung, waktu sinkron terakhir, ringkasan (jumlah tampil, booking, terjual bulan ini, bermasalah).
- **Daftar mobil**: thumbnail, ID, nama, harga, status, kondisi OLX, terakhir sinkron. Filter per status dan "bermasalah". Pencarian.
- **Detail mobil**:
  - Lihat semua data hasil parsing.
  - Override judul, harga, deskripsi.
  - Atur urutan foto (drag), sembunyikan foto tertentu.
  - Tombol "Ambil ulang dari OLX" untuk mobil ini saja.
  - Link pratinjau halaman publik.
- **Riwayat sinkron**: daftar `sync_runs` dengan log yang bisa dibuka.

Status mobil tetap diubah di Sheet, bukan di admin, supaya hanya ada satu sumber kebenaran. Admin menampilkan pengingat ini.

## 10. Desain

Ini bagian paling penting bagi pemilik proyek. Ikuti arahan ini, tetapi sesuaikan warna aksen dengan logo asli setelah logo didapat.

### Arah visual: "studio malam"

Bayangkan mobil premium dipajang di studio foto gelap dengan satu lampu panjang (light bar) yang menyapu bodinya, memantulkan kilau di cat dan krom. Website terasa seperti ruang pamer privat, bukan marketplace. Tenang, gelap, presisi, dengan cahaya sebagai satu-satunya ornamen.

Prinsip:

1. **Mobil adalah bintangnya.** Foto besar, ruang lega, UI tidak berebut perhatian.
2. **Cahaya sebagai motif tunggal.** Satu motif khas yang dipakai konsisten: "light sweep", yaitu kilau tipis yang bergerak melintasi permukaan seperti pantulan lampu di cat mobil. Dipakai hemat: di loader, saat foto hero pertama kali muncul, dan sebagai umpan balik saat tombol utama ditekan. Tidak di setiap elemen.
3. **Presisi seperti panel instrumen.** Angka (harga, kilometer, tahun) ditata rapi seperti instrumen dashboard: tabular figures, perataan konsisten, garis halus.
4. **Gerak menjawab sentuhan.** Animasi muncul sebagai respons terhadap aksi pengguna (ketuk, geser, buka, tutup) dan terasa fisik (spring), bukan efek dekorasi yang berjalan sendiri. Hindari fade-and-slide-up generik di setiap section saat scroll.
5. **Mahal karena disiplin.** Sedikit warna, sedikit ukuran huruf, spasi yang lega dan konsisten. Sebelum selesai, buang satu elemen dekoratif yang tidak perlu.

### Warna (titik awal; sesuaikan aksen dengan logo)

| Token | Hex | Peran |
|---|---|---|
| `--night` | `#10141B` | Latar utama, grafit kebiruan seperti studio gelap |
| `--cabin` | `#181E27` | Permukaan kartu dan sheet |
| `--panel` | `#222A35` | Elemen yang terangkat, input, chip |
| `--platinum` | `#E6EAF0` | Teks utama |
| `--steel` | `#8E99A8` | Teks sekunder, garis |
| `--xenon` | `#A8D8FF` | Aksen dingin seperti lampu xenon: tombol utama, fokus, light sweep |
| `--signal` | `#F5B544` | Badge Booking |
| `--sold` | `#E5484D` | Penanda terjual |

- Situs ini sengaja **dark-only** (`color-scheme: dark`). Kontras teks minimal WCAG AA.
- Jika logo punya warna brand yang kuat, warna itu menggantikan `--xenon` sebagai aksen, dan sesuaikan nuansa `--night` agar harmonis. Tampilkan dua opsi palet ke pemilik sebelum menetapkan.
- Gradien hanya boleh untuk light sweep dan scrim di atas foto (agar teks terbaca). Tidak ada gradien dekoratif di latar.

### Tipografi

- **Display: Anybody** (Google Fonts, variable, sumbu width 50–150). Dipakai dengan width lebar (sekitar 125–140) untuk nama mobil dan judul hero, terinspirasi dari lettering emblem dan badging mobil. Sumbu width boleh dianimasikan secara halus pada momen hero (misalnya huruf melebar perlahan saat muncul).
- **Teks: Instrument Sans** untuk body, UI, dan angka.
- Angka memakai `font-variant-numeric: tabular-nums`.
- Skala huruf terbatas, misalnya 13 / 15 / 17 / 22 / 32 / 48 px di mobile. Body 15–16px, line-height 1.6, panjang baris di bawah 70 karakter.
- Sentence case di semua tempat.
- Muat font dengan `next/font` (self-hosted, subset latin, `display: swap`).

### Layout mobile (baseline 390×844)

Beranda:

```
┌──────────────────────────┐
│ [logo]            [WA]   │  header transparan, solid saat scroll
│                          │
│     FOTO MOBIL HERO      │  100svh, foto penuh
│  (light sweep sekali)    │
│                          │
│ Mercedes-Benz A200       │  Anybody lebar
│ 2019 · Rp 385 jt         │
│ [ Lihat detail ]         │
├──────────────────────────┤
│ (Semua)(Mercedes)(MINI)… │  chip merek lengket + ikon filter
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │  FOTO 4:3 (swipe)    │ │  kartu satu kolom
│ └──────────────────────┘ │
│ MINI Cooper S F55        │
│ 2018   32.000 km   AT    │  baris instrumen
│ Rp 465 jt                │
│                          │
│ (kartu berikutnya)       │
└──────────────────────────┘
```

Catatan: pemisah titik tengah di sketsa hanya ilustrasi. Untuk meta mobil, gunakan baris instrumen dengan jarak, bukan string dengan titik tengah.

Detail:

```
┌──────────────────────────┐
│ ←                  1/14  │  di atas foto, kontras dengan scrim
│                          │
│   GALERI FULL-BLEED      │  swipe, ketuk untuk fullscreen
│                          │
├──────────────────────────┤
│ MINI Cooper S F55        │
│ Rp 465.000.000           │
│ ┌────┬────┬────┬────┐    │  panel instrumen
│ │2018│32rb│ AT │Bens│    │
│ └────┴────┴────┴────┘    │
│ Deskripsi…               │
│ Mobil serupa             │
├──────────────────────────┤
│ [ Tanya via WhatsApp ][☎]│  bar lengket + safe area
└──────────────────────────┘
```

### Spesifikasi animasi

**Loader dengan logo berputar (permintaan khusus pemilik):**

- Logo SVG di tengah layar `--night`, berputar halus. Jika logo berbentuk emblem bundar, putar pada sumbu Z seperti velg dengan jejak cahaya tipis di tepinya. Jika logo berbentuk wordmark, putar pada sumbu Y seperti koin dengan perspektif, atau putarkan cincin cahaya tipis mengelilingi logo yang diam.
- Saat konten siap, logo **tidak menghilang begitu saja**: logo mengecil dan berpindah ke posisi logo di header (shared layout animation), sementara foto hero terbuka dengan light sweep. Ini satu momen orkestrasi utama situs.
- Batasan performa: loader penuh hanya pada kunjungan pertama per sesi. Durasi minimal sekitar 600 ms agar tidak terlihat berkedip, maksimal 1,5 detik; setelah itu tampilkan konten apa pun kondisinya. Konten di-render server di belakang loader, dan Pixel PageView tetap dikirim segera.
- Versi mini dari logo berputar dipakai sebagai indikator loading di tempat lain (pindah halaman, memuat data).
- Animasi memakai `transform` dan `opacity` saja (GPU), tanpa Lottie.

**Interaksi:**

- Kartu ke detail: foto kartu berubah mulus menjadi galeri detail (shared element transition dengan `layoutId` atau View Transitions API). Kembali ke daftar mengembalikan posisi scroll.
- Galeri: swipe dengan momentum dan spring, rubber-band di ujung, pinch-to-zoom di mode layar penuh, swipe ke bawah untuk menutup.
- Tombol: tekan memberi skala sekitar 0,97 dengan spring cepat; tombol utama memunculkan light sweep singkat saat ditekan.
- Chip filter: indikator aktif bergeser mulus antar chip; daftar mobil menata ulang dengan animasi layout saat filter berubah.
- Bottom sheet filter: bisa ditarik, spring, latar redup dengan blur ringan.
- Foto memuat dengan blur placeholder yang memudar ke foto tajam.
- Header: transparan di atas hero, berubah solid dengan blur halus saat scroll.
- Jangan membajak scroll (tidak ada smooth-scroll library di mobile). Scroll native terasa paling premium di HP.
- Hormati `prefers-reduced-motion`: ganti gerakan dengan fade sederhana, loader tanpa putaran.

### Instagram in-app browser

- Gunakan `100svh`/`100dvh`, bukan `100vh`. Tangani `env(safe-area-inset-*)`.
- Tidak ada interaksi yang bergantung pada hover.
- Link WA memakai `https://wa.me/...` dan telepon `tel:`; jangan `window.open` di dalam handler async (sering diblokir).
- Uji di Playwright dengan user agent Instagram iOS dan Android, plus Safari iOS dan Chrome Android.
- Area sentuh minimal 44×44 px.

### Anggaran performa (wajib, karena dibayar per klik)

- LCP di bawah 2,5 detik pada HP Android kelas menengah dengan jaringan 4G.
- CLS di bawah 0,05. JS awal halaman publik sekecil mungkin; muat komponen berat (galeri layar penuh, bottom sheet) secara lazy.
- Foto hero pakai `priority` dan ukuran yang tepat; foto lain lazy.
- Lighthouse mobile performa ≥ 90.

### Proses desain

1. Buat dulu rencana desain singkat (palet final, tipografi, layout) dan **halaman contoh dengan data dummy**, menggunakan nama mobil nyata dari stok showroom (misalnya Mercedes A200 Progresive, Mercedes GLA 200 AMG, MINI Cooper S F55, Golf GTI MK6, Abarth 595 Turismo, Mazda CX-5 Kuro, BMW 428i M Sport, Mitsubishi Outlander PHEV, Honda HR-V E CVT).
2. Kritisi sendiri hasilnya dengan screenshot: apakah terasa seperti template generik? Jika ya, perbaiki dan jelaskan apa yang diubah.
3. Kirim screenshot mobile (beranda, detail, loader dalam beberapa frame, bottom sheet, state terjual) untuk review pemilik **sebelum** mengerjakan integrasi data.

## 11. Tracking

### Meta Pixel + Conversions API

- Pixel di browser dan Conversions API dari server (route handler `/api/track`), dengan `event_id` yang sama untuk deduplikasi.
- Kirim `fbp`, `fbc` (dibuat dari `fbclid` jika ada), IP, user agent, `event_source_url`, `action_source: website`.
- Env `META_TEST_EVENT_CODE` untuk pengujian di Events Manager.

| Event | Kapan | Data |
|---|---|---|
| PageView | Setiap halaman | — |
| ViewContent | Membuka detail mobil yang tersedia | `content_ids: [id]`, `content_type` (`vehicle` atau `product` sesuai env), `value: harga`, `currency: IDR`, `content_name` |
| Lead | Klik tombol WhatsApp | `content_ids` jika dari halaman detail, `value`, `currency` |
| Contact | Klik tombol telepon | sama seperti Lead |
| Search | Menerapkan filter | `search_string` ringkas |

**`content_ids` harus persis sama dengan `id` di feed katalog** (contoh `MS-0001`). Ini kunci iklan dinamis.

### UTM dan atribusi WA

- Simpan UTM dan `fbclid` sentuhan pertama di cookie first-party (30 hari).
- Pesan WA otomatis berisi nama mobil, ID, dan link halaman, contoh: `Halo, saya tertarik dengan MINI Cooper S F55 2018 (MS-0004). https://promo.mobilsekenbandung.com/mobil/MS-0004-...`. ID di pesan membantu tim sales tahu mobil mana yang dimaksud dan dari iklan.
- Opsional (aktif lewat env): TikTok Pixel dan GA4. Default nonaktif.

## 12. Feed Meta Catalog

Endpoint `GET /feed/meta.csv` (cache singkat, misalnya 15 menit). Hanya berisi mobil yang Status `ready`, Tampilkan di LP dicentang, dan `olx_state` bukan `missing`.

Format ditentukan env `META_CATALOG_TYPE`:

- `product` (katalog e-commerce): `id`, `title`, `description`, `availability` (`in stock`), `condition` (`used`), `price` (format `185000000 IDR`), `link`, `image_link`, `additional_image_link`, `brand`, serta `custom_label_0` (merek), `custom_label_1` (rentang harga), `custom_label_2` (tipe bodi).
- `vehicle` (katalog kendaraan): field kendaraan seperti `vehicle_id`, `make`, `model`, `year`, `mileage.value`, `mileage.unit`, `price`, `url`, `image[0].url`, `state_of_vehicle`, `transmission`, `fuel_type`, `body_style`, `exterior_color`, `address`, dan lainnya.

**Penting:** cek dokumentasi resmi Meta untuk nama field dan field wajib terbaru sebelum mengimplementasikan, karena spesifikasinya bisa berubah. Buat test yang memvalidasi feed terhadap daftar field wajib.

Gambar di feed memakai varian 1080 px dari R2. Link memakai URL kanonis halaman detail, bisa ditambah parameter `utm_source=meta&utm_medium=catalog`.

## 13. Environment variables

```
DATABASE_URL=
PUBLIC_HOST=
ADMIN_HOST=
ALLOW_INDEXING=false
SHOW_BOOKED_ON_LP=true

GOOGLE_SERVICE_ACCOUNT_JSON=
GOOGLE_SHEET_ID=
GOOGLE_SHEET_TAB=Katalog LP

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_BASE_URL=

AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
ADMIN_EMAILS=

SYNC_SECRET=
CRON_SECRET=

NEXT_PUBLIC_META_PIXEL_ID=
META_CAPI_ACCESS_TOKEN=
META_TEST_EVENT_CODE=
META_CATALOG_TYPE=product

NEXT_PUBLIC_WA_NUMBER=
NEXT_PUBLIC_PHONE_NUMBER=

NEXT_PUBLIC_TIKTOK_PIXEL_ID=
NEXT_PUBLIC_GA4_ID=
```

Sediakan `.env.example` dan validasi env dengan Zod saat startup.

## 14. Fase kerja

| Fase | Isi | Review gate |
|---|---|---|
| 1. Fondasi dan desain | Setup proyek, tokens, font, ambil aset dari website lama, rencana desain, halaman publik lengkap dengan data dummy, loader dan semua animasi | Screenshot mobile dan rekaman/urutan frame animasi. **Tunggu persetujuan pemilik.** |
| 2. Database dan halaman nyata | Skema Neon, migrasi, seed, halaman publik membaca dari database, routing host, state terjual | Demo di preview deployment |
| 3. Sheet dan OLX | Script setup Sheet, parser OLX dengan fixture dan test, pemrosesan foto ke R2, alur sinkron, tulis balik ke Sheet | Hasil sinkron dari link OLX nyata |
| 4. Back office | Auth, dashboard, daftar, detail dengan override, riwayat sinkron | Demo alur tim showroom dari HP |
| 5. Tracking dan feed | Pixel + CAPI, event, UTM, pesan WA, feed katalog | Event terlihat di Meta Test Events; feed valid |
| 6. Otomasi dan rilis | Cron cek OLX, endpoint webhook, kebijakan privasi, uji Instagram in-app browser, audit performa, dokumentasi singkat untuk tim showroom | Checklist bagian 15 lulus |

## 15. Kriteria selesai

- [ ] Tim cukup menempelkan link OLX, memilih status, mencentang tampil, lalu menekan sinkron. Mobil muncul di landing page lengkap dengan foto dalam beberapa menit.
- [ ] Mengubah status ke Sold menyembunyikan mobil dari landing page dan feed setelah sinkron berikutnya; URL lamanya menampilkan halaman terjual dengan mobil serupa.
- [ ] Iklan OLX yang sudah tidak aktif terdeteksi oleh cek harian; gangguan sementara dari OLX tidak menyembunyikan mobil.
- [ ] ID mobil tidak pernah berubah, termasuk saat link OLX diganti.
- [ ] ViewContent dan Lead tercatat di Meta dengan `content_ids` yang cocok dengan feed, dan terdeduplikasi antara Pixel dan CAPI.
- [ ] Lighthouse mobile performa ≥ 90, LCP < 2,5 detik, CLS < 0,05.
- [ ] Tampil dan berfungsi rapi di in-app browser Instagram iOS dan Android.
- [ ] Animasi mulus 60 fps di HP kelas menengah dan menghormati reduced motion.
- [ ] Pemilik proyek menyetujui tampilan akhir.

## 16. Larangan

- Jangan hotlink foto dari OLX dan jangan menghapus watermark.
- Jangan crawl halaman OLX selain link yang ada di Sheet.
- Jangan menghapus data mobil dari database; gunakan status dan flag.
- Jangan menggunakan ulang ID.
- Jangan menyembunyikan mobil hanya karena gagal mengambil halaman OLX.
- Jangan menyalin layout atau gaya website Wix lama.
- Jangan memakai template UI generik (kartu SaaS seragam dengan bayangan abu-abu, gradien dekoratif, label huruf kapital, eyebrow label, panah di teks tombol).
- Jangan menyimpan secret di kode atau di repository.
