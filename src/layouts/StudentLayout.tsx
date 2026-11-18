import { useCallback, useEffect, useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useApp, useCurrentStudent } from '../context/AppContext';
import { autoCompletePractice } from '../lib/voyage';
import { alertsOf } from '../lib/crisis';
import StudentSideNav from '../components/student/StudentSideNav';
import HelpDialog from '../components/student/HelpDialog';
import { ConsentPage, PreAssessmentPage } from '../pages/student/Onboarding';

const seenKey = (studentId: string) => `byeolsum:crisis-seen:${studentId}`;

function loadSeen(studentId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(seenKey(studentId)) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function saveSeen(studentId: string, ids: string[]) {
  try {
    localStorage.setItem(seenKey(studentId), JSON.stringify(ids));
  } catch {
    /* 저장이 막혀 있으면 다음에 한 번 더 보일 뿐이다 */
  }
}

/**
 * 학생 화면 틀: 메뉴 + 본문.
 * 메뉴는 StudentSideNav로 분리돼 있어서, 모바일에서는 하단 탭 컴포넌트로 바꿔 끼우기만 하면 된다.
 * 처음 들어오면 동의 → 시작 척도를 거친 뒤에 앱을 쓸 수 있다.
 */
export default function StudentLayout() {
  const { db, updateDb, logOut } = useApp();
  const student = useCurrentStudent();
  const navigate = useNavigate();
  const [help, setHelp] = useState<'crisis' | 'help' | null>(null);

  // 별 띄우기·별똥별처럼 앱 기록으로 알 수 있는 연습 미션은 저절로 완료된다
  const studentId = student?.id;
  useEffect(() => {
    if (studentId && autoCompletePractice(db, studentId) !== db) updateDb((d) => autoCompletePractice(d, studentId));
  }, [db, studentId, updateDb]);

  // 동의와 시작 척도를 마친 뒤에 앱을 쓸 수 있다
  const consented = Boolean(studentId && db.consents.some((c) => c.studentId === studentId));
  const preDone = Boolean(studentId && db.assessments.some((a) => a.studentId === studentId && a.timing === '사전'));
  const onboarded = consented && preDone;

  // 새 위기 신호가 생기면 바로 도움 안내를 띄운다 (같은 신호는 한 번만, 앱 화면에 들어온 뒤에)
  const alertIds = studentId ? alertsOf(db, studentId).map((a) => a.id).join('|') : '';
  useEffect(() => {
    if (!studentId || !alertIds || !onboarded) return;
    const seen = loadSeen(studentId);
    const fresh = alertIds.split('|').filter((id) => !seen.includes(id));
    if (fresh.length > 0) {
      setHelp('crisis');
      saveSeen(studentId, [...seen, ...fresh]);
    }
  }, [alertIds, studentId, onboarded]);

  const closeHelp = useCallback(() => setHelp(null), []);

  if (!student) return <Navigate to="/" replace />;

  // 첫 실행: 동의 → 사전 척도
  if (!consented) return <ConsentPage />;
  if (!preDone) return <PreAssessmentPage />;

  const handleLogOut = () => {
    logOut();
    navigate('/');
  };

  return (
    <div className="theme-night flex min-h-screen bg-night-bg text-night-text">
      <StudentSideNav student={student} onLogOut={handleLogOut} onHelp={() => setHelp('help')} />
      <main className="min-w-0 flex-1 px-[4%] py-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
      {help && <HelpDialog mode={help} onClose={closeHelp} />}
    </div>
  );
}
