import { useId, type CSSProperties } from 'react';

/** 네 갈래로 뾰족한 반짝이 별(✦)의 SVG path. r은 중심에서 끝까지 길이 */
export function sparklePath(cx: number, cy: number, r: number, fatness = 0.18): string {
  const k = r * fatness;
  return [
    `M ${cx} ${cy - r}`,
    `Q ${cx + k} ${cy - k} ${cx + r} ${cy}`,
    `Q ${cx + k} ${cy + k} ${cx} ${cy + r}`,
    `Q ${cx - k} ${cy + k} ${cx - r} ${cy}`,
    `Q ${cx - k} ${cy - k} ${cx} ${cy - r}`,
    'Z',
  ].join(' ');
}

/** 가운데가 가장 두껍고 양 끝으로 갈수록 바늘처럼 가늘어지는 가로 빛살 하나 */
function rayPath(cx: number, cy: number, r: number, w: number): string {
  return `M ${cx - r} ${cy} Q ${cx} ${cy - w} ${cx + r} ${cy} Q ${cx} ${cy + w} ${cx - r} ${cy} Z`;
}

/** 별 중심(cx,cy)에서 오른쪽(+x)으로 뻗는 빛 갈래 하나. 중심이 가장 두껍고 끝으로 갈수록 가늘어진다 */
function armPath(cx: number, cy: number, len: number, w: number): string {
  return `M ${cx} ${cy - w} Q ${cx + len * 0.5} ${cy - w * 0.5} ${cx + len} ${cy} Q ${cx + len * 0.5} ${cy + w * 0.5} ${cx} ${cy + w} Z`;
}

/**
 * 물든 갈래의 그라데이션: 중심 쪽은 원래 별빛, 바깥쪽으로 갈수록 렌즈 색이 섞인다.
 * t가 0→1로 가면 렌즈 색이 중심 근처에서 바깥으로 스며 나간다.
 */
function ArmGradient({ id, cx, cy, len, color, tint }: { id: string; cx: number; cy: number; len: number; color: string; tint: ArmTint }) {
  const t = Math.max(0, Math.min(1, tint.t));
  // 스며든 앞자락 위치: 중심 근처(0.25)에서 끝(1)까지
  const front = 0.25 + 0.75 * t;
  const mid = mixColor(color, tint.color, 0.75 * t);
  const outer = mixColor(color, tint.color, t);
  return (
    <defs>
      <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={cx} y1={cy} x2={cx + len} y2={cy}>
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
        <stop offset="0.14" stopColor={color} stopOpacity="1" />
        <stop offset="0.25" stopColor={mixColor(color, tint.color, 0.35 * t)} stopOpacity="1" />
        <stop offset={0.25 + (front - 0.25) * 0.45} stopColor={mid} stopOpacity={0.95} />
        <stop offset={front} stopColor={outer} stopOpacity={0.85} />
        <stop offset="1" stopColor={t >= 1 ? outer : color} stopOpacity={t >= 1 ? 0.12 : 0} />
      </linearGradient>
    </defs>
  );
}

/** 두 색을 t(0~1) 비율로 섞는다 */
export function mixColor(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

/** 십자 갈래 하나에 스며든 색. t: 스며든 정도 (관측 직후 연출 0→1, 평소 1) */
export interface ArmTint {
  color: string;
  t: number;
}

/** 십자 갈래 순서: 위 → 오른쪽 → 아래 → 왼쪽 (각도, 오른쪽 기준 시계 방향) */
const ARM_ANGLES = [-90, 0, 90, 180];

/**
 * 렌즈 플레어처럼 빛나는 반짝이 별.
 * 가늘고 긴 십자 빛살과 짧은 대각선 빛살은 가운데에서 끝으로 갈수록 투명해지고,
 * 중심에는 하얗게 번지는 빛망울이 있다. r은 긴 빛살의 길이.
 * arms를 주면 십자 갈래 4개(위·오른쪽·아래·왼쪽)를 각각 그리고, 물든 갈래는 바깥쪽으로 그 색이 스며든다.
 */
export function SparkleStar({
  cx,
  cy,
  r,
  color = '#FFFFFF',
  opacity = 1,
  glow = 1,
  twinkle = false,
  delay = 0,
  arms,
}: {
  cx: number;
  cy: number;
  r: number;
  color?: string;
  opacity?: number;
  /** 중심 빛망울 세기 (0~1) */
  glow?: number;
  twinkle?: boolean;
  /** 반짝임 박자를 별마다 다르게 (초) */
  delay?: number;
  /** 십자 갈래별 색 (위·오른쪽·아래·왼쪽 순, 물들지 않은 갈래는 null) */
  arms?: (ArmTint | null)[];
}) {
  const id = useId().replace(/:/g, '');
  const ray = `ray-${id}`;
  const halo = `halo-${id}`;
  const style: CSSProperties | undefined = twinkle ? { animationDelay: `${-delay}s` } : undefined;
  const w = Math.max(0.9, r * 0.045);
  const tinted = arms?.some(Boolean) ?? false;

  return (
    <g opacity={opacity}>
      <defs>
        <radialGradient id={ray}>
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="0.18" stopColor={color} stopOpacity="0.95" />
          <stop offset="0.55" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={halo}>
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.95 * glow} />
          <stop offset="0.25" stopColor={color} stopOpacity={0.55 * glow} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r * 0.42} fill={`url(#${halo})`} />
      <g className={twinkle ? 'twinkle-soft' : undefined} style={style}>
        {/* 긴 십자 빛살: 세로가 조금 더 길다 */}
        {tinted ? (
          ARM_ANGLES.map((deg, k) => {
            const tint = arms?.[k] ?? null;
            const base = deg === -90 || deg === 90 ? r : r * 0.85;
            // 물든 갈래는 20%쯤 길게
            const len = base * (1 + 0.2 * (tint?.t ?? 0));
            const gid = `${ray}-arm${k}`;
            return (
              <g key={deg} transform={`rotate(${deg} ${cx} ${cy})`}>
                {tint && <ArmGradient id={gid} cx={cx} cy={cy} len={len} color={color} tint={tint} />}
                {/* 물든 갈래: 굵은 빛 번짐을 아래에 한 겹 깔아 색이 잘 보이게 */}
                {tint && (
                  <path d={armPath(cx, cy, len, w * 3.2)} fill={`url(#${gid})`} opacity={0.45 * tint.t} filter={`url(#${ray}-soft)`} />
                )}
                <path d={armPath(cx, cy, len, tint ? w * 1.6 : w)} fill={tint ? `url(#${gid})` : `url(#${ray}-plain)`} />
              </g>
            );
          })
        ) : (
          <>
            <path d={rayPath(cx, cy, r * 0.85, w * 2)} fill={`url(#${ray})`} />
            <path d={rayPath(cx, cy, r, w * 2)} fill={`url(#${ray})`} transform={`rotate(90 ${cx} ${cy})`} />
          </>
        )}
        {tinted && (
          <defs>
            <filter id={`${ray}-soft`} x="-20%" y="-200%" width="140%" height="500%">
              <feGaussianBlur stdDeviation={Math.max(0.8, r * 0.03)} />
            </filter>
            {/* 물들지 않은 갈래: 원래 별빛 그대로 (중심에서 끝까지 한 방향 그라데이션) */}
            <linearGradient id={`${ray}-plain`} gradientUnits="objectBoundingBox" x1="0" y1="0.5" x2="1" y2="0.5">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="0.18" stopColor={color} stopOpacity="0.95" />
              <stop offset="0.55" stopColor={color} stopOpacity="0.35" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
        )}
        {/* 짧은 대각선 빛살 */}
        <path d={rayPath(cx, cy, r * 0.42, w * 1.6)} fill={`url(#${ray})`} transform={`rotate(45 ${cx} ${cy})`} opacity={0.8} />
        <path d={rayPath(cx, cy, r * 0.42, w * 1.6)} fill={`url(#${ray})`} transform={`rotate(-45 ${cx} ${cy})`} opacity={0.8} />
        <circle cx={cx} cy={cy} r={Math.max(1, r * 0.06)} fill="#FFFFFF" />
      </g>
    </g>
  );
}
