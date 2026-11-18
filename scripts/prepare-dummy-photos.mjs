// Fase 1 saja: menyiapkan foto dummy (diambil dari website lama milik showroom)
// ke public/dummy/, plus blur placeholder. Fase 3 akan diganti pipeline sharp -> R2.
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const [src] = process.argv.slice(2);
if (!src) throw new Error("Usage: node scripts/prepare-dummy-photos.mjs <folder-foto-sumber>");

// urutan foto per mobil (indeks file c{car}_{n}.jpg), foto pertama = sampul
const plan = {
  "MS-0001": [0, [1, 0, 3, 4, 6, 5, 2, 7]],
  "MS-0002": [1, [0, 1, 3, 6, 2, 5, 4, 7]],
  "MS-0003": [2, [1, 2, 0, 4, 5, 3, 6, 7]],
  "MS-0004": [3, [1, 0, 2, 3, 4, 5, 6, 7]],
  "MS-0005": [4, [1, 2, 3, 0, 4, 5, 6, 7]],
  "MS-0006": [5, [4, 3, 0, 1, 2, 5, 6, 7]],
};

const out = {};
for (const [id, [car, order]] of Object.entries(plan)) {
  const dir = path.join("public/dummy", id);
  await fs.mkdir(dir, { recursive: true });
  out[id] = [];
  for (const [i, n] of order.entries()) {
    const file = path.join(src, `c${car}_${n}.jpg`);
    const img = sharp(file).rotate();
    const { width, height } = await img.metadata();
    await img.clone().resize(1600).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(dir, `${i + 1}.jpg`));
    const blur = await img.clone().resize(16).jpeg({ quality: 60 }).toBuffer();
    out[id].push({
      src: `/dummy/${id}/${i + 1}.jpg`,
      width: 1600,
      height: Math.round((1600 / width) * height),
      blurDataURL: `data:image/jpeg;base64,${blur.toString("base64")}`,
    });
  }
}
await fs.writeFile("src/lib/dummy-photos.json", JSON.stringify(out, null, 1));
console.log("ok", Object.keys(out).length);
