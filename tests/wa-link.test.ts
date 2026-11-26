import { describe, expect, it } from "vitest";
import { isWhatsAppLink } from "../src/lib/track";

describe("link WhatsApp", () => {
  it("mengenali semua bentuk link WA", () => {
    for (const h of [
      "https://wa.me/6282121356565?text=Halo",
      "https://api.whatsapp.com/send?phone=6282121356565",
      "https://web.whatsapp.com/send?phone=6282121356565",
      "whatsapp://send?phone=6282121356565",
      "https://l.facebook.com/l.php?u=https%3A%2F%2Fwa.me%2F6282121356565",
      "https://l.instagram.com/?u=https%3A%2F%2Fapi.whatsapp.com%2Fsend",
    ])
      expect(isWhatsAppLink(h), h).toBe(true);
  });
  it("bukan link WA", () => {
    for (const h of ["/mobil/MS-0008", "tel:+6282121356565", "https://maps.app.goo.gl/x", "https://evil.com/wa.me/1", "https://fakewhatsapp.com/"])
      expect(isWhatsAppLink(h), h).toBe(false);
  });
});
