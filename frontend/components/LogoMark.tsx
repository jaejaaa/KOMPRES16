// Bidang tanah + 4 patok batas + tanda centang = "tanah yang sudah dicek"
export default function LogoMark({ size = 28 }: { size?: number }) {
  const patok = [[6, 9], [24, 5], [27, 22], [9, 27]];
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path d="M6 9 L24 5 L27 22 L9 27 Z" fill="none" stroke="var(--color-brand)" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M11 16.5 l3.5 3.5 l6.5 -7" fill="none" stroke="var(--color-brand)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {patok.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.3" fill="var(--color-brass)" />)}
    </svg>
  );
}
