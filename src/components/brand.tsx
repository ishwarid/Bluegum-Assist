export function BluegumMark({ size = 26 }: { size?: number }) {
  // A gum leaf: one curved blade with a midrib.
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true">
      <path
        d="M5 21C5 11 11 4.5 22 4c.5 10.5-6 17-17 17Z"
        fill="var(--leaf)"
        stroke="var(--leaf-strong)"
        strokeWidth="1"
      />
      <path d="M5 21 16.5 9.5" stroke="var(--surface)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
