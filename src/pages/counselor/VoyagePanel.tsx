import { ChevronRight, HeartPulse } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  HEART_EXPERIMENT_ID,
  MISSIONS,
  STATIONS,
  TOTAL_SESSIONS,
  missionById,
  planetById,
  sessionLabel,
  stationOfSession,
  type Station,
} from '../../data/planets';
import {
  advanceSession,
  completedCount,
  courageChallenges,
  courageStars,
  isMissionOff,
  isPlanetOpen,
  progressOf,
  repeatCount,
  requiredMissions,
  stationStatus,
} from '../../lib/voyage';
import { formatDate } from '../../lib/dates';
import { askConfirm } from '../../lib/confirm';
import type { DB, MissionKind, PlanetStatus, Student } from '../../types';

/** 밝은 배경에서도 구분되는 정거장 표시 색 (점으로만 쓰고 글자색으로는 쓰지 않는다) */
const DOT: Record<string, string> = {
  'planet-1': '#C9762A',
  'planet-2': '#B98316',
  'planet-3': '#C94C6A',
  'planet-4': '#5C68D8',
  'planet-5': '#2F7FC9',
  courage: '#D08A2E',
  'planet-6': '#8A63C9',
};

const STATUS_STYLE: Record<PlanetStatus, string> = {
  완료: 'bg-[#E1F3EE] text-[#17614F]',
  탐사중: 'bg-[#E8EAFB] text-obs-accent',
  열림: 'bg-obs-bg text-obs-text',
  잠김: 'bg-obs-bg text-obs-sub',
};

const stationStatusText = (s: Station, st: PlanetStatus) =>
  s.kind === 'courage' ? (st === '완료' ? '지나옴' : st === '탐사중' ? '머무는 중' : '잠김') : st === '탐사중' ? '탐사 중' : st;

/**
 * 연습 vs 현실 미션 완료율. 열린 행성의 미션 중 꺼 두지 않은 것만 센다.
 * 완료는 첫 완료만 기준이고, 반복은 따로 센다.
 */
function kindRates(db: DB, student: Student) {
  const open = MISSIONS.filter((m) => isPlanetOpen(student, m.planetId) && !isMissionOff(student, m.id));
  return (['연습', '현실'] as MissionKind[]).map((kind) => {
    const list = open.filter((m) => m.kind === kind);
    const done = list.filter((m) => progressOf(db, student.id, m.id)?.status === '완료').length;
    const repeats = list.reduce((n, m) => n + repeatCount(progressOf(db, student.id, m.id)), 0);
    const later = list.filter((m) => progressOf(db, student.id, m.id)?.status === '다음 항해로').length;
    return { kind, total: list.length, done, repeats, later, pct: list.length ? Math.round((done / list.length) * 100) : 0 };
  });
}

function missionStatusText(db: DB, student: Student, missionId: string): string {
  const m = missionById(missionId)!;
  if (!isPlanetOpen(student, m.planetId)) return '잠김';
  if (isMissionOff(student, missionId)) return '꺼 둠';
  const p = progressOf(db, student.id, missionId);
  if (p?.status === '완료') {
    const n = repeatCount(p);
    return n > 0 ? `완료 · 반복 ${n}회` : '완료';
  }
  return p?.status ?? '대기';
}

export default function VoyagePanel({ student }: { student: Student }) {
  const { db, updateDb } = useApp();
  const last = student.currentSession >= TOTAL_SESSIONS;
  const nextSession = Math.min(TOTAL_SESSIONS, student.currentSession + 1);
  const nextStation = stationOfSession(nextSession);
  const sameStation = nextStation.key === stationOfSession(student.currentSession).key;
  const rates = kindRates(db, student);
  const heartOff = Boolean(student.heartExperimentOff);

  const advance = () => {
    const msg = sameStation
      ? `${student.name}의 회기를 ${nextSession}회기로 올릴까요? (${nextStation.name}에 계속 머물러요)`
      : `${student.name}의 회기를 ${nextSession}회기로 올리고 ${nextStation.name}을 열까요?`;
    void askConfirm(msg, '다음 회기로').then((ok) => ok && updateDb((d) => advanceSession(d, student.id)));
  };

  const toggleHeart = () =>
    updateDb((d) => ({
      ...d,
      students: d.students.map((s) => (s.id === student.id ? { ...s, heartExperimentOff: !heartOff } : s)),
    }));

  return (
    <section aria-labelledby="voyage-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="voyage-title" className="font-sans text-xl font-semibold">
            항해 현황
          </h2>
          <p className="mt-0.5 text-sm text-obs-sub">
            지금 {sessionLabel(student.currentSession)} · 완료율은 첫 완료만 기준이고, 다시 해 본 횟수는 따로 보여줘요.
          </p>
        </div>
        <div className="text-right">
          <button
            type="button"
            onClick={advance}
            disabled={last}
            className="inline-flex items-center gap-1.5 rounded-xl bg-obs-accent px-5 py-2.5 text-sm font-medium text-white hover:brightness-110 disabled:cursor-not-allowed disabled:bg-obs-line disabled:text-obs-sub"
          >
            다음 회기로
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
          <p className="mt-1 text-xs text-obs-sub">
            {last ? '8회기까지 모두 진행했어요' : `회기를 마치면 눌러 주세요 → ${nextSession}회기 · ${nextStation.name}`}
          </p>
        </div>
      </div>

      <ol className="grid grid-cols-7 gap-2">
        {STATIONS.map((s) => {
          const st = stationStatus(db, student, s);
          const here = s.sessions.includes(student.currentSession);
          return (
            <li
              key={s.key}
              aria-current={here ? 'step' : undefined}
              className={`rounded-2xl border bg-obs-card p-3 ${here ? 'border-obs-accent ring-1 ring-obs-accent' : 'border-obs-line'}`}
            >
              <p className="text-xs text-obs-sub">{s.kind === 'courage' ? '6~7회기' : `${s.sessions[0]}회기`}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium">
                <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: DOT[s.key] }} />
                {s.name}
              </p>
              <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[st]}`}>
                {stationStatusText(s, st)}
              </span>
              <p className="mt-1.5 text-xs text-obs-sub">
                {s.kind === 'courage'
                  ? `도전 ${courageChallenges(db, student.id).length} · 용기의 별 ${courageStars(db, student.id, true)}`
                  : st === '잠김'
                    ? '미션 대기'
                    : `미션 ${completedCount(db, student.id, s.planetId!)}/${requiredMissions(db, student.id, s.planetId!).length}`}
              </p>
            </li>
          );
        })}
      </ol>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)] gap-4">
        {rates.map((r) => (
          <div key={r.kind} className="rounded-2xl border border-obs-line bg-obs-card p-5">
            <p className="text-sm text-obs-sub">{r.kind} 미션 완료율</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {r.pct}
              <span className="ml-0.5 text-base font-normal text-obs-sub">%</span>
            </p>
            <div
              role="progressbar"
              aria-label={`${r.kind} 미션 완료율`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={r.pct}
              className="mt-2 h-2 overflow-hidden rounded-full bg-obs-bg"
            >
              <div className="h-full rounded-full bg-obs-accent" style={{ width: `${r.pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-obs-sub">
              열린 미션 {r.total}개 중 {r.done}개 완료 · 반복 {r.repeats}회{r.later ? ` · 다음 항해로 ${r.later}개` : ''}
            </p>
          </div>
        ))}
        <div className="rounded-2xl border border-obs-line bg-obs-card p-5">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <HeartPulse aria-hidden="true" className="h-4 w-4 text-[#C94C6A]" />
            두근 실험 (두근 행성 현실 미션)
          </p>
          <p className="mt-1 text-xs leading-relaxed text-obs-sub">
            30초 제자리 뛰기가 몸에 부담되는 학생이면 꺼 주세요. 끄면 학생 화면에서 미션이 빠지고, 이 미션 없이도 발견물을 얻어요.
          </p>
          <button
            type="button"
            role="switch"
            aria-checked={heartOff}
            onClick={toggleHeart}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-obs-line px-3 py-2 text-sm hover:bg-obs-bg"
          >
            <span
              aria-hidden="true"
              className={`relative h-5 w-9 rounded-full transition ${heartOff ? 'bg-obs-accent' : 'bg-obs-line'}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${heartOff ? 'left-[1.1rem]' : 'left-0.5'}`} />
            </span>
            {heartOff ? '꺼 둠' : '켜져 있음'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-obs-line bg-obs-card p-6">
        <h3 className="font-sans text-base font-semibold">행성 미션 기록</h3>
        <table className="mt-3 w-full text-left text-sm">
          <thead className="text-xs text-obs-sub">
            <tr className="border-b border-obs-line">
              <th scope="col" className="py-2 pr-3 font-medium">행성</th>
              <th scope="col" className="py-2 pr-3 font-medium">미션</th>
              <th scope="col" className="py-2 pr-3 font-medium">상태</th>
              <th scope="col" className="py-2 font-medium">학생 기록 (첫 완료)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-obs-line">
            {MISSIONS.filter((m) => isPlanetOpen(student, m.planetId)).map((m) => {
              const p = progressOf(db, student.id, m.id);
              const status = missionStatusText(db, student, m.id);
              return (
                <tr key={m.id} className="align-top">
                  <td className="whitespace-nowrap py-3 pr-3">
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: DOT[`planet-${m.planetId}`] }} />
                      {planetById(m.planetId).name}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <span className="text-xs text-obs-sub">{m.kind}</span>
                    <p>{m.title}</p>
                  </td>
                  <td className="whitespace-nowrap py-3 pr-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        status.startsWith('완료') ? STATUS_STYLE['완료'] : status === '다음 항해로' ? STATUS_STYLE['탐사중'] : STATUS_STYLE['잠김']
                      }`}
                    >
                      {status}
                    </span>
                    {p?.completedAt && <span className="mt-1 block text-xs text-obs-sub">{formatDate(p.completedAt)}</span>}
                  </td>
                  <td className="py-3">
                    {p?.moodBefore !== undefined && p.moodAfter !== undefined && (
                      <p className="text-xs text-obs-sub">
                        기분 {p.moodBefore} → {p.moodAfter}
                      </p>
                    )}
                    {p?.reflection ? <p className="whitespace-pre-line">{p.reflection}</p> : <span className="text-obs-sub">-</span>}
                    {m.id === HEART_EXPERIMENT_ID && heartOff && <p className="text-xs text-obs-sub">상담사가 꺼 둔 미션</p>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
