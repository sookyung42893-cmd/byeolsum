import type { CheckIn, DB, Lens, StrategyUse } from '../types';
import { LENSES } from '../types';

/** 망원경 렌즈마다 별빛 갈래에 스며드는 색 (채도를 낮춘 부드러운 색) */
export const LENS_TINT: Record<Lens, string> = {
  '1년 뒤 궤도': '#9FD8F0', // 하늘색
  '친구별 시점': '#B8E6A0', // 연두색
  '3인칭 관측일지': '#CDB8F5', // 연보라색
};

/** 별의 십자 갈래 수. 관측 1번당 갈래 하나(위 → 오른쪽 → 아래 → 왼쪽)가 물들고, 넘으면 더 바꾸지 않는다 */
export const TINTABLE_ARMS = 4;

export const isLens = (s: string): s is Lens => (LENSES as readonly string[]).includes(s);

/** 이 체크인으로 한 망원경 관측 기록 (오래된 것부터) */
export function lensUsesOf(db: DB, checkInId: string): StrategyUse[] {
  return db.strategyUses
    .filter((u) => u.checkInId === checkInId && isLens(u.strategy))
    .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
}

/**
 * 별 크기·밝기에 쓰는 강도: 관측을 했다면 가장 최근 관측 후 강도까지 줄어든다 (늘어나지는 않음).
 * 별이 없어지지는 않는다 (강도 0이어도 작은 별로 남음).
 */
export function displayIntensity(c: CheckIn, uses: StrategyUse[]): number {
  const last = uses[uses.length - 1];
  return last ? Math.min(c.intensity, last.actualAfter) : c.intensity;
}

export const starRadius = (intensity: number) => 3 + intensity * 0.9;
export const starOpacity = (intensity: number) => 0.45 + intensity * 0.055;

/**
 * 가까운 별끼리 살짝 밀어낸다.
 * minGap보다 가까운 쌍을 서로 반대 방향으로 밀고, 원래 자리에서 maxShift 넘게는 못 가게 묶는다.
 * 좌표는 viewBox 단위 (화면 폭과 거의 1:1).
 */
export function spreadPoints(
  points: { x: number; y: number }[],
  minGap = 32,
  maxShift = 12,
  iterations = 30,
): { x: number; y: number }[] {
  const out = points.map((p) => ({ ...p }));
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        let dx = out[j].x - out[i].x;
        let dy = out[j].y - out[i].y;
        let d = Math.hypot(dx, dy);
        if (d >= minGap) continue;
        if (d < 0.01) {
          // 완전히 겹치면 순서에 따라 정해진 방향으로
          const a = (i * 2.399 + j) % (Math.PI * 2);
          dx = Math.cos(a);
          dy = Math.sin(a);
          d = 1;
        }
        const push = (minGap - d) / 2;
        const ux = dx / d;
        const uy = dy / d;
        out[i].x -= ux * push;
        out[i].y -= uy * push;
        out[j].x += ux * push;
        out[j].y += uy * push;
      }
    }
    // 원래 자리에서 너무 멀어지지 않게
    for (let i = 0; i < out.length; i++) {
      const ox = out[i].x - points[i].x;
      const oy = out[i].y - points[i].y;
      const m = Math.hypot(ox, oy);
      if (m > maxShift) {
        out[i].x = points[i].x + (ox / m) * maxShift;
        out[i].y = points[i].y + (oy / m) * maxShift;
      }
    }
  }
  return out;
}

/** 관측 메모(Q/A 묶음)에서 답만 뽑는다 */
export function noteAnswers(note?: string): string[] {
  if (!note) return [];
  return note
    .split('\n')
    .filter((l) => l.startsWith('A. '))
    .map((l) => l.slice(3).trim())
    .filter(Boolean);
}
