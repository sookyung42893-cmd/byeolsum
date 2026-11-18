import type { CheckIn, DB, MeteorSession, StrategyUse } from '../types';
import { STRATEGIES, type Strategy } from '../types';
import { quadrantOf, type Quadrant, QUADRANT_ORDER_ON_LIGHT } from '../data/emotions';
import { checkInsInWeek, checkInsOf } from './selectors';
import { DAY, startOfDay } from './dates';

/** 리포트에서 '최근 2주'로 보는 지표의 기간 */
export const RECENT_DAYS = 14;

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
export const round1 = (n: number) => Math.round(n * 10) / 10;

const withinDays = (iso: string, days: number, now: number) => now - new Date(iso).getTime() <= days * DAY;

/* ---------- 핵심 지표 ---------- */

export function weeklyCompare(db: DB, studentId: string, now = Date.now()) {
  const cur = checkInsInWeek(db, studentId, 0, now);
  const prev = checkInsInWeek(db, studentId, 1, now);
  return {
    count: { current: cur.length, previous: prev.length },
    avgIntensity: {
      current: mean(cur.map((c) => c.intensity)),
      previous: mean(prev.map((c) => c.intensity)),
    },
  };
}

/** 정점 이후 처음으로 정점의 절반 이하가 될 때까지 걸린 분. 닿지 못했으면 null */
export function sessionHalfLife(s: MeteorSession): number | null {
  const r = s.readings;
  if (r.length < 2) return null;
  let peak = 0;
  r.forEach((x, i) => {
    if (x.intensity > r[peak].intensity) peak = i;
  });
  const half = r.slice(peak + 1).find((x) => x.intensity <= r[peak].intensity / 2);
  return half ? half.minute - r[peak].minute : null;
}

export function meteorHalfLife(db: DB, studentId: string, now = Date.now()) {
  const sessions = db.meteorSessions.filter(
    (s) => s.studentId === studentId && withinDays(s.startedAt, RECENT_DAYS, now) && s.readings.length >= 2,
  );
  const values = sessions.map(sessionHalfLife).filter((v): v is number => v !== null);
  return { avgMinutes: mean(values), reached: values.length, total: sessions.length };
}

function recentUses(db: DB, studentId: string, now: number) {
  const byId = new Map(checkInsOf(db, studentId).map((c) => [c.id, c]));
  return db.strategyUses
    .map((u) => ({ use: u, checkIn: byId.get(u.checkInId) }))
    .filter((x): x is { use: StrategyUse; checkIn: CheckIn } => Boolean(x.checkIn))
    .filter((x) => withinDays(x.use.createdAt ?? x.checkIn.timestamp, RECENT_DAYS, now));
}

/** 실제 − 예보 평균. 음수면 예보보다 더 많이 내려갔다는 뜻 */
export function forecastGap(db: DB, studentId: string, now = Date.now()) {
  const uses = recentUses(db, studentId, now).map((x) => x.use);
  return { avg: mean(uses.map((u) => u.actualAfter - u.predictedAfter)), count: uses.length };
}

/* ---------- 차트 ---------- */

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

/** 최근 7일(오늘 포함) 요일별 최고 강도 */
export function dailyPeaks(db: DB, studentId: string, now = Date.now()) {
  const list = checkInsOf(db, studentId);
  const today = startOfDay(now);
  return Array.from({ length: 7 }, (_, i) => {
    const dayStart = today - (6 - i) * DAY;
    const d = new Date(dayStart);
    const items = list.filter((c) => {
      const t = new Date(c.timestamp).getTime();
      return t >= dayStart && t < dayStart + DAY;
    });
    return {
      label: `${WEEKDAY[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`,
      day: WEEKDAY[d.getDay()],
      peak: items.length ? Math.max(...items.map((c) => c.intensity)) : null,
      count: items.length,
    };
  });
}

/** 전략별 사용 전후 강도 감소 평균 (체크인 강도 − 사용 후 실제 강도) */
export function strategyEffects(db: DB, studentId: string, now = Date.now()) {
  const uses = recentUses(db, studentId, now);
  return STRATEGIES.map((strategy: Strategy) => {
    const mine = uses.filter((x) => x.use.strategy === strategy);
    const drop = mean(mine.map((x) => x.checkIn.intensity - x.use.actualAfter));
    return { strategy, avgDrop: drop === null ? null : round1(drop), count: mine.length };
  });
}

export function quadrantDistribution(checkIns: CheckIn[]) {
  const total = checkIns.length;
  return QUADRANT_ORDER_ON_LIGHT.map((q: Quadrant) => {
    const count = checkIns.filter((c) => quadrantOf(c.valence, c.arousal) === q).length;
    return { quadrant: q, count, pct: total ? Math.round((count / total) * 100) : 0 };
  });
}

export function topWords(checkIns: CheckIn[], n = 5) {
  const counts = new Map<string, { word: string; count: number; sample: CheckIn }>();
  for (const c of checkIns) {
    const cur = counts.get(c.emotionWord);
    counts.set(c.emotionWord, { word: c.emotionWord, count: (cur?.count ?? 0) + 1, sample: c });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, n);
}

/** 주별로 '상위 감정만 고른' 비율. 낮아질수록 감정을 더 세밀하게 구분하고 있다는 뜻 */
export function granularityTrend(db: DB, studentId: string, now = Date.now(), maxWeeks = 6) {
  const all = checkInsOf(db, studentId);
  if (all.length === 0) return [];
  const oldest = new Date(all[0].timestamp).getTime();
  const weeks = Math.min(maxWeeks, Math.floor((now - oldest) / (7 * DAY)) + 1);
  return Array.from({ length: weeks }, (_, i) => {
    const weeksAgo = weeks - 1 - i;
    const list = checkInsInWeek(db, studentId, weeksAgo, now);
    const broadOnly = list.filter((c) => c.emotionWord === c.broadEmotion).length;
    return {
      label: weeksAgo === 0 ? '이번 주' : weeksAgo === 1 ? '지난주' : `${weeksAgo}주 전`,
      ratio: list.length ? Math.round((broadOnly / list.length) * 100) : null,
      broadOnly,
      total: list.length,
    };
  });
}

/* ---------- 회기에서 다뤄볼 순간 ---------- */

export function highMoments(db: DB, studentId: string, now = Date.now(), threshold = 7) {
  const uses = db.strategyUses;
  return checkInsOf(db, studentId)
    .filter((c) => c.intensity >= threshold && withinDays(c.timestamp, RECENT_DAYS, now))
    .map((c) => ({ checkIn: c, uses: uses.filter((u) => u.checkInId === c.id) }));
}

const BUCKETS = [
  { name: '새벽(0~6시)', from: 0, to: 6 },
  { name: '오전(6~12시)', from: 6, to: 12 },
  { name: '오후(12~18시)', from: 12, to: 18 },
  { name: '저녁(18~21시)', from: 18, to: 21 },
  { name: '밤(21~24시)', from: 21, to: 24 },
];

/** 강도 높은 순간들의 시간대 패턴을 한 줄로 */
export function timePatternSummary(moments: CheckIn[]): string {
  const n = moments.length;
  if (n === 0) return `최근 ${RECENT_DAYS}일 동안 강도 7 이상 기록은 없어요.`;
  const counts = BUCKETS.map((b) => ({
    ...b,
    count: moments.filter((c) => {
      const h = new Date(c.timestamp).getHours();
      return h >= b.from && h < b.to;
    }).length,
  })).sort((a, b) => b.count - a.count);
  const top = counts[0];
  if (n >= 3 && top.count / n >= 0.5) return `강도 7 이상 ${n}번 중 ${top.count}번이 ${top.name}에 몰려 있어요.`;
  if (n < 3) return `강도 7 이상은 ${n}번이라 시간대 패턴을 말하기엔 아직 적어요.`;
  return `강도 7 이상 ${n}번이 특정 시간대에 몰리지 않고 고르게 퍼져 있어요.`;
}
