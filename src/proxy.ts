import { NextResponse, type NextRequest } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { canonicalPathById } from "@/lib/cars";

// /mobil/[id]-[slug]: ID adalah kunci, slug kosmetik. Slug lama/salah → 308 ke URL kanonis
// sebelum render (halaman detail diprerender, jadi redirect di level halaman tidak bisa mengirim status 308).
// Fase 2: routing host publik/admin juga ditangani di sini.
export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/admin")) return adminGate(req);

  const match = /^\/mobil\/(MS-\d{4})(?:-[^/]*)?\/?$/i.exec(req.nextUrl.pathname);
  if (!match) return NextResponse.next();

  const canonical = await canonicalPathById(match[1].toUpperCase());
  if (!canonical) {
    // ID tidak dikenal: status 404 sungguhan (halaman detail yang di-stream tidak bisa mengubah status).
    const url = req.nextUrl.clone();
    url.pathname = "/_mobil-tidak-ada";
    return NextResponse.rewrite(url, { status: 404 });
  }
  if (canonical !== req.nextUrl.pathname) {
    const url = req.nextUrl.clone();
    url.pathname = canonical;
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

function adminGate(req: NextRequest) {
  const gate = checkAdmin(req.headers.get("authorization"));
  if (gate === "open" || gate === "ok") {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }
  if (gate === "unconfigured") {
    return new NextResponse("Admin belum diaktifkan: isi env ADMIN_PASSWORD di Vercel.", { status: 503 });
  }
  return new NextResponse("Butuh login admin.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="MS Garage Admin", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/mobil/:path*", "/admin", "/admin/:path*"],
};
