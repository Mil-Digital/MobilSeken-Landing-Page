/**
 * Teks yang "menggulung" saat induknya (a/button) di-hover: teks naik keluar, salinannya naik masuk.
 * Hanya di perangkat ber-mouse; di layar sentuh tampil diam. Pembaca layar hanya membaca salinan pertama.
 */
export function RollText({ children, className = "" }: { children: string; className?: string }) {
  return (
    <span className={`roll ${className}`}>
      <span className="roll-a">{children}</span>
      <span className="roll-b" aria-hidden>
        {children}
      </span>
    </span>
  );
}
