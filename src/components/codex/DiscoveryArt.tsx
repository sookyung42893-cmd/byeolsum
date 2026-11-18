import { useId, type ReactNode } from 'react';
import { sparklePath } from '../Sparkle';

/** 귀여운 얼굴: 동그란 눈, 볼터치, 작은 웃음 */
function Face({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={-9} cy={0} rx={2.6} ry={3.4} fill="#2A2350" />
      <ellipse cx={9} cy={0} rx={2.6} ry={3.4} fill="#2A2350" />
      <circle cx={-8.2} cy={-1.2} r={0.9} fill="#FFFFFF" />
      <circle cx={9.8} cy={-1.2} r={0.9} fill="#FFFFFF" />
      <ellipse cx={-15} cy={6} rx={4} ry={2.4} fill="#FF7A9A" opacity={0.55} />
      <ellipse cx={15} cy={6} rx={4} ry={2.4} fill="#FF7A9A" opacity={0.55} />
      <path d="M -4 5 Q 0 9 4 5" fill="none" stroke="#2A2350" strokeWidth={1.8} strokeLinecap="round" />
    </g>
  );
}

function Twinkles({ color = '#FFF6D8' }: { color?: string }) {
  return (
    <g fill={color}>
      <path d={sparklePath(18, 24, 6, 0.12)} />
      <path d={sparklePath(102, 30, 4.5, 0.12)} />
      <path d={sparklePath(100, 100, 5, 0.12)} />
    </g>
  );
}

/** 1. 첫불 행성 · 불씨 결정 */
function Ember({ g }: { g: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${g}-a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFD089" />
          <stop offset="1" stopColor="#FF8A4C" />
        </linearGradient>
      </defs>
      <path d="M60 10 C 71 22 69 31 60 36 C 51 31 49 22 60 10 Z" fill="#FFE08A" />
      <path d="M60 20 C 65 26 64 31 60 33 C 56 31 55 26 60 20 Z" fill="#FFF6D8" />
      <polygon points="60,34 84,52 77,96 43,96 36,52" fill={`url(#${g}-a)`} />
      <polygon points="60,34 70,52 60,96 50,52" fill="#FFFFFF" opacity={0.22} />
      <polygon points="36,52 50,52 43,96" fill="#E8692E" opacity={0.35} />
      <Face x={60} y={70} s={0.9} />
    </>
  );
}

/** 2. 이름 행성 · 이름 광석 (이름표를 단 광석) */
function NameOre({ g }: { g: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${g}-a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE3A3" />
          <stop offset="1" stopColor="#E0A845" />
        </linearGradient>
      </defs>
      <path d="M28 84 L34 56 L54 40 L80 44 L94 66 L86 94 L42 98 Z" fill={`url(#${g}-a)`} />
      <polygon points="54,40 80,44 66,60" fill="#FFFFFF" opacity={0.35} />
      <polygon points="28,84 34,56 46,74" fill="#C98F2E" opacity={0.35} />
      <path d="M80 44 Q 88 30 92 24" fill="none" stroke="#C9A06A" strokeWidth={1.5} />
      <g transform="rotate(14 98 22)">
        <rect x={82} y={14} width={30} height={17} rx={4} fill="#FFF8E6" stroke="#E0A845" strokeWidth={1.5} />
        <circle cx={86.5} cy={22.5} r={1.8} fill="#E0A845" />
        <rect x={91} y={20} width={16} height={2.4} rx={1.2} fill="#C98F2E" />
        <rect x={91} y={24.5} width={11} height={2.4} rx={1.2} fill="#E0A845" />
      </g>
      <Face x={60} y={72} s={0.9} />
    </>
  );
}

/** 3. 두근 행성 · 두근이 (콩닥콩닥 하트) */
function Heart({ g }: { g: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${g}-a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFB8C7" />
          <stop offset="1" stopColor="#FF6F8E" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="#FFB8C7" strokeWidth={2.5} strokeLinecap="round">
        <path d="M16 54 Q 10 62 16 70" />
        <path d="M8 50 Q 0 62 8 74" opacity={0.6} />
        <path d="M104 54 Q 110 62 104 70" />
        <path d="M112 50 Q 120 62 112 74" opacity={0.6} />
      </g>
      <path
        d="M60 98 C 30 78 20 60 28 44 C 36 28 54 30 60 44 C 66 30 84 28 92 44 C 100 60 90 78 60 98 Z"
        fill={`url(#${g}-a)`}
      />
      <ellipse cx={42} cy={46} rx={7} ry={4.5} fill="#FFFFFF" opacity={0.55} transform="rotate(-30 42 46)" />
      <Face x={60} y={64} s={0.95} />
    </>
  );
}

/** 4. 거울 행성 · 렌즈 */
function Lens({ g }: { g: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${g}-a`} cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#C8CEFF" />
        </radialGradient>
      </defs>
      <rect x={78} y={74} width={13} height={36} rx={6.5} fill="#8A78C9" transform="rotate(-45 84 92)" />
      <circle cx={54} cy={54} r={34} fill="#8E98F0" />
      <circle cx={54} cy={54} r={27} fill={`url(#${g}-a)`} />
      <path d="M34 42 Q 40 30 52 28" fill="none" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" opacity={0.9} />
      <Face x={54} y={58} s={0.9} />
    </>
  );
}

/** 5. 너울 행성 · 파도 진주 */
function Pearl({ g }: { g: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${g}-a`} cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.6" stopColor="#EAF2FF" />
          <stop offset="1" stopColor="#B9D3FF" />
        </radialGradient>
      </defs>
      <path d="M8 46 Q 22 30 38 42 Q 50 52 62 40" fill="none" stroke="#7FB8FF" strokeWidth={5} strokeLinecap="round" opacity={0.7} />
      <path d="M58 30 Q 76 18 92 30 Q 104 40 114 32" fill="none" stroke="#7FB8FF" strokeWidth={5} strokeLinecap="round" opacity={0.5} />
      <path d="M18 76 Q 60 112 102 76 Z" fill="#5E9BEA" />
      <g stroke="#3F7FD3" strokeWidth={1.6} opacity={0.6}>
        <path d="M60 78 L60 98" />
        <path d="M45 78 L40 94" />
        <path d="M75 78 L80 94" />
        <path d="M32 78 L26 88" />
        <path d="M88 78 L94 88" />
      </g>
      <circle cx={60} cy={62} r={20} fill={`url(#${g}-a)`} />
      <Face x={60} y={64} s={0.75} />
    </>
  );
}

/** 6. 별빛 행성 · 별빛 유리병 */
function Jar({ g }: { g: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${g}-a`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#B7A6F5" stopOpacity={0.55} />
          <stop offset="1" stopColor="#E3D3FF" stopOpacity={0.3} />
        </linearGradient>
      </defs>
      <rect x={46} y={18} width={28} height={14} rx={4} fill="#C79A6B" />
      <rect x={42} y={30} width={36} height={8} rx={3} fill="#E3E8FF" opacity={0.8} />
      <rect x={32} y={38} width={56} height={64} rx={18} fill={`url(#${g}-a)`} stroke="#EEF0FF" strokeWidth={2} />
      <g fill="#FFE08A">
        <path d={sparklePath(46, 56, 7, 0.14)} />
        <path d={sparklePath(74, 52, 5, 0.14)} />
        <path d={sparklePath(72, 90, 6, 0.14)} />
        <path d={sparklePath(44, 92, 4, 0.14)} />
      </g>
      <path d="M38 50 Q 36 64 38 78" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" opacity={0.6} />
      <Face x={60} y={74} s={0.85} />
    </>
  );
}

const ART: Record<number, (p: { g: string }) => ReactNode> = {
  1: Ember,
  2: NameOre,
  3: Heart,
  4: Lens,
  5: Pearl,
  6: Jar,
};

/** 행성 번호로 발견물 그림을 그린다 (viewBox 0 0 120 120) */
export default function DiscoveryArt({ planetId, sparkle = false }: { planetId: number; sparkle?: boolean }) {
  const g = useId().replace(/:/g, '');
  const Art = ART[planetId];
  return (
    <svg viewBox="0 0 120 120" className="block h-full w-full" aria-hidden="true">
      {sparkle && <Twinkles />}
      {Art && <Art g={g} />}
    </svg>
  );
}
