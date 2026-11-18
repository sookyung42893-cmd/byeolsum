import type { DB } from '../types';
import { createSeedData, DEMO_COUNSELOR_ID, DEMO_INVITE_CODE, DEMO_STUDENT_IDS } from './seed';
import { makeInviteCode } from '../lib/auth';

const isDemoStudent = (id: string) => DEMO_STUDENT_IDS.includes(id);

/** 예시 계정·학생·기록만 지운다. 직접 가입한 계정과 그 기록은 그대로 */
export function removeDemoData(db: DB): DB {
  const checkIns = db.checkIns.filter((c) => !isDemoStudent(c.studentId));
  const keptIds = new Set(checkIns.map((c) => c.id));
  const keep = <T extends { studentId: string }>(list: T[]) => list.filter((x) => !isDemoStudent(x.studentId));
  return {
    ...db,
    accounts: db.accounts.filter((a) => !a.demo),
    students: db.students.filter((s) => !isDemoStudent(s.id)),
    checkIns,
    strategyUses: db.strategyUses.filter((u) => keptIds.has(u.checkInId)),
    meteorSessions: keep(db.meteorSessions),
    missionProgress: keep(db.missionProgress),
    challenges: keep(db.challenges),
    trustedContacts: keep(db.trustedContacts),
    consents: keep(db.consents),
    assessments: keep(db.assessments),
    letters: keep(db.letters),
    crisisAlerts: keep(db.crisisAlerts),
  };
}

/** 예시 데이터를 처음 상태로 다시 채운다. 직접 가입한 계정은 그대로 */
export function restoreDemoData(db: DB): DB {
  const seed = createSeedData();
  const base = removeDemoData(db);
  return {
    ...base,
    seededAt: seed.seededAt,
    accounts: [...seed.accounts, ...base.accounts],
    students: [...seed.students, ...base.students],
    checkIns: [...seed.checkIns, ...base.checkIns],
    strategyUses: [...seed.strategyUses, ...base.strategyUses],
    meteorSessions: [...seed.meteorSessions, ...base.meteorSessions],
    missionProgress: [...seed.missionProgress, ...base.missionProgress],
    challenges: [...seed.challenges, ...base.challenges],
    trustedContacts: [...seed.trustedContacts, ...base.trustedContacts],
    consents: [...seed.consents, ...base.consents],
    assessments: [...seed.assessments, ...base.assessments],
    letters: [...seed.letters, ...base.letters],
    crisisAlerts: [...seed.crisisAlerts, ...base.crisisAlerts],
  };
}

/** 저장된 데이터에 들어 있어야 하는 목록들 */
const COLLECTIONS = [
  'accounts',
  'students',
  'checkIns',
  'strategyUses',
  'meteorSessions',
  'missionProgress',
  'challenges',
  'trustedContacts',
  'consents',
  'assessments',
  'letters',
  'crisisAlerts',
] as const;

/**
 * 저장된 데이터를 안전하게 다듬는다.
 * - 빠진 목록은 빈 목록으로 채운다 (개발 중 형식이 바뀌던 사이에 저장된 데이터 때문에 화면이 멈추지 않게)
 * - 상담사 초대 코드가 빠진 계정은 채운다
 */
export function normalizeDb(raw: DB): DB {
  const db = { ...raw } as DB;
  for (const key of COLLECTIONS) {
    if (!Array.isArray(db[key])) (db as unknown as Record<string, unknown[]>)[key] = [];
  }
  const used = new Set(db.accounts.map((a) => a.inviteCode).filter((c): c is string => Boolean(c)));
  used.add(DEMO_INVITE_CODE);
  const accounts = db.accounts.map((a) => {
    if (a.role !== 'counselor' || a.inviteCode) return a;
    if (a.id === DEMO_COUNSELOR_ID) return { ...a, inviteCode: DEMO_INVITE_CODE };
    const code = makeInviteCode(used);
    used.add(code);
    return { ...a, inviteCode: code };
  });
  return { ...db, accounts };
}
