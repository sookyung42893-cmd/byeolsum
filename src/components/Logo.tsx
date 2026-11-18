import { useId } from 'react';
import { sparklePath } from './Sparkle';

/** 마크 viewBox 가로·세로 비율 (워드마크 옆 간격 계산에 쓴다) */
export const LOGO_ASPECT = 100 / 120;

/**
 * 별숨 로고 마크: 별자리 선으로 그린 "ㅂ" + 오른쪽 위 금빛 반짝이.
 * 배경 없이 선과 별 점만 그리고, 반짝이와 빛 번짐까지 모두 viewBox 안에 들어오게 잡았다.
 * 장식용이라 스크린리더에는 숨기고, 옆의 "별숨" 글자가 이름을 맡는다.
 */
export default function Logo({ className = 'h-16 w-auto' }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  const L = 9;
  const R = 74;
  const T = 24;
  const M = 68;
  const B = 112;
  const path = `M ${L} ${T} V ${B} H ${R} V ${T} M ${L} ${M} H ${R}`;
  return (
    <svg viewBox="0 0 100 120" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor="#F4C979" stopOpacity="0.55" />
          <stop offset="0.6" stopColor="#F4C979" stopOpacity="0.2" />
          <stop offset="1" stopColor="#F4C979" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>

      {/* 별자리 선 (살짝 번지는 빛 + 선). 맨 위 가로선은 없다 */}
      <g fill="none" stroke="#9AA2F0" strokeLinecap="round">
        <path d={path} strokeWidth={6} strokeOpacity={0.35} filter={`url(#${id}-soft)`} />
        <path d={path} strokeWidth={3.2} />
      </g>

      {/* 별 점 */}
      <g fill="#F2F3FF">
        <circle cx={L} cy={T} r={6.5} />
        <circle cx={L} cy={M} r={5} />
        <circle cx={R} cy={M} r={6.5} />
        <circle cx={L} cy={B} r={6} />
        <circle cx={R} cy={B} r={5} />
      </g>

      {/* 오른쪽 위 금빛 반짝이: 빛 번짐까지 마크 영역(100×120) 안에 */}
      <circle cx={R} cy={T} r={20} fill={`url(#${id}-glow)`} />
      <circle cx={R} cy={T} r={14} fill="#F4C979" fillOpacity={0.18} />
      <path d={sparklePath(R, T, 13, 0.2)} fill="#F4C979" />
    </svg>
  );
}
