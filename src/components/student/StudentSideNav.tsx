import { Link, NavLink, useLocation } from 'react-router-dom';
import { LifeBuoy, LogOut, Sparkles } from 'lucide-react';
import { sessionLabel, stationOfSession } from '../../data/planets';
import type { Student } from '../../types';
import { METEOR_LINK, STUDENT_NAV, isNavActive } from './studentNav';

const linkClass = (active: boolean) =>
  `flex items-center gap-3 rounded-xl px-4 py-2.5 transition ${
    active ? 'bg-night-line text-night-text' : 'text-night-sub hover:bg-night-line/50 hover:text-night-text'
  }`;

/**
 * 노트북용 학생 사이드 메뉴. 휴대폰에서는 같은 STUDENT_NAV를 쓰는 StudentMobileNav(위쪽 바 + 아래쪽 탭)가 대신 보인다.
 */
export default function StudentSideNav({
  student,
  onLogOut,
  onHelp,
}: {
  student: Student;
  onLogOut: () => void;
  /** "도움 받기" 창 열기 (1388·109, 등록한 연락할 사람) */
  onHelp: () => void;
}) {
  const { pathname } = useLocation();
  const station = stationOfSession(student.currentSession);

  return (
    <aside className="sticky top-0 hidden h-screen md:flex w-[17%] min-w-[13rem] max-w-[16rem] shrink-0 flex-col border-r border-night-line bg-night-card/60 px-4 py-6">
      <div className="px-4">
        <p className="font-display text-2xl text-night-star">별숨</p>
        <p className="mt-1 text-sm text-night-sub">{student.name}의 밤하늘</p>
        <p className="mt-3 flex items-center gap-2 text-xs text-night-sub">
          <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: station.color }} />
          {sessionLabel(student.currentSession)}
        </p>
      </div>

      <nav aria-label="학생 메뉴" className="mt-8 flex flex-col gap-1">
        {STUDENT_NAV.map((item) => {
          const active = isNavActive(item, pathname);
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to} className={linkClass(active)} aria-current={active ? 'page' : undefined}>
              <Icon aria-hidden="true" className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-night-line pt-6">
        <p className="px-4 text-xs text-night-sub">마음이 너무 셀 때, 언제든</p>
        <NavLink
          to={METEOR_LINK.to}
          className={({ isActive }) =>
            `mt-2 flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
              isActive ? 'border-emo-hot bg-emo-hot/15 text-night-text' : 'border-emo-hot/50 text-night-text hover:bg-emo-hot/10'
            }`
          }
        >
          <Sparkles aria-hidden="true" className="h-5 w-5 text-emo-hot" />
          {METEOR_LINK.label}
        </NavLink>
      </div>

      <div className="mt-auto space-y-4">
        <div className="rounded-xl bg-night-bg/70 px-4 py-3 text-xs leading-relaxed text-night-sub">
          <p className="flex items-center gap-1.5 text-night-text">
            <LifeBuoy aria-hidden="true" className="h-4 w-4" />
            지금 많이 힘들다면
          </p>
          <p className="mt-1">청소년상담 1388 · 자살예방상담 109</p>
          <button type="button" onClick={onHelp} className="mt-2 text-night-star underline-offset-4 hover:underline">
            도움 받기 · 연락할 사람 보기
          </button>
        </div>
        <button
          type="button"
          onClick={onLogOut}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-night-sub transition hover:bg-night-line/50 hover:text-night-text"
        >
          <LogOut aria-hidden="true" className="h-5 w-5" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
