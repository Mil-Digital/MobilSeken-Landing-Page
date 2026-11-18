const nf = new Intl.NumberFormat("id-ID");

/** Rp 395 jt · Rp 1,25 M */
export function priceShort(rp: number) {
  if (rp >= 1_000_000_000) {
    const m = rp / 1_000_000_000;
    return `Rp ${m.toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
  }
  const jt = rp / 1_000_000;
  return `Rp ${jt.toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
}

/** Rp 395.000.000 */
export function priceFull(rp: number) {
  return `Rp ${nf.format(rp)}`;
}

/** 39.000 km */
export function km(n: number) {
  return `${nf.format(n)} km`;
}

/** 39rb · 1,2jt (untuk sel instrumen yang sempit) */
export function kmCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}jt`;
  if (n >= 1000) return `${Math.round(n / 1000)}rb`;
  return String(n);
}

export function transmissionShort(t: string) {
  return t === "Otomatis" ? "AT" : t === "Manual" ? "MT" : t;
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}
