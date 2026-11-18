import type { Challenge, DB, Mission, MissionProgress, PlanetStatus, Student } from '../types';
import {
  COURAGE_SESSIONS,
  HEART_EXPERIMENT_ID,
  PLANETS,
  TOTAL_SESSIONS,
  missionsOfPlanet,
  sessionOfPlanet,
  type Station,
} from '../data/planets';

export function progressOf(db: DB, studentId: string, missionId: string): MissionProgress | undefined {
  return db.missionProgress.find((p) => p.studentId === studentId && p.missionId === missionId);
}

/** 상담사가 꺼 둔 미션 (두근 실험) */
export function isMissionOff(student: Pick<Student, 'heartExperimentOff'> | undefined, missionId: string): boolean {
  return missionId === HEART_EXPERIMENT_ID && Boolean(student?.heartExperimentOff);
}

/** 발견물에 필요한 미션: 그 행성 미션 중 꺼 두지 않은 것 */
export function requiredMissions(db: DB, studentId: string, planetId: number): Mission[] {
  const student = db.students.find((s) => s.id === studentId);
  return missionsOfPlanet(planetId).filter((m) => !isMissionOff(student, m.id));
}

/** 발견물: 그 행성 미션(연습·현실)을 모두 완료하면 얻는다. 상담사가 끈 미션은 빼고 센다 */
export function hasDiscovery(db: DB, studentId: string, planetId: number): boolean {
  return requiredMissions(db, studentId, planetId).every((m) => progressOf(db, studentId, m.id)?.status === '완료');
}

export function completedCount(db: DB, studentId: string, planetId: number): number {
  return requiredMissions(db, studentId, planetId).filter((m) => progressOf(db, studentId, m.id)?.status === '완료').length;
}

/** 미션 진행을 바꾼다 (없으면 새로 만든다) */
export function setProgress(db: DB, studentId: string, missionId: string, patch: Partial<MissionProgress>): DB {
  const existing = progressOf(db, studentId, missionId);
  if (existing) {
    return { ...db, missionProgress: db.missionProgress.map((p) => (p === existing ? { ...p, ...patch } : p)) };
  }
  const created: MissionProgress = { id: `${studentId}-mp-${missionId}`, studentId, missionId, status: '대기', ...patch };
  return { ...db, missionProgress: [...db.missionProgress, created] };
}

/**
 * 미션 완료로 기록.
 * 처음 완료하면 그 기록이 첫 완료가 되고(발견물·완료율 기준), 이미 완료한 미션을 다시 하면
 * 첫 완료는 그대로 두고 반복 기록(repeats)에 쌓는다.
 */
export function completeMission(
  db: DB,
  studentId: string,
  missionId: string,
  reflection?: string,
  extra?: Pick<MissionProgress, 'moodBefore' | 'moodAfter'>,
): DB {
  const prev = progressOf(db, studentId, missionId);
  const now = new Date().toISOString();
  if (prev?.status === '완료') {
    return setProgress(db, studentId, missionId, {
      repeats: [...(prev.repeats ?? []), { reflection, ...extra, at: now }],
    });
  }
  return setProgress(db, studentId, missionId, {
    status: '완료',
    completedAt: now,
    ...(reflection !== undefined ? { reflection } : {}),
    ...extra,
  });
}

export const repeatCount = (p?: MissionProgress) => p?.repeats?.length ?? 0;

/**
 * 앱 기록만 보고 알 수 있는 연습 미션은 저절로 완료한다.
 * - 첫불 "착륙 신호": 별을 하나 띄우고 별똥별도 한 번 써 봄
 * - 너울 "유성 관측": 너울 행성이 열린 뒤에 별똥별을 띄워 강도를 3번 이상 기록함
 *   (별똥별 도구는 1회기부터 쓸 수 있지만, 그 전 기록으로 미션이 저절로 끝나지는 않게)
 * 바뀐 게 없으면 같은 db를 돌려준다.
 */
export function autoCompletePractice(db: DB, studentId: string): DB {
  let next = db;
  const student = db.students.find((s) => s.id === studentId);
  const done = (id: string) => progressOf(next, studentId, id)?.status === '완료';
  const meteors = db.meteorSessions.filter((s) => s.studentId === studentId);
  if (!done('p1-practice') && db.checkIns.some((c) => c.studentId === studentId) && meteors.length > 0) {
    next = completeMission(next, studentId, 'p1-practice', '첫 별을 띄우고 별똥별도 미리 띄워 봤어.');
  }
  const meteorPlanet = 5;
  const openedAt =
    student && student.currentSession === sessionOfPlanet(meteorPlanet) ? (student.sessionStartedAt ?? '') : '';
  const watched =
    student && isPlanetOpen(student, meteorPlanet)
      ? meteors.find((s) => s.readings.length >= 3 && s.startedAt >= openedAt)
      : undefined;
  if (!done('p5-practice') && watched) {
    const first = watched.readings[0].intensity;
    const last = watched.readings[watched.readings.length - 1].intensity;
    next = completeMission(next, studentId, 'p5-practice', `별똥별을 ${watched.readings.length - 1}분 지켜봤어 (강도 ${first} → ${last}).`);
  }
  return next;
}

/** 그 행성의 회기가 왔으면 열림 (예외 없음. 별똥별 도구는 행성과 따로 늘 쓸 수 있다) */
export function isPlanetOpen(student: Student, planetId: number): boolean {
  return sessionOfPlanet(planetId) <= student.currentSession;
}

/**
 * 행성 상태
 * - 잠김: 아직 그 회기가 오지 않음
 * - 탐사중: 지금 회기의 행성
 * - 완료: 발견물을 얻은 행성
 * - 열림: 열려 있지만 지금 회기 행성은 아님 (지난 행성, 또는 늘 열린 너울)
 */
export function planetStatus(db: DB, student: Student, planetId: number): PlanetStatus {
  if (!isPlanetOpen(student, planetId)) return '잠김';
  if (hasDiscovery(db, student.id, planetId)) return '완료';
  return sessionOfPlanet(planetId) === student.currentSession ? '탐사중' : '열림';
}

export function planetStatuses(db: DB, student: Student): { planetId: number; status: PlanetStatus }[] {
  return PLANETS.map((p) => ({ planetId: p.id, status: planetStatus(db, student, p.id) }));
}

/** 용기 구간 상태: 5회기까지 잠김, 6~7회기 탐사중, 8회기부터 지나온 구간(완료) */
export function courageStatus(student: Student): PlanetStatus {
  if (student.currentSession < COURAGE_SESSIONS[0]) return '잠김';
  if (student.currentSession > COURAGE_SESSIONS[COURAGE_SESSIONS.length - 1]) return '완료';
  return '탐사중';
}

/** 정거장 상태 (행성이면 행성 상태, 용기 구간이면 용기 구간 상태) */
export function stationStatus(db: DB, student: Student, station: Station): PlanetStatus {
  return station.kind === 'courage' ? courageStatus(student) : planetStatus(db, student, station.planetId!);
}

/** 용기 구간(6~7회기)에 보낸 도전 미션 */
export function courageChallenges(db: DB, studentId: string): Challenge[] {
  return challengesOf(db, studentId).filter((c) => COURAGE_SESSIONS.includes(c.session));
}

export const isLastSession = (student: Student) => student.currentSession >= TOTAL_SESSIONS;

/** 상담사 "다음 회기로": 회기 번호만 하나 올린다 (정거장은 회기로 계산되므로 6→7은 같은 용기 구간) */
export function advanceSession(db: DB, studentId: string): DB {
  return {
    ...db,
    students: db.students.map((s) =>
      s.id === studentId
        ? { ...s, currentSession: Math.min(TOTAL_SESSIONS, s.currentSession + 1), sessionStartedAt: new Date().toISOString() }
        : s,
    ),
  };
}

export function challengesOf(db: DB, studentId: string): Challenge[] {
  return db.challenges
    .filter((c) => c.studentId === studentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** 지금 해볼 도전 미션: 아직 끝내지 않은 가장 최근 것 (다시 이어간 도전 포함) */
export function activeChallenge(db: DB, studentId: string): Challenge | undefined {
  return challengesOf(db, studentId).find((c) => c.status === '보냄' || c.status === '실행 전 기록');
}

/** "다음 주로" 넘겨 둔 도전 (다시 이어갈 수 있음) */
export function postponedChallenges(db: DB, studentId: string): Challenge[] {
  return challengesOf(db, studentId).filter((c) => c.status === '다음 주로');
}

/** 용기의 별: 도전을 시도한 횟수 (결과와 상관없이). onlyCourage면 용기 구간(6~7회기)에 보낸 도전만 */
export function courageStars(db: DB, studentId: string, onlyCourage = false): number {
  return db.challenges.filter(
    (c) => c.studentId === studentId && c.status === '완료' && (!onlyCourage || COURAGE_SESSIONS.includes(c.session)),
  ).length;
}
