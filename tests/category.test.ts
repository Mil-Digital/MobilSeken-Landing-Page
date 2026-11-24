import { describe, expect, it } from "vitest";
import { suggestCategory } from "../src/lib/category";

describe("saran kategori (SUV / MPV / Sedan)", () => {
  it("mengikuti tipe bodi OLX", () => {
    expect(suggestCategory({ model: "Seltos", bodyType: "SUV" })).toBe("SUV");
    expect(suggestCategory({ model: "Sahara", bodyType: "Jeep" })).toBe("SUV");
    expect(suggestCategory({ model: "Vellfire", bodyType: "Van" })).toBe("MPV");
    expect(suggestCategory({ model: "CLA200", bodyType: "Sedan" })).toBe("Sedan");
  });

  it("hatchback, coupe, dan city car masuk Sedan", () => {
    expect(suggestCategory({ model: "Yaris", bodyType: "Hatchback" })).toBe("Sedan");
    expect(suggestCategory({ model: "Beetle", bodyType: "Coupe" })).toBe("Sedan");
    expect(suggestCategory({ model: "Abarth", bodyType: "Compact & City Car" })).toBe("Sedan");
  });

  it("membetulkan tipe bodi OLX yang keliru lewat nama model", () => {
    expect(suggestCategory({ model: "Trailblazer", bodyType: "MPV" })).toBe("SUV");
    expect(suggestCategory({ model: "Tiguan Allspace", bodyType: "MPV" })).toBe("SUV");
    expect(suggestCategory({ model: "Kijang Innova", variant: "2.0 Zenix", bodyType: "SUV" })).toBe("MPV");
    expect(suggestCategory({ model: "GLA200", bodyType: "Hatchback" })).toBe("SUV");
    expect(suggestCategory({ model: "Pajero Sport", variant: "Dakar 4x2", bodyType: "-" })).toBe("SUV");
  });
});
