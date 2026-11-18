import { useState } from 'react';
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Check, Copy, LogOut, Telescope } from 'lucide-react';
import { useApp, useCurrentAccount } from '../context/AppContext';
import { lastCheckIn, studentsOf } from '../lib/selectors';
import { studentBadges } from '../lib/signals';
import { formatDate, relativeDays } from '../lib/dates';
import StatusBadge from '../components/StatusBadge';
import { stationOfSession } from '../data/planets';
import { CrisisCenter } from '../pages/counselor/Crisis';

function InviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 복사가 막혀 있으면 코드를 직접 보고 적으면 된다 */
    }
  };
  return (
    <span className="inline-flex items-center gap-2">
      <span>초대 코드</span>
      <span className="rounded-md bg-obs-bg px-2 py-0.5 font-medium tracking-[0.2em] text-obs-text">{code}</span>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? '복사됨' : '초대 코드 복사'}
        className="rounded-md p-1 text-obs-sub hover:bg-obs-bg hover:text-obs-text"
      >
        {copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
      </button>
    </span>
  );
}

/** /observatory 로 들어오면 첫 담당 학생으로, 없으면 안내 */
export function ObservatoryIndex() {
  const { db } = useApp();
  const account = useCurrentAccount();
  const first = account ? studentsOf(db, account.id)[0] : undefined;
  if (first) return <Navigate to={`/observatory/${first.id}`} replace />;
  return (
    <div className="mx-auto mt-24 max-w-lg text-center">
      <h1 className="text-2xl">아직 연결된 학생이 없어요</h1>
      <p className="mt-3 leading-relaxed text-obs-sub">
        학생이 별숨에 가입할 때 초대 코드{' '}
        <span className="font-medium tracking-[0.2em] text-obs-text">{account?.inviteCode}</span> 를 입력하면 이 목록에
        나타나요.
      </p>
    </div>
  );
}

export default function CounselorLayout() {
  const { db, session, logOut } = useApp();
  const account = useCurrentAccount();
  const navigate = useNavigate();

  if (session?.role !== 'counselor' || !account) return <Navigate to="/" replace />;

  const students = studentsOf(db, account.id);

  const handleLogOut = () => {
    logOut();
    navigate('/');
  };

  return (
    <div className="theme-obs flex min-h-screen flex-col bg-obs-bg text-obs-text">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-obs-line bg-obs-card px-8">
        <div className="flex items-center gap-3">
          <Telescope aria-hidden="true" className="h-6 w-6 text-obs-accent" />
          <p className="font-display text-xl">별숨 관측소</p>
        </div>
        <div className="flex items-center gap-6 text-sm text-obs-sub">
          {account.inviteCode && <InviteCode code={account.inviteCode} />}
          <span>오늘 {formatDate(Date.now())}</span>
          <span className="text-obs-text">{account.displayName}</span>
          <button
            type="button"
            onClick={handleLogOut}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-obs-sub transition hover:bg-obs-bg hover:text-obs-text"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            로그아웃
          </button>
        </div>
      </header>

      {/* 위기 신호: 근무 시간이면 적색 경보, 근무 외 시간에 생긴 건 다음 근무일 아침 확인 목록 */}
      <CrisisCenter students={students} />

      <div className="flex min-h-0 flex-1">
        <aside className="w-72 shrink-0 border-r border-obs-line bg-obs-card px-4 py-6">
          <h2 className="px-3 font-sans text-sm font-medium text-obs-sub">담당 학생 {students.length}명</h2>
          {students.length === 0 && (
            <p className="mt-3 px-3 text-sm leading-relaxed text-obs-sub">학생이 초대 코드로 가입하면 여기에 보여요.</p>
          )}
          <nav aria-label="담당 학생 목록" className="mt-3 flex flex-col gap-1">
            {students.map((s) => {
              const badges = studentBadges(db, s);
              const last = lastCheckIn(db, s.id);
              return (
                <NavLink
                  key={s.id}
                  to={`/observatory/${s.id}`}
                  className={({ isActive }) =>
                    `block rounded-xl border px-3 py-3 transition ${
                      isActive ? 'border-obs-accent bg-[#EEF0FA]' : 'border-transparent hover:bg-obs-bg'
                    }`
                  }
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-obs-sub">
                      {last ? `마지막 기록 ${relativeDays(last.timestamp)}` : '기록 없음'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-obs-sub">
                    현재 {s.currentSession}회기 · {stationOfSession(s.currentSession).name}
                  </p>
                  {badges.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {badges.map((b) => (
                        <StatusBadge key={b} kind={b} />
                      ))}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto px-10 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
