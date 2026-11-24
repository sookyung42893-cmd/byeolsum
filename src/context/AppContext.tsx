import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Account, DB, Session, Student } from '../types';
import { loadDb, loadSession, resetAllData, saveDb, saveSession } from '../data/storage';
import { removeDemoData, resetFreshStudent, restoreDemoData } from '../data/demo';
import { DEMO_INVITE_CODE } from '../data/seed';
import { syncCrisisAlerts } from '../lib/crisis';
import {
  findCounselorByCode,
  hashPassword,
  makeInviteCode,
  newId,
  sessionFor,
  validateSignUp,
  type SignUpErrors,
  type SignUpInput,
} from '../lib/auth';

interface AppContextValue {
  db: DB;
  updateDb: (updater: (db: DB) => DB) => void;
  session: Session;
  /** 성공하면 만든 계정으로 바로 로그인, 실패하면 항목별 오류 */
  signUp: (input: SignUpInput) => Promise<{ errors: SignUpErrors; account: null } | { errors: null; account: Account }>;
  /** 성공하면 계정, 실패하면 null */
  logIn: (username: string, password: string) => Promise<Account | null>;
  /** 예시 계정으로 비밀번호 없이 들어가기 */
  enterAs: (account: Account) => void;
  logOut: () => void;
  /** 처음 시작 체험: 기록 없는 새 학생으로 들어가 동의서·사전 검사부터 본다 (누를 때마다 새로) */
  startFresh: () => void;
  /** 예시 데이터를 처음 상태로 (직접 가입한 계정은 유지) */
  restoreDemo: () => void;
  /** 예시 데이터만 지우기 (직접 가입한 계정은 유지) */
  removeDemo: () => void;
  /** 개발용: 직접 가입한 계정까지 모두 지우고 예시 데이터로 새로 시작 */
  resetAll: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(loadDb);
  const [session, setSessionState] = useState<Session>(loadSession);

  useEffect(() => saveDb(db), [db]);

  // 기록이 바뀔 때마다 새 위기 신호를 찾아 경보로 남긴다 (한 번 남은 경보는 원래 기록을 지워도 그대로)
  useEffect(() => {
    if (syncCrisisAlerts(db) !== db) setDb((prev) => syncCrisisAlerts(prev));
  }, [db]);

  const updateDb = useCallback((updater: (db: DB) => DB) => setDb((prev) => updater(prev)), []);

  const setSession = useCallback((s: Session) => {
    saveSession(s);
    setSessionState(s);
  }, []);

  const signUp = useCallback<AppContextValue['signUp']>(
    async (input) => {
      const errors = validateSignUp(input, db.accounts);
      if (Object.keys(errors).length > 0) return { errors, account: null };

      const now = new Date().toISOString();
      const username = input.username.trim();
      const displayName = input.displayName.trim();
      const account: Account = {
        id: newId('acc'),
        username,
        passwordHash: await hashPassword(username, input.password),
        role: input.role,
        displayName,
        createdAt: now,
      };
      let student: Student | undefined;
      if (input.role === 'student') {
        student = {
          id: newId('stu'),
          name: displayName,
          currentSession: 1,
          sessionStartedAt: now,
          nextSessionDate: null,
          mode: '회기중',
          heartExperimentOff: false,
          joinedAt: now,
          counselorId: findCounselorByCode(db.accounts, input.inviteCode)?.id ?? null,
        };
        account.studentId = student.id;
      } else {
        account.inviteCode = makeInviteCode(new Set([DEMO_INVITE_CODE, ...db.accounts.map((a) => a.inviteCode ?? '')]));
      }
      setDb((prev) => ({
        ...prev,
        accounts: [...prev.accounts, account],
        students: student ? [...prev.students, student] : prev.students,
      }));
      setSession(sessionFor(account));
      return { errors: null, account };
    },
    [db.accounts, setSession],
  );

  const logIn = useCallback<AppContextValue['logIn']>(
    async (username, password) => {
      const account = db.accounts.find((a) => a.username === username.trim());
      if (!account) return null;
      if ((await hashPassword(account.username, password)) !== account.passwordHash) return null;
      setSession(sessionFor(account));
      return account;
    },
    [db.accounts, setSession],
  );

  const enterAs = useCallback((account: Account) => setSession(sessionFor(account)), [setSession]);
  const logOut = useCallback(() => setSession(null), [setSession]);

  const startFresh = useCallback(() => {
    const { db: next, account } = resetFreshStudent(db);
    setDb(next);
    setSession(sessionFor(account));
  }, [db, setSession]);

  const restoreDemo = useCallback(() => {
    setDb((prev) => restoreDemoData(prev));
    setSession(null);
  }, [setSession]);

  const removeDemo = useCallback(() => {
    setDb((prev) => removeDemoData(prev));
    setSession(null);
  }, [setSession]);

  const resetAll = useCallback(() => {
    setDb(resetAllData());
    setSessionState(null);
  }, []);

  const value = useMemo(
    () => ({ db, updateDb, session, signUp, logIn, enterAs, logOut, startFresh, restoreDemo, removeDemo, resetAll }),
    [db, updateDb, session, signUp, logIn, enterAs, logOut, startFresh, restoreDemo, removeDemo, resetAll],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp은 AppProvider 안에서만 쓸 수 있어요');
  return ctx;
}

export function useCurrentAccount(): Account | undefined {
  const { db, session } = useApp();
  return session ? db.accounts.find((a) => a.id === session.accountId) : undefined;
}

/** 학생 화면에서 현재 로그인한 학생 */
export function useCurrentStudent(): Student | undefined {
  const { db, session } = useApp();
  if (session?.role !== 'student') return undefined;
  return db.students.find((s) => s.id === session.studentId);
}
