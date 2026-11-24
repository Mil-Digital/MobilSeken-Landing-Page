import "server-only";

// Data contoh untuk melihat tampilan dashboard sebelum ada pengunjung asli.
// Hanya dipakai di laptop (next dev) lewat /admin?demo=1 — tidak pernah di production.

import { readStoredCars } from "@/lib/store/local";
import type { Range, Report } from "./report";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

export async function demoReport(range: Range): Promise<Report> {
  const rand = rng(range * 97);
  const stored = await readStoredCars();
  const today = new Date();
  const daily = Array.from({ length: range }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (range - 1 - i));
    const wk = d.getDay() === 0 || d.getDay() === 6 ? 1.35 : 1;
    const sessions = Math.round((38 + i * (40 / range) + rand() * 22) * wk);
    const meta = Math.round(sessions * (0.52 + rand() * 0.14));
    return { day: d.toISOString().slice(0, 10), sessions, meta, leads: Math.round(sessions * (0.06 + rand() * 0.05)) };
  });
  const sum = (k: "sessions" | "meta" | "leads") => daily.reduce((s, x) => s + x[k], 0);
  const sessions = sum("sessions");
  const meta = sum("meta");
  const leads = sum("leads");
  const cars = stored.slice(0, 10).map((c, i) => {
    const views = Math.round((420 - i * 34) * (0.8 + rand() * 0.4) * (range / 30));
    return {
      id: c.id,
      name: `${c.brand} ${c.model}`,
      category: c.category,
      image: c.images[0]?.src ?? null,
      views,
      clicks: Math.round(views * 0.7),
      leads: Math.round(views * (0.05 + rand() * 0.05)),
    };
  });
  const hours = Array.from({ length: 24 }, (_, h) => {
    const base = h < 6 ? 4 : h < 9 ? 18 : h < 12 ? 46 : h < 14 ? 38 : h < 18 ? 52 : h < 22 ? 70 : 24;
    const s = Math.round(base * (0.85 + rand() * 0.3) * (range / 30) * 4);
    return { hour: h, sessions: s, leads: Math.round(s * 0.08) };
  });
  return {
    range,
    since: new Date(today.getTime() - 120 * 864e5).toISOString(),
    totals: {
      sessions: { now: sessions, prev: Math.round(sessions * 0.86) },
      visitors: { now: Math.round(sessions * 0.81), prev: Math.round(sessions * 0.7) },
      leads: { now: leads, prev: Math.round(leads * 0.78) },
      leadSessions: { now: Math.round(leads * 0.85), prev: Math.round(leads * 0.66) },
      wa: Math.round(leads * 0.88),
      tel: leads - Math.round(leads * 0.88),
      metaSessions: { now: meta, prev: Math.round(meta * 0.8) },
      metaLeads: { now: Math.round(leads * 0.64), prev: Math.round(leads * 0.5) },
      metaLeadSessions: { now: Math.round(leads * 0.56), prev: Math.round(leads * 0.44) },
    },
    daily,
    channels: [
      { channel: "meta_ads", sessions: meta, leadSessions: Math.round(leads * 0.56) },
      { channel: "direct", sessions: Math.round(sessions * 0.17), leadSessions: Math.round(leads * 0.14) },
      { channel: "google", sessions: Math.round(sessions * 0.11), leadSessions: Math.round(leads * 0.1) },
      { channel: "meta_organic", sessions: Math.round(sessions * 0.09), leadSessions: Math.round(leads * 0.07) },
      { channel: "other", sessions: Math.round(sessions * 0.04), leadSessions: Math.round(leads * 0.02) },
    ],
    meta: {
      platforms: [
        { name: "instagram", sessions: Math.round(meta * 0.63), leads: Math.round(leads * 0.4) },
        { name: "facebook", sessions: Math.round(meta * 0.34), leads: Math.round(leads * 0.22) },
        { name: "messenger", sessions: Math.round(meta * 0.03), leads: Math.round(leads * 0.02) },
      ],
      campaigns: [
        { name: "Stok SUV Desember", sessions: Math.round(meta * 0.46), leads: Math.round(leads * 0.31) },
        { name: "Retargeting Pengunjung", sessions: Math.round(meta * 0.28), leads: Math.round(leads * 0.2) },
        { name: "MPV Keluarga", sessions: Math.round(meta * 0.18), leads: Math.round(leads * 0.09) },
        { name: "Brand Awareness Bandung", sessions: Math.round(meta * 0.08), leads: Math.round(leads * 0.02) },
      ],
      ads: [
        { name: "Reels Pajero Sport", sessions: Math.round(meta * 0.3), leads: Math.round(leads * 0.2) },
        { name: "Carousel 10 SUV", sessions: Math.round(meta * 0.22), leads: Math.round(leads * 0.14) },
        { name: "Story Vellfire", sessions: Math.round(meta * 0.16), leads: Math.round(leads * 0.1) },
        { name: "Foto Showroom", sessions: Math.round(meta * 0.1), leads: Math.round(leads * 0.04) },
      ],
      adsets: [
        { name: "Bandung 25-45", sessions: Math.round(meta * 0.55), leads: Math.round(leads * 0.36) },
        { name: "Jabar Minat Otomotif", sessions: Math.round(meta * 0.45), leads: Math.round(leads * 0.26) },
      ],
      untagged: Math.round(sessions * 0.02),
    },
    cars,
    buttons: [
      { type: "card_click", label: "stok", count: Math.round(sessions * 0.62) },
      { type: "wa_click", label: "bar-bawah", count: Math.round(leads * 0.46) },
      { type: "card_click", label: "hero", count: Math.round(sessions * 0.21) },
      { type: "photo_open", label: "galeri", count: Math.round(sessions * 0.18) },
      { type: "wa_click", label: "header", count: Math.round(leads * 0.2) },
      { type: "wa_click", label: "tombol-melayang", count: Math.round(leads * 0.14) },
      { type: "maps_click", label: "hero", count: Math.round(sessions * 0.04) },
      { type: "tel_click", label: "bar-bawah", count: Math.round(leads * 0.1) },
      { type: "nav", label: "Stok tersedia", count: Math.round(sessions * 0.05) },
    ],
    picks: [
      { type: "category", label: "SUV", count: Math.round(sessions * 0.24) },
      { type: "category", label: "MPV", count: Math.round(sessions * 0.11) },
      { type: "category", label: "Sedan", count: Math.round(sessions * 0.07) },
      { type: "brand", label: "Toyota", count: Math.round(sessions * 0.06) },
      { type: "brand", label: "Mitsubishi", count: Math.round(sessions * 0.04) },
      { type: "brand", label: "Honda", count: Math.round(sessions * 0.03) },
      { type: "filter", label: "harga", count: Math.round(sessions * 0.05) },
      { type: "filter", label: "harga, tahun", count: Math.round(sessions * 0.02) },
    ],
    hours,
    devices: [
      { device: "mobile", sessions: Math.round(sessions * 0.86) },
      { device: "desktop", sessions: Math.round(sessions * 0.12) },
      { device: "tablet", sessions: Math.round(sessions * 0.02) },
    ],
    funnel: { sessions, viewed: Math.round(sessions * 0.58), contacted: Math.round(leads * 0.85) },
    recent: cars.slice(0, 6).map((c, i) => ({
      ts: new Date(today.getTime() - i * 2.7 * 3600e3).toISOString(),
      type: i % 4 === 3 ? "tel_click" : "wa_click",
      label: i % 2 ? "bar-bawah" : "detail",
      car: c.id,
      carName: c.name,
      channel: i % 3 === 2 ? "direct" : "meta_ads",
      platform: i % 3 === 2 ? null : i % 2 ? "facebook" : "instagram",
      campaign: i % 3 === 2 ? null : "Stok SUV Desember",
    })),
  };
}
