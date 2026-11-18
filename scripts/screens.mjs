// Screenshot review desain di viewport 390×844.
// Pemakaian: node scripts/screens.mjs [baseUrl] [outDir] [daftar-shot,dipisah,koma]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const base = process.argv[2] ?? "http://localhost:3000";
const out = process.argv[3] ?? "screenshots";
const only = process.argv[4]?.split(",");
await fs.mkdir(out, { recursive: true });

const IG_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 360.0.0.0 (iPhone15,2; iOS 18_1; id_ID; id; scale=3.00; 1179x2556)";

const browser = await chromium.launch();
const ctx = (width = 390, height = 844) =>
  browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: IG_IOS,
    locale: "id-ID",
  });

const shots = {
  async loader() {
    const c = await ctx();
    const p = await c.newPage();
    const t0 = Date.now();
    const go = p.goto(base + "/", { waitUntil: "commit" });
    await go;
    for (const ms of [150, 450, 800, 1150, 1400, 1800, 2600]) {
      const wait = ms - (Date.now() - t0);
      if (wait > 0) await p.waitForTimeout(wait);
      await p.screenshot({ path: `${out}/01-loader-${String(ms).padStart(4, "0")}ms.png` });
    }
    await c.close();
  },
  async home() {
    const c = await ctx();
    const p = await c.newPage();
    await p.goto(base + "/", { waitUntil: "networkidle" });
    await p.waitForTimeout(2800);
    await p.screenshot({ path: `${out}/02-home-hero.png` });
    await p.evaluate(() => window.scrollTo(0, window.innerHeight - 40));
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${out}/03-home-list.png` });
    await p.evaluate(() => window.scrollBy(0, 640));
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${out}/04-home-list-2.png` });
    // filter chip
    await p.getByRole("tab", { name: "Mercedes-Benz", exact: true }).click();
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${out}/05-home-chip-filter.png` });
    await p.getByRole("tab", { name: "Semua", exact: true }).click();
    // bottom sheet
    await p.getByRole("button", { name: /Filter lanjutan/ }).click();
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${out}/06-filter-sheet.png` });
    await p.keyboard.press("Escape");
    await p.waitForTimeout(600);
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${out}/07-home-showroom.png` });
    await p.screenshot({ path: `${out}/00-home-full.png`, fullPage: true });
    await c.close();
  },
  async hero() {
    // Hero di 390 (baseline) dan 360 (HP Android umum), lalu setelah satu kali berpindah.
    for (const [w, h] of [[390, 844], [360, 780]]) {
      const c = await ctx(w, h);
      const p = await c.newPage();
      await p.goto(base + "/", { waitUntil: "networkidle" });
      await p.waitForTimeout(2600);
      await p.screenshot({ path: `${out}/02-hero-${w}.png` });
      if (w === 390) {
        await p.waitForTimeout(5600);
        await p.screenshot({ path: `${out}/02-hero-${w}-berpindah.png` });
      }
      await c.close();
    }
  },
  async detail() {
    const c = await ctx();
    const p = await c.newPage();
    await p.goto(base + "/mobil/MS-0001", { waitUntil: "networkidle" });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${out}/08-detail-top.png` });
    await p.evaluate(() => window.scrollTo(0, 420));
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${out}/09-detail-specs.png` });
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${out}/10-detail-similar.png` });
    await p.screenshot({ path: `${out}/08-detail-full.png`, fullPage: true });
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(400);
    await p.locator("[data-gallery-open]").first().click();
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${out}/11-detail-fullscreen.png` });
    await c.close();
  },
  async morph() {
    const c = await ctx();
    const p = await c.newPage();
    await p.goto(base + "/", { waitUntil: "networkidle" });
    await p.waitForTimeout(2600);
    await p.evaluate(() => window.scrollTo(0, window.innerHeight - 40));
    await p.waitForTimeout(1500); // biarkan prefetch selesai
    const y0 = await p.evaluate(() => window.scrollY);
    await p.locator("article a").first().click();
    for (const ms of [60, 200, 340, 700]) {
      await p.waitForTimeout(ms === 60 ? 60 : ms - [60, 200, 340, 700][[60, 200, 340, 700].indexOf(ms) - 1]);
      await p.screenshot({ path: `${out}/13-morph-${String(ms).padStart(3, "0")}ms.png` });
    }
    await p.goBack();
    await p.waitForTimeout(1200);
    const y1 = await p.evaluate(() => window.scrollY);
    console.log(`scroll sebelum: ${y0}, setelah kembali: ${y1}`);
    await p.screenshot({ path: `${out}/14-back-to-list.png` });
    await c.close();
  },
  async sold() {
    const c = await ctx();
    const p = await c.newPage();
    await p.goto(base + "/mobil/MS-0006", { waitUntil: "networkidle" });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${out}/12-sold.png` });
    await p.screenshot({ path: `${out}/12-sold-full.png`, fullPage: true });
    await c.close();
  },
};

for (const [name, fn] of Object.entries(shots)) {
  if (only && !only.includes(name)) continue;
  try {
    await fn();
    console.log("ok", name);
  } catch (e) {
    console.error("gagal", name, e.message);
  }
}
await browser.close();
