import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { Car } from "../src/lib/cars";
import { capiPayload, cookieValue } from "../src/lib/meta/capi";
import { contentFor, metaEventsFor } from "../src/lib/meta/events";
import { catalogCsv, priceBand } from "../src/lib/meta/feed";

describe("event Meta", () => {
  const ev = (type: Parameters<typeof metaEventsFor>[0]["type"], car: string | null, path: string, extra = {}) =>
    metaEventsFor({ type, eventId: "abc12345", car, path, ...extra });

  it("halaman mobil → PageView + ViewContent dengan id berbeda", () => {
    expect(ev("page_view", "MS-0007", "/mobil/MS-0007-toyota")).toEqual([
      { name: "PageView", id: "abc12345", car: null },
      { name: "ViewContent", id: "abc12345-vc", car: "MS-0007" },
    ]);
    expect(ev("page_view", null, "/")).toEqual([{ name: "PageView", id: "abc12345", car: null }]);
    // pindah halaman tanpa muat ulang: hanya ViewContent
    expect(ev("page_view", "MS-0007", "/mobil/MS-0007-a", { nav: true })).toEqual([{ name: "ViewContent", id: "abc12345-vc", car: "MS-0007" }]);
    expect(ev("page_view", null, "/", { nav: true })).toEqual([]);
  });

  it("pilih jenis → ViewCategory dengan unit teratas", () => {
    const [e] = ev("category", null, "/", { label: "SUV", ids: ["MS-0001", "MS-0002"] });
    expect(e).toEqual({ name: "ViewCategory", id: "abc12345", car: null, category: "SUV", ids: ["MS-0001", "MS-0002"] });
    expect(contentFor(e)).toEqual({ content_category: "SUV", content_type: "product", content_ids: ["MS-0001", "MS-0002"] });
    expect(ev("category", null, "/", { label: "Semua" })).toEqual([]);
  });

  it("WhatsApp/telepon → Contact, event lain tidak dikirim", () => {
    expect(ev("wa_click", "MS-0007", "/mobil/MS-0007-a")).toEqual([{ name: "Contact", id: "abc12345", car: "MS-0007" }]);
    expect(ev("tel_click", null, "/")[0].name).toBe("Contact");
    expect(ev("brand", null, "/", { label: "Toyota" })).toEqual([]);
    expect(ev("card_click", "MS-0007", "/")).toEqual([]);
  });

  it("payload Conversions API", () => {
    const [vc] = capiPayload({
      events: [{ name: "ViewContent", id: "e1-vc", car: "MS-0007" }],
      url: "https://x.test/mobil/MS-0007-a",
      ip: "1.2.3.4",
      ua: "Mozilla/5.0",
      fbp: "fb.1.1.2",
      fbc: null,
      visitor: "visitor123",
      car: { name: "Toyota Fortuner 2020", price: 450_000_000 },
      now: 1_700_000_000_000,
    });
    expect(vc).toMatchObject({
      event_name: "ViewContent",
      event_id: "e1-vc",
      event_time: 1_700_000_000,
      action_source: "website",
      user_data: {
        client_ip_address: "1.2.3.4",
        fbp: "fb.1.1.2",
        external_id: [createHash("sha256").update("visitor123").digest("hex")],
      },
      custom_data: { content_ids: ["MS-0007"], content_type: "product", value: 450_000_000, currency: "IDR" },
    });
    expect(vc.user_data).not.toHaveProperty("fbc");
  });

  it("membaca cookie _fbp", () => {
    expect(cookieValue("a=1; _fbp=fb.1.123.456; _fbc=fb.1.9.abc", "_fbp")).toBe("fb.1.123.456");
    expect(cookieValue("a=1", "_fbc")).toBeNull();
    expect(cookieValue(null, "_fbp")).toBeNull();
  });
});

describe("feed katalog", () => {
  const base: Car = {
    id: "MS-0007",
    status: "ready",
    featured: false,
    brand: "Toyota",
    model: "Fortuner",
    variant: "VRZ, \"TRD\"",
    year: 2020,
    price: 450_000_000,
    mileageKm: 45_000,
    transmission: "Otomatis",
    fuel: "Diesel",
    color: "Putih",
    bodyType: "SUV",
    category: "SUV",
    location: "Bandung",
    description: "Tangan pertama.\nServis rutin.",
    specs: [],
    images: [
      { src: "/dummy/a.jpg", width: 1200, height: 800, blurDataURL: "" },
      { src: "https://cdn.test/b.jpg", width: 1200, height: 800, blurDataURL: "" },
    ],
    createdAt: "2026-11-01",
  };

  it("CSV sesuai format Meta, kutip & koma aman", () => {
    const csv = catalogCsv([base, { ...base, id: "MS-0008", status: "sold" }, { ...base, id: "MS-0009", price: 0 }], "https://x.test");
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe(
      "id,title,description,availability,condition,price,link,image_link,additional_image_link,brand,google_product_category,product_type,custom_label_0,custom_label_1,custom_label_2,custom_label_3",
    );
    expect(lines).toHaveLength(3); // mobil tanpa harga dilewati
    expect(lines[1]).toContain('MS-0007,"Toyota Fortuner VRZ, ""TRD"" 2020"');
    expect(lines[1]).toContain(",in stock,used,450000000 IDR,https://x.test/mobil/MS-0007-");
    expect(lines[1]).toContain(",https://x.test/dummy/a.jpg,https://cdn.test/b.jpg,Toyota,916,Mobil bekas > SUV,SUV,2020,Otomatis,300–500 jt");
    expect(lines[1]).toContain("Tangan pertama. Servis rutin.");
    expect(lines[2]).toContain(",out of stock,");
  });

  it("rentang harga", () => {
    expect(priceBand(99_000_000)).toBe("< 150 jt");
    expect(priceBand(150_000_000)).toBe("150–300 jt");
    expect(priceBand(1_200_000_000)).toBe("> 500 jt");
  });
});
