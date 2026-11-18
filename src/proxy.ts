import { NextResponse, type NextRequest } from "next/server";
import { canonicalPathById } from "@/lib/cars";

// /mobil/[id]-[slug]: ID adalah kunci, slug kosmetik. Slug lama/salah → 308 ke URL kanonis
// sebelum render (halaman detail diprerender, jadi redirect di level halaman tidak bisa mengirim status 308).
// Fase 2: routing host publik/admin juga ditangani di sini.
export async function proxy(req: NextRequest) {
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

export const config = {
  matcher: "/mobil/:path*",
};
