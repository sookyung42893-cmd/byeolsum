import type { DB, Student } from '../types';
import { lastCheckIn } from './selectors';
import { daysSince } from './dates';

export const RISK_KEYWORDS = ['죽고 싶', '죽고싶', '사라지고 싶', '사라지고싶', '자해', '없어지고 싶', '살기 싫'];

/** 위험 키워드 찾기. 위기 신호 감지·경보 기록은 lib/crisis.ts */
export function findRiskKeyword(text: string): string | undefined {
  const normalized = text.replace(/\s+/g, ' ');
  return RISK_KEYWORDS.find((k) => normalized.includes(k));
}

export type BadgeKind = 'needs-check' | 'inactive' | 'maintenance';

export function studentBadges(db: DB, student: Student, now = Date.now()): BadgeKind[] {
  const badges: BadgeKind[] = [];
  // 상담사가 아직 확인하지 않은 위기 신호가 있으면 "확인 필요"
  if (db.crisisAlerts.some((a) => a.studentId === student.id && a.status === '새 신호')) badges.push('needs-check');
  // 기록이 아직 없으면 가입 시점부터 센다 (막 가입한 학생은 미접속이 아님)
  const lastActive = lastCheckIn(db, student.id)?.timestamp ?? student.joinedAt;
  if (daysSince(lastActive, now) >= 3) badges.push('inactive');
  if (student.mode === '유지') badges.push('maintenance');
  return badges;
}
