// Angka berputar seperti odometer mekanis. Murni CSS (aman di server & prerender):
// setiap digit adalah kolom 0–9 dua kali yang berputar satu putaran penuh lalu berhenti di digitnya.
// Pembaca layar membaca nilai utuh lewat aria-label.

export function Odometer({
  value,
  className = "",
  delay = 0,
  stagger = 55,
}: {
  value: string;
  className?: string;
  /** jeda sebelum mulai (ms) */
  delay?: number;
  /** jeda antar digit (ms) */
  stagger?: number;
}) {
  let d = 0;
  return (
    <span className={`odo tnum ${className}`} role="text" aria-label={value}>
      {[...value].map((ch, i) => {
        if (!/\d/.test(ch)) {
          return (
            <span key={i} aria-hidden>
              {ch === " " ? "\u00A0" : ch}
            </span>
          );
        }
        const n = Number(ch);
        const idx = d++;
        return (
          <span key={i} className="odo-cell" aria-hidden>
            <span
              className="odo-col"
              style={
                {
                  "--to": 10 + n,
                  animationDelay: `${delay + idx * stagger}ms`,
                } as React.CSSProperties
              }
            >
              {"01234567890123456789".split("").map((x, k) => (
                <span key={k}>{x}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
