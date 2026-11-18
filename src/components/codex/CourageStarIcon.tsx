/** 용기의 별: 도전 미션을 시도할 때마다 하나 (결과와 상관없이). 일반 별과 다른 다섯 갈래 별 */
export default function CourageStarIcon({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path
        d="M20 3 L25 14.5 L37.5 15.5 L28 23.8 L31 36 L20 29.5 L9 36 L12 23.8 L2.5 15.5 L15 14.5 Z"
        fill="#F4C979"
        stroke="#FFE7B0"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <circle cx={16} cy={21} r={1.4} fill="#2A2350" />
      <circle cx={24} cy={21} r={1.4} fill="#2A2350" />
      <path d="M18 24.5 Q 20 26.5 22 24.5" fill="none" stroke="#2A2350" strokeWidth={1.2} strokeLinecap="round" />
    </svg>
  );
}
