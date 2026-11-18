"use client";

// Koordinasi kecil antara loader dan hero (tanpa context agar tidak memaksa re-render).
// Status ditulis ke <html data-intro>: (kosong) = loader main, "reveal" = sedang membuka, "done" | "skip".

let resolveHero: () => void;
export const heroReady = new Promise<void>((r) => (resolveHero = r));
export const markHeroReady = () => resolveHero();

export type IntroState = "" | "reveal" | "done" | "skip";

export function getIntroState(): IntroState {
  if (typeof document === "undefined") return "";
  return (document.documentElement.dataset.intro ?? "") as IntroState;
}

export function setIntroState(s: IntroState) {
  document.documentElement.dataset.intro = s;
  window.dispatchEvent(new CustomEvent("ms-intro", { detail: s }));
}

/** Panggil fn saat hero boleh mulai beranimasi (loader selesai atau dilewati). */
export function onIntroReveal(fn: () => void) {
  const s = getIntroState();
  if (s !== "") {
    fn();
    return () => {};
  }
  const h = (e: Event) => {
    if ((e as CustomEvent).detail === "reveal") fn();
  };
  window.addEventListener("ms-intro", h);
  return () => window.removeEventListener("ms-intro", h);
}
