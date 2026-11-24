import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { bookmarkletHref, decodePayload, runBookmarklet } from "../src/lib/olx/bookmarklet";
import { compactAd, normalizeOlx, OlxParseError, parseOlxHtml } from "../src/lib/olx/parse";

const html = readFileSync(join(__dirname, "fixtures/olx/iid-949414596.html"), "utf8");

/** State OLX dari fixture, persis seperti window.__APP.states di halaman aslinya. */
function fixtureStates() {
  const at = html.indexOf("states:", html.indexOf("window.__APP"));
  const start = html.indexOf("{", at);
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return JSON.parse(html.slice(start, i + 1));
  }
  throw new Error("state tidak ditemukan");
}

describe("parser OLX (fixture Jeep Wrangler, iklan aktif)", () => {
  const car = parseOlxHtml(html);

  it("membaca identitas iklan & penjual", () => {
    expect(car.listingId).toBe("949414596");
    expect(car.sellerId).toBe("44649495");
    expect(car.olxStatus).toBe("active");
    expect(car.url).toBe("https://www.olx.co.id/item/jeep-jk-sahara-asli-38-rubicon-wrangler-20112012-facelift-iid-949414596");
  });

  it("membaca harga, judul, dan deskripsi utuh", () => {
    expect(car.price).toBe(654_000_000);
    expect(car.title).toBe("Jeep JK Sahara asli 3.8 Rubicon Wrangler 2011/2012 Facelift");
    expect(car.description).toContain("Bebas Laka Banjir");
    expect(car.description).toContain("MS Garage\nJl. Sriwijaya 29");
  });

  it("memetakan spesifikasi ke data mobil", () => {
    expect(car.brand).toBe("Jeep");
    expect(car.model).toBe("Sahara");
    expect(car.year).toBe(2011);
    expect(car.transmission).toBe("Otomatis");
    expect(car.fuel).toBe("Bensin");
    expect(car.color).toBe("Putih");
    expect(car.mileageLabel).toBe("50.000-55.000 km");
    expect(car.mileageKm).toBe(55_000);
    expect(car.engine).toBe(">3.000 cc");
    // varian OLX "Lain-lain-AT" terlalu umum → diambil dari judul tanpa merek/model/tahun
    expect(car.variant).toBe("JK asli 3.8 Rubicon Wrangler Facelift");
  });

  it("mengambil semua foto dalam ukuran asli, tanpa duplikat", () => {
    expect(car.images).toHaveLength(15);
    expect(car.images[0]).toEqual({
      id: "6af6bdb82eb59-ID",
      url: "https://apollo.olx.co.id/v1/files/6af6bdb82eb59-ID/image;s=1080x0;q=90",
      width: 1080,
      height: 659,
    });
    expect(new Set(car.images.map((i) => i.id)).size).toBe(15);
  });
});

describe("tombol 'Kirim ke MS Garage'", () => {
  it("menghasilkan data yang sama persis dengan parser", () => {
    const states = fixtureStates();
    const path = "/item/jeep-jk-sahara-asli-38-rubicon-wrangler-20112012-facelift-iid-949414596";
    let target = "";
    vi.stubGlobal("window", { __APP: { states } });
    vi.stubGlobal("document", { scripts: [] });
    vi.stubGlobal("alert", (msg: string) => {
      throw new Error("alert: " + msg);
    });
    vi.stubGlobal("location", {
      hostname: "www.olx.co.id",
      origin: "https://www.olx.co.id",
      pathname: path,
      set href(v: string) {
        target = v;
      },
    });
    runBookmarklet("https://promo.example.com");
    vi.unstubAllGlobals();

    expect(target.startsWith("https://promo.example.com/admin/impor#d=")).toBe(true);
    const payload = decodePayload(target.slice(target.indexOf("#")));
    const ad = states.items.elements["949414596"];
    expect(payload).toEqual(compactAd(ad, "https://www.olx.co.id" + path));
    expect(normalizeOlx(payload)).toEqual(parseOlxHtml(html));
  });

  it("menolak dijalankan di luar OLX", () => {
    const alerts: string[] = [];
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", { scripts: [] });
    vi.stubGlobal("alert", (m: string) => alerts.push(m));
    vi.stubGlobal("location", { hostname: "www.google.com", origin: "https://www.google.com", pathname: "/search" });
    runBookmarklet("https://promo.example.com");
    vi.unstubAllGlobals();
    expect(alerts[0]).toMatch(/olx\.co\.id/);
  });

  it("kode bookmark tetap valid setelah disimpan browser (satu baris, tanpa komentar)", () => {
    const href = bookmarkletHref("https://promo.example.com");
    expect(href.startsWith("javascript:")).toBe(true);
    const js = decodeURIComponent(href.slice("javascript:".length));
    expect(js).not.toMatch(/[\r\n]/);
    // Browser membuang baris baru dari URL; kode harus tetap bisa di-parse.
    expect(() => new Function(js.replace(/[\r\n\t]/g, ""))).not.toThrow();
  });

  it("di halaman profil: mengirim semua iklan milik profil itu saja", () => {
    const states = fixtureStates();
    const own = states.items.elements["949414596"];
    const other = { ...own, id: "111", user_id: "999", title: "Iklan dealer lain" };
    const own2 = { ...own, id: "222", title: "Honda BR-V Prestige 2022" };
    states.items.elements = { "949414596": own, "111": other, "222": own2 };
    let target = "";
    vi.stubGlobal("window", { __APP: { states } });
    vi.stubGlobal("document", { scripts: [] });
    vi.stubGlobal("alert", (msg: string) => {
      throw new Error("alert: " + msg);
    });
    vi.stubGlobal("location", {
      hostname: "www.olx.co.id",
      origin: "https://www.olx.co.id",
      pathname: "/profile/44649495",
      set href(v: string) {
        target = v;
      },
    });
    runBookmarklet("https://promo.example.com");
    vi.unstubAllGlobals();
    const payload = decodePayload(target.slice(target.indexOf("#"))) as { bulk: { url: string; ad: { id: string } }[] };
    expect(payload.bulk.map((b) => b.ad.id).sort()).toEqual(["222", "949414596"]);
    expect(payload.bulk.find((b) => b.ad.id === "949414596")!.url).toBe(
      "https://www.olx.co.id/item/jeep-jk-sahara-asli-38-rubicon-wrangler-20112012-facelift-iid-949414596",
    );
    for (const item of payload.bulk) expect(() => normalizeOlx(item)).not.toThrow();
  });
});

describe("validasi", () => {
  it("menolak iklan tanpa harga atau foto", () => {
    const base = compactAd(fixtureStates().items.elements["949414596"], "https://www.olx.co.id/item/x-iid-949414596");
    expect(() => normalizeOlx({ ...base, ad: { ...base.ad, price: null } })).toThrow(OlxParseError);
    expect(() => normalizeOlx({ ...base, ad: { ...base.ad, images: [] } })).toThrow(OlxParseError);
    expect(() => normalizeOlx({ hello: 1 })).toThrow(OlxParseError);
  });
});
