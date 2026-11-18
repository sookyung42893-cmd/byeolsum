import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Check, Info, Phone, Sunrise } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { KEYWORD_LIMIT_NOTICE, alertsOf, handleAlert, isWorkHours } from '../../lib/crisis';
import { formatDateTime } from '../../lib/dates';
import type { CrisisAlert, CrisisStatus, Student } from '../../types';

const STATUS_STYLE: Record<CrisisStatus, string> = {
  '새 신호': 'bg-[#FDE7E4] text-[#9F1D10]',
  확인함: 'bg-[#E8EAFB] text-obs-accent',
  연락함: 'bg-[#E1F3EE] text-[#17614F]',
};

/** 위기 신호 하나: 내용 + "확인함 / 연락함" + 메모 */
export function CrisisItem({ alert, studentName, showStudent = false }: { alert: CrisisAlert; studentName: string; showStudent?: boolean }) {
  const { updateDb } = useApp();
  const [memo, setMemo] = useState(alert.memo ?? '');
  const memoId = `memo-${alert.id}`;
  const mark = (status: CrisisStatus) => updateDb((d) => handleAlert(d, alert.id, status, memo.trim() || undefined));

  return (
    <li className="rounded-2xl border border-obs-line bg-obs-card p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {showStudent && (
          <Link to={`/observatory/${alert.studentId}`} className="font-semibold text-obs-text underline-offset-4 hover:underline">
            {studentName}
          </Link>
        )}
        <span className="rounded-full bg-[#FDE7E4] px-2 py-0.5 text-xs font-medium text-[#9F1D10]">{alert.kind}</span>
        <span className="text-xs text-obs-sub">
          {formatDateTime(alert.detectedAt)} · {alert.source}
          {!isWorkHours(alert.detectedAt) && ' · 근무 시간 외'}
        </span>
        <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[alert.status]}`}>{alert.status}</span>
      </div>
      <p className="mt-2 whitespace-pre-line text-obs-text">
        {alert.keyword && <span className="mr-1 font-medium text-[#9F1D10]">"{alert.keyword}"</span>}
        {alert.detail}
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label htmlFor={memoId} className="min-w-[14rem] flex-1">
          <span className="mb-1 block text-xs text-obs-sub">메모 (어떻게 확인·연락했는지)</span>
          <input
            id={memoId}
            value={memo}
            maxLength={120}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="예: 3교시 후 직접 만나 안전 확인, 보호자 통화"
            className="w-full rounded-lg border border-obs-line px-3 py-1.5 text-sm placeholder:text-obs-sub/80"
          />
        </label>
        <button
          type="button"
          onClick={() => mark('확인함')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-obs-line px-3 py-1.5 text-sm hover:bg-obs-bg"
        >
          <Check aria-hidden="true" className="h-4 w-4" />
          확인함
        </button>
        <button
          type="button"
          onClick={() => mark('연락함')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-obs-accent px-3 py-1.5 text-sm font-medium text-white hover:brightness-110"
        >
          <Phone aria-hidden="true" className="h-4 w-4" />
          연락함
        </button>
        {alert.status !== '새 신호' && (
          <span className="text-xs text-obs-sub">{alert.handledAt && `${formatDateTime(alert.handledAt)} 처리`}</span>
        )}
      </div>
    </li>
  );
}

/**
 * 관측소 맨 위: 아직 처리하지 않은 위기 신호.
 * - 근무 시간(평일 9~18시)에 생긴 신호 → 적색 경보 배너
 * - 근무 시간 밖에 생긴 신호 → "다음 근무일 아침 확인 목록"에 쌓여, 접속하자마자 맨 위에 보인다
 */
export function CrisisCenter({ students }: { students: Student[] }) {
  const { db } = useApp();
  const name = (id: string) => students.find((s) => s.id === id)?.name ?? '';
  const open = students.flatMap((s) => alertsOf(db, s.id)).filter((a) => a.status === '새 신호');
  if (open.length === 0) return null;
  const urgent = open.filter((a) => isWorkHours(a.detectedAt));
  const morning = open.filter((a) => !isWorkHours(a.detectedAt));

  return (
    <div className="space-y-3 border-b border-obs-line bg-obs-bg px-8 py-4">
      {urgent.length > 0 && (
        <section role="alert" aria-labelledby="urgent-title" className="rounded-2xl border-2 border-[#D92D20] bg-[#FEF3F2] p-5">
          <h2 id="urgent-title" className="flex items-center gap-2 font-sans text-lg font-semibold text-[#9F1D10]">
            <AlertTriangle aria-hidden="true" className="h-5 w-5" />
            적색 경보 · 위기 신호 {urgent.length}건
          </h2>
          <p className="mt-0.5 text-sm text-[#7A271A]">근무 시간에 들어온 신호예요. 학생의 안전을 먼저 확인해 주세요.</p>
          <ul className="mt-3 space-y-2">
            {urgent.map((a) => (
              <CrisisItem key={a.id} alert={a} studentName={name(a.studentId)} showStudent />
            ))}
          </ul>
        </section>
      )}
      {morning.length > 0 && (
        <section aria-labelledby="morning-title" className="rounded-2xl border-2 border-[#E9A23B] bg-[#FFF8EC] p-5">
          <h2 id="morning-title" className="flex items-center gap-2 font-sans text-lg font-semibold text-[#7A4B0C]">
            <Sunrise aria-hidden="true" className="h-5 w-5" />
            다음 근무일 아침 확인 목록 {morning.length}건
          </h2>
          <p className="mt-0.5 text-sm text-[#7A4B0C]">근무 시간 밖에 들어온 신호예요. 학생 화면에는 1388·109와 연락할 사람이 바로 안내됐어요.</p>
          <ul className="mt-3 space-y-2">
            {morning.map((a) => (
              <CrisisItem key={a.id} alert={a} studentName={name(a.studentId)} showStudent />
            ))}
          </ul>
        </section>
      )}
      <p className="flex items-center gap-1.5 text-xs text-obs-sub">
        <Info aria-hidden="true" className="h-3.5 w-3.5" />
        {KEYWORD_LIMIT_NOTICE}
      </p>
    </div>
  );
}

/** 학생 리포트: 이 학생의 위기 신호 기록 전체 (처리한 것 포함) */
export function CrisisHistory({ student }: { student: Student }) {
  const { db } = useApp();
  const list = alertsOf(db, student.id);
  return (
    <section aria-labelledby="crisis-history" className="rounded-2xl border border-obs-line bg-obs-card p-6">
      <h2 id="crisis-history" className="font-sans text-base font-semibold">
        위기 신호 기록
      </h2>
      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-obs-sub">
        <Info aria-hidden="true" className="h-3.5 w-3.5" />
        강도 10 연속 2회, 또는 메모·소감·편지의 위험 키워드를 감지해요. {KEYWORD_LIMIT_NOTICE} 학생이 원래 기록을 지워도 이 기록은 남아요.
      </p>
      {list.length === 0 ? (
        <p className="mt-3 text-sm text-obs-sub">감지된 위기 신호가 없어요.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {list.map((a) => (
            <CrisisItem key={a.id} alert={a} studentName={student.name} />
          ))}
        </ul>
      )}
    </section>
  );
}
