import type { Challenge, CheckIn, DB, Student } from '../types';
import { PLANETS, missionsOfPlanet, planetById, sessionOfPlanet, stationOfSession } from '../data/planets';
import { checkInsInWeek, inWeek, lastCheckIn } from './selectors';
import { openAlerts } from './crisis';
import { DAY, daysSince, daysUntil, startOfDay } from './dates';
import { peakTimeBucket, round1, topWords } from './metrics';
import { activeChallenge, challengesOf, completedCount, progressOf, requiredMissions } from './voyage';

/**
 * 회기 전 3분 요약.
 * AI나 외부 API 없이, 기록을 계산해서 정해진 문장 틀에 채워 넣기만 한다.
 * 줄은 최대 5개: 주의 신호 · 이번 주 · 다룰 순간 · 과제 결과 · (해당할 때만) 참고
 */

export type SummaryTone = 'alert' | 'warn' | 'normal' | 'note';
/** "자세히 ↓"로 내려갈 리포트 섹션 */
export type SummaryTarget = 'crisis' | 'kpi' | 'moments' | 'voyage' | 'challenge';

export interface SummaryLine {
  key: 'signal' | 'week' | 'moments' | 'homework' | 'note';
  label: string;
  tone: SummaryTone;
  text: string;
  target: SummaryTarget;
}

const clip = (s: string, n: number) => {
  const t = s.trim().replace(/\s+/g, ' ');
  return t.length > n ? `${t.slice(0, n).trimEnd()}…` : t;
};
const md = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

/** 1. 주의 신호: 확인 안 한 위기 신호 · 3일 이상 미접속 · 도전 기한 넘김 */
function signalLine(db: DB, student: Student, now: number): SummaryLine {
  const open = openAlerts(db, student.id).length;
  // 미접속 판단은 목록 배지와 같은 기준(3일 이상), 표시하는 날 수는 목록의 "N일 전"과 같은 달력 기준
  const lastAt = lastCheckIn(db, student.id)?.timestamp ?? student.joinedAt;
  const idle = daysSince(lastAt, now) >= 3 ? Math.round((startOfDay(now) - startOfDay(new Date(lastAt).getTime())) / DAY) : 0;
  const active = activeChallenge(db, student.id);
  const overdue = active ? -daysUntil(active.dueDate, now) : 0;

  const parts: string[] = [];
  if (open > 0) parts.push(`확인하지 않은 위기 신호 ${open}건`);
  if (idle >= 3) parts.push(`${idle}일째 기록 없음`);
  if (overdue > 0) parts.push(`도전 미션 기한 ${overdue}일 지남`);

  return {
    key: 'signal',
    label: '주의 신호',
    tone: open > 0 ? 'alert' : parts.length ? 'warn' : 'normal',
    text: parts.length ? `${parts.join(', ')}.` : '특이 신호 없음.',
    target: open > 0 ? 'crisis' : overdue > 0 && idle < 3 ? 'challenge' : 'kpi',
  };
}

/** 2. 이번 주 한 줄: 횟수 · 평균 강도(지난주 대비) · 많이 쓴 감정 단어 2개 · 강도 7 이상이 몰린 시간대 */
function weekLine(db: DB, student: Student, now: number): SummaryLine {
  const cur = checkInsInWeek(db, student.id, 0, now);
  const prev = checkInsInWeek(db, student.id, 1, now);
  const base = { key: 'week' as const, label: '이번 주', tone: 'normal' as const, target: 'kpi' as const };
  if (cur.length === 0) return { ...base, text: `이번 주 감정 기록 없음 (지난주 ${prev.length}회).` };

  const avg = round1(mean(cur.map((c) => c.intensity)));
  let change = '지난주 기록 없음';
  if (prev.length) {
    const diff = round1(avg - round1(mean(prev.map((c) => c.intensity))));
    change = diff === 0 ? '지난주와 같음' : `지난주보다 ${Math.abs(diff)} ${diff > 0 ? '높음' : '낮음'}`;
  }
  const words = topWords(cur, 2).map((w) => w.word).join('·');
  const peak = peakTimeBucket(cur.filter((c) => c.intensity >= 7));
  return {
    ...base,
    text: `체크인 ${cur.length}회, 평균 강도 ${avg}(${change}), 주로 ${words}${peak ? `, 강도 7 이상은 ${peak}에 몰림` : ''}.`,
  };
}

/** 3. 회기에서 다룰 순간: 이번 주 강도가 가장 높았던 기록 1~2개 */
function momentsLine(db: DB, student: Student, now: number): SummaryLine {
  const cur = checkInsInWeek(db, student.id, 0, now);
  const top = [...cur].sort((a, b) => b.intensity - a.intensity || b.timestamp.localeCompare(a.timestamp)).slice(0, 2);
  const one = (c: CheckIn) => `${md(c.timestamp)} ${c.emotionWord} ${c.intensity}점${c.situation.trim() ? ` "${clip(c.situation, 16)}"` : ''}`;
  return {
    key: 'moments',
    label: '다룰 순간',
    tone: 'normal',
    text: top.length ? `${top.map(one).join(', ')}.` : '이번 주 기록이 없어 고를 순간이 없음.',
    target: 'moments',
  };
}

/** 이번 주에 다룰 도전: 이번 주에 끝낸 것 → 지금 진행 중인 것 → 이번 주에 넘긴 것 */
function weekChallenge(db: DB, studentId: string, now: number): Challenge | undefined {
  const list = challengesOf(db, studentId);
  return (
    list.find((c) => c.status === '완료' && inWeek(c.completedAt ?? c.createdAt, 0, now)) ??
    activeChallenge(db, studentId) ??
    list.find((c) => c.status === '다음 주로' && inWeek(c.createdAt, 0, now))
  );
}

/** 4. 과제 결과: 지금 행성 미션 진행 · 이번 주 도전 미션 상태와 결과 */
function homeworkLine(db: DB, student: Student, now: number): SummaryLine {
  const station = stationOfSession(student.currentSession);
  const mission =
    station.kind === 'planet' && station.planetId
      ? `${station.name} 미션 ${completedCount(db, student.id, station.planetId)}/${requiredMissions(db, student.id, station.planetId).length}`
      : `${station.name}`;

  const c = weekChallenge(db, student.id, now);
  let challenge = '이번 주 도전 미션 없음';
  if (c) {
    const title = `"${clip(c.title, 14)}"`;
    if (c.status === '완료') {
      const score = c.predicted !== undefined && c.actual !== undefined ? `(예상 ${c.predicted} → 실제 ${c.actual})` : '';
      challenge = `도전 ${title} 완료${score}${c.reflection ? `, 소감 "${clip(c.reflection, 18)}"` : ''}`;
    } else if (c.status === '실행 전 기록') {
      challenge = `도전 ${title} 하기 전 마음 ${c.predicted}점 적어 둠(기한 ${md(c.dueDate + 'T00:00:00')})`;
    } else if (c.status === '보냄') {
      challenge = `도전 ${title} 아직 시작 전(기한 ${md(c.dueDate + 'T00:00:00')})`;
    } else {
      challenge = `도전 ${title} 다음 주로 넘김`;
    }
  }
  return {
    key: 'homework',
    label: '과제 결과',
    tone: 'normal',
    text: `${mission} · ${challenge}.`,
    target: c ? 'challenge' : 'voyage',
  };
}

/** 5. 참고: 정해진 규칙에 걸릴 때만. 결정은 상담사가 한다 */
function noteLine(db: DB, student: Student): SummaryLine | null {
  const list = challengesOf(db, student.id);

  // 최근 도전 2번 연속, 실제 마음 점수가 예상보다 2점 이상 낮음
  const done = list
    .filter((c) => c.status === '완료' && c.predicted !== undefined && c.actual !== undefined)
    .sort((a, b) => (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt));
  if (done.length >= 2 && done.slice(0, 2).every((c) => c.predicted! - c.actual! >= 2)) {
    return {
      key: 'note',
      label: '참고',
      tone: 'note',
      text: '참고: 최근 도전 2번 모두 실제 마음 점수가 예상보다 2점 이상 낮아, 다음 단계 도전을 고려해볼 수 있어요.',
      target: 'challenge',
    };
  }

  // 도전을 2주 연속 다음 주로 넘김 (끝났거나 넘긴 최근 도전 2개가 모두 "다음 주로")
  const resolved = list.filter((c) => c.status === '완료' || c.status === '다음 주로');
  if (resolved.length >= 2 && resolved.slice(0, 2).every((c) => c.status === '다음 주로')) {
    return {
      key: 'note',
      label: '참고',
      tone: 'note',
      text: '참고: 도전 미션을 2주 연속 다음 주로 넘겨, 단계를 낮추거나 회기에서 다시 다뤄볼 수 있어요.',
      target: 'challenge',
    };
  }

  // 지나온 행성에서 연습 미션만 하고 현실 미션은 건너뜀
  const skipped = PLANETS.filter((p) => sessionOfPlanet(p.id) < student.currentSession).filter((p) => {
    const required = requiredMissions(db, student.id, p.id);
    const doneKind = (kind: '연습' | '현실') =>
      required.filter((m) => m.kind === kind).every((m) => progressOf(db, student.id, m.id)?.status === '완료');
    const hasReal = missionsOfPlanet(p.id).some((m) => m.kind === '현실');
    return hasReal && doneKind('연습') && !doneKind('현실');
  });
  if (skipped.length > 0) {
    return {
      key: 'note',
      label: '참고',
      tone: 'note',
      text: `참고: ${skipped.map((p) => planetById(p.id).name).join('·')}에서 연습 미션만 하고 현실 미션은 건너뛰어, 일상 적용이 어려운지 확인해볼 수 있어요.`,
      target: 'voyage',
    };
  }
  return null;
}

export function sessionSummary(db: DB, student: Student, now = Date.now()): SummaryLine[] {
  const lines = [signalLine(db, student, now), weekLine(db, student, now), momentsLine(db, student, now), homeworkLine(db, student, now)];
  const note = noteLine(db, student);
  return note ? [...lines, note] : lines;
}
