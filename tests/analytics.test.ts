import { describe, expect, it } from "vitest";
import { classify } from "../src/lib/analytics/classify";

describe("asal kunjungan", () => {
  it("iklan Meta dengan parameter URL dinamis", () => {
    expect(classify({ utmSource: "ig", utmMedium: "paid", utmCampaign: "Stok Desember", clickId: "fbclid" })).toEqual({
      channel: "meta_ads",
      platform: "instagram",
    });
    expect(classify({ utmSource: "fb", utmCampaign: "Leads SUV" })).toEqual({ channel: "meta_ads", platform: "facebook" });
  });

  it("Meta tanpa UTM dihitung organik", () => {
    expect(classify({ clickId: "fbclid", referrer: "https://l.instagram.com/" })).toEqual({ channel: "meta_organic", platform: "instagram" });
    expect(classify({ referrer: "https://m.facebook.com/" })).toEqual({ channel: "meta_organic", platform: "facebook" });
  });

  it("Google, langsung, dan lainnya", () => {
    expect(classify({ clickId: "gclid" }).channel).toBe("google_ads");
    expect(classify({ referrer: "https://www.google.co.id/" }).channel).toBe("google");
    expect(classify({}).channel).toBe("direct");
    expect(classify({ referrer: "https://www.olx.co.id/item/x" })).toEqual({ channel: "other", platform: "olx.co.id" });
  });
});
