import type { CrisisAlert, CrisisKind, CrisisStatus, DB } from '../types';
import { missionById } from '../data/planets';
import { checkInsOf } from './selectors';
import { findRiskKeyword } from './signals';
import { formatDateTime } from './dates';

/**
 * 위기 신호(적색 경보)
 * - 강도 10 체크인이 두 번 이어짐
 * - 상황 메모·소감·관측 메모·별빛편지에 위험 키워드
 * 키워드 감지는 모든 위험을 잡지 못한다. 상담사 화면에 이 한계를 함께 안내한다.
 */

export const KEYWORD_LIMIT_NOTICE = '키워드 감지는 모든 위험을 잡지 못해요. 신호가 없어도 학생의 기록과 말 전체를 함께 살펴 주세요.';

type Candidate = Omit<CrisisAlert, 'status' | 'memo' | 'handledAt'>;

/** 지금 데이터에서 찾을 수 있는 위기 신호 후보 (원래 기록이 지워지면 후보에서도 빠진다) */
export function detectCrisis(db: DB, studentId: string): Candidate[] {
  const out: Candidate[] = [];
  const checkIns = checkInsOf(db, studentId);

  for (let i = 1; i < checkIns.length; i++) {
    const a = checkIns[i - 1];
    const b = checkIns[i];
    if (a.intensity === 10 && b.intensity === 10) {
      out.push({
        id: `c10:${a.id}:${b.id}`,
        studentId,
        kind: '강도 10 연속',
        source: '체크인',
        detail: `강도 10이 두 번 이어졌어요 (${formatDateTime(a.timestamp)} "${a.situation || a.emotionWord}", ${formatDateTime(b.timestamp)} "${b.situation || b.emotionWord}")`,
        detectedAt: b.timestamp,
        sourceIds: [a.id, b.id],
      });
    }
  }

  const keyword = (id: string, source: string, text: string | undefined, at: string | undefined, sourceIds: string[]) => {
    if (!text || !at) return;
    const k = findRiskKeyword(text);
    if (k) out.push({ id, studentId, kind: '위험 키워드', source, detail: text, keyword: k, detectedAt: at, sourceIds });
  };

  for (const c of checkIns) keyword(`kw:ci:${c.id}`, '체크인 상황 메모', c.situation, c.timestamp, [c.id]);

  const mine = new Set(checkIns.map((c) => c.id));
  for (const u of db.strategyUses) {
    if (mine.has(u.checkInId)) keyword(`kw:su:${u.id}`, `망원경 관측 메모 (${u.strategy})`, u.note, u.createdAt, [u.checkInId]);
  }

  for (const p of db.missionProgress.filter((x) => x.studentId === studentId)) {
    const title = missionById(p.missionId)?.title ?? '미션';
    keyword(`kw:mp:${p.id}`, `미션 소감 (${title})`, p.reflection, p.completedAt, [p.id]);
    (p.repeats ?? []).forEach((r, i) => keyword(`kw:mp:${p.id}:${i}`, `미션 소감 (${title}, 반복)`, r.reflection, r.at, [p.id]));
  }

  for (const c of db.challenges.filter((x) => x.studentId === studentId)) {
    keyword(`kw:ch:${c.id}`, `도전 미션 소감 (${c.title})`, c.reflection, c.completedAt, [c.id]);
  }

  for (const l of db.letters.filter((x) => x.studentId === studentId)) {
    keyword(`kw:lt:${l.id}`, '별빛편지', l.content, l.createdAt, [l.id]);
  }

  return out;
}

/** 새로 생긴 위기 신호를 기록으로 남긴다. 이미 있으면 그대로 (바뀐 게 없으면 같은 db) */
export function syncCrisisAlerts(db: DB): DB {
  const known = new Set(db.crisisAlerts.map((a) => a.id));
  const fresh: CrisisAlert[] = [];
  for (const s of db.students) {
    for (const c of detectCrisis(db, s.id)) {
      if (!known.has(c.id)) {
        known.add(c.id);
        fresh.push({ ...c, status: '새 신호' });
      }
    }
  }
  return fresh.length ? { ...db, crisisAlerts: [...db.crisisAlerts, ...fresh] } : db;
}

export function alertsOf(db: DB, studentId: string): CrisisAlert[] {
  return db.crisisAlerts.filter((a) => a.studentId === studentId).sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
}

export const openAlerts = (db: DB, studentId: string) => alertsOf(db, studentId).filter((a) => a.status === '새 신호');

/** 상담사: 확인함 / 연락함 + 메모 */
export function handleAlert(db: DB, id: string, status: CrisisStatus, memo?: string): DB {
  return {
    ...db,
    crisisAlerts: db.crisisAlerts.map((a) =>
      a.id === id ? { ...a, status, memo: memo !== undefined ? memo : a.memo, handledAt: status === '새 신호' ? undefined : new Date().toISOString() } : a,
    ),
  };
}

/** 근무 시간: 평일 9시 ~ 18시 */
export function isWorkHours(iso: string | number | Date): boolean {
  const d = new Date(iso);
  const day = d.getDay();
  const h = d.getHours();
  return day >= 1 && day <= 5 && h >= 9 && h < 18;
}

/** 이 기록을 지우면 사라질 수 없는 위기 신호가 있는지 (지울 때 학생에게 알려준다) */
export function hasAlertFor(db: DB, sourceId: string): boolean {
  return db.crisisAlerts.some((a) => a.sourceIds.includes(sourceId));
}

export const KIND_LABEL: Record<CrisisKind, string> = {
  '강도 10 연속': '강도 10 연속',
  '위험 키워드': '위험 키워드',
};
