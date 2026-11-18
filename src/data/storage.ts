import { DB_VERSION, type DB, type Session } from '../types';
import { createSeedData } from './seed';
import { normalizeDb } from './demo';

const DB_KEY = 'byeolsum:db:v1';
const SESSION_KEY = 'byeolsum:session:v1';

/**
 * 저장된 데이터를 불러온다. 시연용이라 예전 형식은 변환하지 않는다:
 * 저장 형식 버전이 다르거나 깨졌으면 전부 지우고(로그인 상태 포함) 새 예시 데이터로 채운다.
 */
export function loadDb(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.version === DB_VERSION && Array.isArray(parsed.accounts)) return normalizeDb(parsed as DB);
    }
  } catch {
    /* 아래에서 새로 채움 */
  }
  return resetAllData();
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
