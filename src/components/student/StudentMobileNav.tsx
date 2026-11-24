import { Link, useLocation } from 'react-router-dom';
import { LifeBuoy, LogOut, Sparkles } from 'lucide-react';
import { sessionLabel, stationOfSession } from '../../data/planets';
import type { Student } from '../../types';
import { METEOR_LINK, STUDENT_NAV, isNavActive } from './studentNav';

/** 휴대폰용 위쪽 바: 별숨 · 지금 회기 · 도움 받기 · 로그아웃 */
export function StudentTopBar({ student, onLogOut, onHelp }: { student: Student; onLogOut: () => void; onHelp: () => void }) {
  const station = stationOfSession(student.currentSession);
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-night-line bg-night-bg/90 px-4 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur md:hidden">
      <div className="min-w-0 flex-1">
        <p className="font-display text-xl leading-tight text-night-star">별숨</p>
        <p className="flex items-center gap-1.5 truncate text-[11px] text-night-sub">
          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: station.color }} />
          {sessionLabel(student.currentSession)}
        </p>
      </div>
      <button
        type="button"
        onClick={onHelp}
        className="inline-flex items-center gap-1.5 rounded-full border border-emo-hot/50 px-3 py-1.5 text-xs text-night-text"
      >
        <LifeBuoy aria-hidden="true" className="h-4 w-4 text-emo-hot" />
        도움 받기
      </button>
      <button type="button" onClick={onLogOut} aria-label="로그아웃" className="rounded-full p-2 text-night-sub hover:text-night-text">
        <LogOut aria-hidden="true" className="h-5 w-5" />
      </button>
    </header>
  );
}

/**
 * 휴대폰용 아래쪽 탭 (사이드 메뉴와 같은 STUDENT_NAV) + 늘 떠 있는 별똥별 버튼.
 * 별똥별은 감정이 셀 때 바로 쓸 수 있게 어느 화면에서나 엄지 닿는 곳에 둔다.
 */
export function StudentBottomNav() {
  const { pathname } = useLocation();
  const onMeteor = pathname.startsWith(METEOR_LINK.to);
  return (
    <>
      {!onMeteor && (
        <Link
          to={METEOR_LINK.to}
          aria-label={METEOR_LINK.label}
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-30 flex items-center gap-1.5 rounded-full border border-emo-hot/60 bg-night-card px-4 py-3 text-sm font-medium text-night-text shadow-[0_0_24px_rgba(255,142,114,0.35)] md:hidden"
        >
          <Sparkles aria-hidden="true" className="h-5 w-5 text-emo-hot" />
          별똥별
        </Link>
      )}
      <nav
        aria-label="학생 메뉴"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-night-line bg-night-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-5">
          {STUDENT_NAV.map((item) => {
            const active = isNavActive(item, pathname);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center gap-0.5 px-1 pb-2 pt-2.5 text-[11px] ${active ? 'text-night-star' : 'text-night-sub'}`}
                >
                  <Icon aria-hidden="true" className="h-5 w-5" />
                  <span className="truncate">{item.label.replace('나의 ', '')}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
