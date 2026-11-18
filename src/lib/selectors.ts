import type { CheckIn, DB } from '../types';
import { DAY } from './dates';

/** 상담사가 담당하는 학생들 */
export function studentsOf(db: DB, counselorId: string) {
  return db.students.filter((s) => s.counselorId === counselorId);
}

/** 학생의 체크인을 시간순으로 */
export function checkInsOf(db: DB, studentId: string): CheckIn[] {
  return db.checkIns
    .filter((c) => c.studentId === studentId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function lastCheckIn(db: DB, studentId: string): CheckIn | undefined {
  const list = checkInsOf(db, studentId);
  return list[list.length - 1];
}

/**
 * 주 단위는 '오늘 포함 최근 7일'(이번 주)과 '그 전 7일'(지난주)로 본다.
 * weeksAgo = 0 → 이번 주, 1 → 지난주
 */
export function inWeek(iso: string, weeksAgo: number, now = Date.now()): boolean {
  const t = new Date(iso).getTime();
  const end = now - weeksAgo * 7 * DAY;
  return t <= end && t > end - 7 * DAY;
}

export function checkInsInWeek(db: DB, studentId: string, weeksAgo: number, now = Date.now()): CheckIn[] {
  return checkInsOf(db, studentId).filter((c) => inWeek(c.timestamp, weeksAgo, now));
}
