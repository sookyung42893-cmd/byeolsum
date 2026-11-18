import type { Challenge, DB } from '../types';
import { newId } from './auth';
import { DAY, toDateKey } from './dates';

/**
 * 도전 미션 (UP-A 모듈 7, 정서 노출): 회기에서 상담사와 학생이 함께 정한 다가가기 과제.
 * 흐름: 보냄 → (하기 전 마음 기록) 실행 전 기록 → (하고 나서 마음 + 소감) 완료
 * 못 하면 "다음 주로" (감점 없음). 성공·실패는 따지지 않고 시도 자체를 기록한다.
 */

export const STEP_LABEL: Record<Challenge['step'], string> = {
  1: '작은 한 걸음',
  2: '조금 더 가까이',
  3: '큰 걸음',
};

export const CHALLENGE_STATUS_TEXT: Record<Challenge['status'], string> = {
  보냄: '도착함',
  '실행 전 기록': '하기 전 마음을 적어 둠',
  완료: '시도함',
  '다음 주로': '다음 주로 넘김',
};

function patch(db: DB, id: string, p: Partial<Challenge>): DB {
  return { ...db, challenges: db.challenges.map((c) => (c.id === id ? { ...c, ...p } : c)) };
}

/** 하기 전 마음 점수 기록 */
export const recordPredicted = (db: DB, id: string, predicted: number) =>
  patch(db, id, { predicted, status: '실행 전 기록' });

/** 도전을 해 봄: 하고 나서 마음 점수 + 한 줄 소감. 결과와 상관없이 용기의 별이 하나 뜬다 */
export const completeChallenge = (db: DB, id: string, actual: number, reflection: string) =>
  patch(db, id, { actual, reflection, status: '완료', completedAt: new Date().toISOString() });

/** 이번엔 못 함 → 다음 주로 (감점 없음) */
export const postponeChallenge = (db: DB, id: string) => patch(db, id, { status: '다음 주로' });

/**
 * "다음 주로" 넘긴 도전을 다시 이어간다 (학생이 스스로, 또는 상담사가 다시 열기).
 * 하기 전 마음을 이미 적어 뒀으면 그 다음 단계부터. 기한이 지났으면 오늘부터 6일 뒤로 늘린다.
 */
export function resumeChallenge(db: DB, id: string, now = Date.now()): DB {
  const c = db.challenges.find((x) => x.id === id);
  if (!c) return db;
  const today = toDateKey(now);
  return patch(db, id, {
    status: c.predicted !== undefined ? '실행 전 기록' : '보냄',
    dueDate: c.dueDate < today ? toDateKey(now + 6 * DAY) : c.dueDate,
  });
}

export interface ChallengeInput {
  studentId: string;
  title: string;
  step: Challenge['step'];
  dueDate: string;
  counselorMessage: string;
  linkedSkills: number[];
  session: number;
}

/** 상담사가 관측소에서 보내기 */
export function sendChallenge(db: DB, input: ChallengeInput): DB {
  const c: Challenge = { id: newId('ch'), ...input, status: '보냄', createdAt: new Date().toISOString() };
  return { ...db, challenges: [...db.challenges, c] };
}

/** 아직 학생이 손대지 않은 도전은 상담사가 거둘 수 있다 */
export const withdrawChallenge = (db: DB, id: string) => ({ ...db, challenges: db.challenges.filter((c) => c.id !== id) });

/** 예상과 실제 차이의 평균 (실제 − 예상). 시도한 도전만 */
export function challengeGap(list: Challenge[]): { avg: number | null; count: number } {
  const done = list.filter((c) => c.status === '완료' && c.predicted !== undefined && c.actual !== undefined);
  if (done.length === 0) return { avg: null, count: 0 };
  const sum = done.reduce((s, c) => s + (c.actual! - c.predicted!), 0);
  return { avg: Math.round((sum / done.length) * 10) / 10, count: done.length };
}
