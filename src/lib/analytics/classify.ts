// Mengelompokkan asal kunjungan dari UTM, click id, dan referrer.
// Dipakai saat menyimpan event (server) dan diuji di tests/analytics.test.ts.

export type Channel = "meta_ads" | "meta_organic" | "google_ads" | "google" | "tiktok" | "direct" | "other";

export type Attribution = {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  clickId?: string | null; // "fbclid" | "gclid" | "ttclid"
  referrer?: string | null;
};

const META_SOURCE: Record<string, string> = {
  facebook: "facebook",
  fb: "facebook",
  "facebook.com": "facebook",
  meta: "facebook",
  instagram: "instagram",
  ig: "instagram",
  "instagram.com": "instagram",
  messenger: "messenger",
  msg: "messenger",
  an: "audience_network",
  audience_network: "audience_network",
  threads: "threads",
};

const PAID_MEDIUM = /^(paid|cpc|ppc|cpm|ads?|paid[_-]?social|social[_-]?paid|sponsored|display)$/i;

function refHost(ref?: string | null): string | null {
  if (!ref) return null;
  try {
    return new URL(ref).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function classify(a: Attribution): { channel: Channel; platform: string | null } {
  const src = (a.utmSource ?? "").trim().toLowerCase();
  const medium = (a.utmMedium ?? "").trim();
  const host = refHost(a.referrer);
  const paid = PAID_MEDIUM.test(medium);

  // Meta: dari UTM, fbclid, atau referrer facebook/instagram.
  let metaPlatform = META_SOURCE[src] ?? null;
  if (!metaPlatform && host) {
    if (/(^|\.)instagram\.com$/.test(host)) metaPlatform = "instagram";
    else if (/(^|\.)(facebook\.com|fb\.com|fb\.me)$/.test(host)) metaPlatform = "facebook";
    else if (/(^|\.)messenger\.com$/.test(host)) metaPlatform = "messenger";
    else if (/(^|\.)threads\.net$/.test(host)) metaPlatform = "threads";
  }
  if (metaPlatform || a.clickId === "fbclid") {
    // Iklan bila medium berbayar, atau sumber Meta disertai nama kampanye (pola parameter URL iklan Meta).
    const isAd = paid || (!!META_SOURCE[src] && !!a.utmCampaign);
    return { channel: isAd ? "meta_ads" : "meta_organic", platform: metaPlatform };
  }

  if (a.clickId === "gclid" || ((src === "google" || src === "adwords") && paid)) return { channel: "google_ads", platform: "google" };
  if (src === "google" || (host && /(^|\.)google\.[a-z.]+$/.test(host))) return { channel: "google", platform: "google" };
  if (a.clickId === "ttclid" || src === "tiktok" || (host && /tiktok\.com$/.test(host))) return { channel: "tiktok", platform: "tiktok" };
  if (!src && !host) return { channel: "direct", platform: null };
  return { channel: "other", platform: src || host };
}
