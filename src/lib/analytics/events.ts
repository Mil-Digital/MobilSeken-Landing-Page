// Jenis event yang dicatat. Leads = klik WhatsApp atau telepon.
export const EVENT_TYPES = [
  "page_view", // buka halaman (car_id terisi di halaman detail mobil)
  "card_click", // klik kartu/foto mobil menuju detail
  "wa_click", // lead: klik WhatsApp
  "tel_click", // lead: klik telepon
  "maps_click", // klik petunjuk arah
  "category", // pilih jenis SUV / MPV / Sedan
  "brand", // pilih merek dari pita merek
  "filter", // terapkan filter lanjutan
  "nav", // klik navigasi/menu
  "photo_open", // buka foto layar penuh di detail
] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export const LEAD_TYPES = ["wa_click", "tel_click"] as const;
