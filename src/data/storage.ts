import { DB_VERSION, type Account, type DB, type Session, type Student } from '../types';
import { createSeedData } from './seed';
import { normalizeDb } from './demo';

const DB_KEY = 'byeolsum:db:v1';
const SESSION_KEY = 'byeolsum:session:v1';

/**
 * 저장된 데이터를 불러온다. 예전 형식의 기록은 변환하지 않는다:
 * 저장 형식 버전이 다르면 기록은 모두 지우고 새 예시 데이터로 채우되,
 * 직접 가입한 계정(과 그 학생 정보, 로그인 상태)은 그대로 남긴다.
 */
export function loadDb(): DB {
  let parsed: unknown;
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) parsed = JSON.parse(raw);
  } catch {
    parsed = undefined;
  }
  const old = parsed as Partial<DB> | undefined;
  if (old?.version === DB_VERSION && Array.isArray(old.accounts)) return normalizeDb(old as DB);

  const seed = createSeedData();
  const kept = keptAccounts(old, seed.accounts);
  if (kept.accounts.length === 0) return resetAllData();
  const db: DB = { ...seed, accounts: [...seed.accounts, ...kept.accounts], students: [...seed.students, ...kept.students] };
  // 남긴 계정의 로그인은 유지, 사라진 계정의 로그인만 푼다
  const session = loadSession();
  if (session && !db.accounts.some((a) => a.id === session.accountId)) saveSession(null);
  saveDb(db);
  return db;
}

/** 예전 저장 데이터에서 직접 가입한 계정과 그 학생 정보를 새 형식에 맞게 꺼낸다 */
function keptAccounts(old: Partial<DB> | undefined, seedAccounts: Account[]): { accounts: Account[]; students: Student[] } {
  if (!old || !Array.isArray(old.accounts)) return { accounts: [], students: [] };
  const oldStudents = Array.isArray(old.students) ? old.students : [];
  const accounts: Account[] = [];
  const students: Student[] = [];
  const now = new Date().toISOString();
  for (const a of old.accounts) {
    if (!a || a.demo || !a.id || !a.username || !a.passwordHash || (a.role !== 'student' && a.role !== 'counselor')) continue;
    const account: Account = {
      id: a.id,
      username: a.username,
      passwordHash: a.passwordHash,
      role: a.role,
      displayName: a.displayName ?? a.username,
      createdAt: a.createdAt ?? now,
      ...(a.role === 'counselor' && a.inviteCode ? { inviteCode: a.inviteCode } : {}),
    };
    if (a.role === 'student') {
      const s = oldStudents.find((x) => x?.id === a.studentId);
      const id = a.studentId ?? `stu-${a.id}`;
      const session = typeof s?.currentSession === 'number' ? Math.min(8, Math.max(1, Math.round(s.currentSession))) : 1;
      students.push({
        id,
        name: s?.name ?? account.displayName,
        currentSession: session,
        sessionStartedAt: s?.sessionStartedAt ?? now,
        nextSessionDate: s?.nextSessionDate ?? null,
        mode: s?.mode === '유지' ? '유지' : '회기중',
        joinedAt: s?.joinedAt ?? account.createdAt,
        counselorId: s?.counselorId ?? null,
        heartExperimentOff: Boolean(s?.heartExperimentOff),
      });
      account.studentId = id;
    }
    accounts.push(account);
  }
  // 담당 상담사가 사라졌으면 연결만 푼다
  const ids = new Set([...accounts.map((a) => a.id), ...seedAccounts.map((a) => a.id)]);
  for (const s of students) if (s.counselorId && !ids.has(s.counselorId)) s.counselorId = null;
  return { accounts, students };
}

export function saveDb(db: DB): void {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* 저장 공간이 막혀 있어도 화면은 동작하게 둔다 */
  }
}

/** 개발용: 저장된 모든 데이터를 지우고 예시 데이터로 새로 시작 */
export function resetAllData(): DB {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* noop */
  }
  const db = createSeedData();
  saveDb(db);
  return db;
}

export function loadSession(): Session {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const s = raw ? (JSON.parse(raw) as Session) : null;
    // 계정이 없던 1단계 세션은 다시 로그인하게 한다
    return s && 'accountId' in s ? s : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* noop */
  }
}
