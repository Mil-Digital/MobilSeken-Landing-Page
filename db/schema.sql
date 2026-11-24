-- Skema database MS Garage (Neon Postgres). Aman dijalankan berulang (idempotent).

create table if not exists cars (
  id              text primary key,                -- kode unit, mis. MS-0007 (tidak pernah dipakai ulang)
  status          text not null check (status in ('ready', 'booking', 'sold')),
  featured        boolean not null default false,
  brand           text not null,
  model           text not null,
  variant         text not null default '',
  year            int not null,
  price           bigint not null,
  mileage_km      int not null default 0,
  transmission    text not null,
  fuel            text not null,
  color           text not null,
  body_type       text not null,
  location        text not null default 'Bandung',
  description     text not null default '',
  specs           jsonb not null default '[]',
  images          jsonb not null default '[]',     -- [{src, width, height, blurDataURL}]
  created_at      text not null,                   -- YYYY-MM-DD
  olx_listing_id  text unique,                     -- satu iklan OLX = satu mobil
  olx_url         text,
  olx_seller_id   text,
  olx_status      text,
  olx_title       text,
  synced_at       timestamptz,
  updated_at      timestamptz not null default now()
);

-- Kelompok navigasi stok (SUV / MPV / Sedan). Disarankan saat impor, bisa diubah di admin.
alter table cars add column if not exists category text check (category in ('SUV', 'MPV', 'Sedan'));

-- Peristiwa pengunjung untuk dashboard: klik kartu, klik WhatsApp/telepon (leads), dll.
create table if not exists events (
  id            bigserial primary key,
  ts            timestamptz not null default now(),
  type          text not null,
  car_id        text,
  label         text,
  path          text,
  session       text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  referrer      text,
  device        text
);
create index if not exists events_ts_idx on events (ts desc);
create index if not exists events_type_ts_idx on events (type, ts desc);
create index if not exists events_car_idx on events (car_id) where car_id is not null;
