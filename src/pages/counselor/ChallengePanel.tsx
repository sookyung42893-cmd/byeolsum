import { useState } from 'react';
import { RotateCcw, Send, Undo2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PLANETS, sessionLabel } from '../../data/planets';
import { activeChallenge, challengesOf, isPlanetOpen } from '../../lib/voyage';
import { CHALLENGE_STATUS_TEXT, STEP_LABEL, challengeGap, resumeChallenge, sendChallenge, withdrawChallenge } from '../../lib/challenge';
import { DAY, daysUntil, formatDate, toDateKey } from '../../lib/dates';
import { askConfirm } from '../../lib/confirm';
import type { Challenge, Student } from '../../types';

const TITLE_MAX = 60;
const MESSAGE_MAX = 150;

const STATUS_STYLE: Record<Challenge['status'], string> = {
  보냄: 'bg-[#E8EAFB] text-obs-accent',
  '실행 전 기록': 'bg-[#FDF0DC] text-[#7A4B0C]',
  완료: 'bg-[#E1F3EE] text-[#17614F]',
  '다음 주로': 'bg-obs-bg text-obs-sub',
};

const STEP_HINT: Record<Challenge['step'], string> = {
  1: '부담이 적은 첫 시도',
  2: '조금 더 불편한 상황',
  3: '가장 피하던 상황',
};

/** 도전 미션 보내기 폼 */
function SendForm({ student }: { student: Student }) {
  const { db, updateDb } = useApp();
  const [title, setTitle] = useState('');
  const [step, setStep] = useState<Challenge['step']>(1);
  const [due, setDue] = useState(() => toDateKey(Date.now() + 6 * DAY));
  const [message, setMessage] = useState('');
  const [skills, setSkills] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');
  const active = activeChallenge(db, student.id);

  const toggleSkill = (id: number) => setSkills((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const submit = () => {
    const t = title.trim();
    if (!t) {
      setError('과제를 적어 주세요.');
      return;
    }
    updateDb((d) =>
      sendChallenge(d, {
        studentId: student.id,
        title: t,
        step,
        dueDate: due,
        counselorMessage: message.trim(),
        linkedSkills: skills,
        session: student.currentSession,
      }),
    );
    setSent(`"${t}" 도전 미션을 보냈어요. 학생 홈에 "관측소에서 신호가 왔어" 카드로 떠요.`);
    setTitle('');
    setMessage('');
    setSkills([]);
    setStep(1);
    setError('');
  };

  return (
    <form
      noValidate
      aria-labelledby="send-challenge-title"
      className="rounded-2xl border border-obs-line bg-obs-card p-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h3 id="send-challenge-title" className="font-sans text-base font-semibold">
        도전 미션 보내기
      </h3>
      <p className="mt-0.5 text-xs text-obs-sub">회기에서 학생과 함께 정한 다가가기 과제를 보내요 · {sessionLabel(student.currentSession)}</p>
      {active && (
        <p className="mt-3 rounded-lg bg-[#FDF0DC] px-3 py-2 text-xs text-[#7A4B0C]">
          아직 진행 중인 도전이 있어요: "{active.title}". 새로 보내면 학생 화면에는 새 도전이 먼저 보여요.
        </p>
      )}

      <div className="mt-4">
        <label htmlFor="ch-title" className="text-sm font-medium">
          과제
        </label>
        <input
          id="ch-title"
          value={title}
          maxLength={TITLE_MAX}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'ch-error' : undefined}
          placeholder="예: 점심시간에 반 친구 옆자리에 앉아보기"
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError('');
          }}
          className="mt-1 w-full rounded-lg border border-obs-line px-3 py-2 text-sm placeholder:text-obs-sub/80"
        />
        {error && (
          <p id="ch-error" role="alert" className="mt-1 text-xs text-[#B42318]">
            {error}
          </p>
        )}
      </div>

      <fieldset className="mt-4">
        <legend className="text-sm font-medium">단계</legend>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {([1, 2, 3] as const).map((n) => (
            <label
              key={n}
              className={`cursor-pointer rounded-xl border px-3 py-2 text-sm transition has-[:focus-visible]:shadow-[0_0_0_2px_#3B45A8,0_0_14px_3px_rgba(59,69,168,0.4)] ${
                step === n ? 'border-obs-accent bg-[#E8EAFB]' : 'border-obs-line hover:bg-obs-bg'
              }`}
            >
              <input type="radio" name="ch-step" className="sr-only" checked={step === n} onChange={() => setStep(n)} />
              <span className="block font-medium">
                {n}단계 · {STEP_LABEL[n]}
              </span>
              <span className="block text-xs text-obs-sub">{STEP_HINT[n]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4">
        <label htmlFor="ch-due" className="text-sm font-medium">
          기한
        </label>
        <input
          id="ch-due"
          type="date"
          value={due}
          min={toDateKey(Date.now())}
          onChange={(e) => setDue(e.target.value)}
          className="mt-1 block rounded-lg border border-obs-line px-3 py-2 text-sm"
        />
      </div>

      <fieldset className="mt-4">
        <legend className="text-sm font-medium">
          챙겨갈 기술 <span className="font-normal text-obs-sub">(연결할 행성, 여러 개 가능)</span>
        </legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {PLANETS.map((p) => {
            const open = isPlanetOpen(student, p.id);
            const on = skills.includes(p.id);
            return (
              <label
                key={p.id}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm has-[:focus-visible]:shadow-[0_0_0_2px_#3B45A8,0_0_14px_3px_rgba(59,69,168,0.4)] ${
                  !open ? 'cursor-not-allowed border-obs-line text-obs-sub' : on ? 'cursor-pointer border-obs-accent bg-[#E8EAFB]' : 'cursor-pointer border-obs-line hover:bg-obs-bg'
                }`}
              >
                <input type="checkbox" className="accent-[#3B45A8]" checked={on} disabled={!open} onChange={() => toggleSkill(p.id)} />
                {p.name}
                {!open && <span className="text-xs">(아직 안 배움)</span>}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-4">
        <label htmlFor="ch-message" className="text-sm font-medium">
          학생에게 한 마디 <span className="font-normal text-obs-sub">(선택)</span>
        </label>
        <textarea
          id="ch-message"
          rows={2}
          value={message}
          maxLength={MESSAGE_MAX}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="예: 아무 말 안 해도 괜찮아. 옆에 앉는 것까지만."
          className="mt-1 w-full resize-none rounded-lg border border-obs-line px-3 py-2 text-sm placeholder:text-obs-sub/80"
        />
        <p className="text-right text-xs text-obs-sub">
          {message.length} / {MESSAGE_MAX}
        </p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-4">
        <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-obs-accent px-5 py-2.5 text-sm font-medium text-white hover:brightness-110">
          <Send aria-hidden="true" className="h-4 w-4" />
          보내기
        </button>
        <p className="text-sm text-obs-text" aria-live="polite">
          {sent}
        </p>
      </div>
    </form>
  );
}

export default function ChallengePanel({ student }: { student: Student }) {
  const { db, updateDb } = useApp();
  const list = challengesOf(db, student.id);
  const active = activeChallenge(db, student.id);
  const gap = challengeGap(list);
  const tried = list.filter((c) => c.status === '완료').length;
  const postponed = list.filter((c) => c.status === '다음 주로').length;

  /** 다음 주로 넘긴 도전을 다시 열기: 학생 홈에 다시 "관측소에서 신호가 왔어"로 뜬다 (기한이 지났으면 6일 뒤로) */
  const reopen = (c: Challenge) => {
    void askConfirm(`"${c.title}" 도전을 다시 열까요? 학생 화면에 다시 지금 도전으로 떠요.`, '다시 열기').then(
      (ok) => ok && updateDb((d) => resumeChallenge(d, c.id)),
    );
  };

  const withdraw = (c: Challenge) => {
    void askConfirm(`"${c.title}" 도전 미션을 거둘까요? 학생 화면에서도 사라져요.`, '거두기').then(
      (ok) => ok && updateDb((d) => withdrawChallenge(d, c.id)),
    );
  };

  return (
    <section aria-labelledby="challenge-title" className="space-y-4">
      <div>
        <h2 id="challenge-title" className="font-sans text-xl font-semibold">
          도전 미션
        </h2>
        <p className="mt-0.5 text-sm text-obs-sub">
          성공·실패를 따지지 않고 시도 자체를 기록해요. 6~7회기(용기 구간)가 중심이지만 그 전에도 보낼 수 있어요.
        </p>
      </div>

      <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-obs-line bg-obs-card p-4">
              <p className="text-sm text-obs-sub">이번 주 상태</p>
              {active ? (
                <>
                  <p className="mt-1 font-medium leading-snug">{active.title}</p>
                  <p className="mt-1 text-xs text-obs-sub">
                    {active.step}단계 · {CHALLENGE_STATUS_TEXT[active.status]}
                    {active.predicted !== undefined && ` (하기 전 ${active.predicted}점)`} ·{' '}
                    {daysUntil(active.dueDate) >= 0 ? `D-${daysUntil(active.dueDate)}` : '기한 지남'}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm">진행 중인 도전 없음</p>
              )}
            </div>
            <div className="rounded-2xl border border-obs-line bg-obs-card p-4">
              <p className="text-sm text-obs-sub">시도한 도전</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {tried}
                <span className="ml-0.5 text-base font-normal text-obs-sub">회</span>
              </p>
              <p className="mt-1 text-xs text-obs-sub">다음 주로 넘김 {postponed}회</p>
            </div>
            <div className="rounded-2xl border border-obs-line bg-obs-card p-4">
              <p className="text-sm text-obs-sub">예상 vs 실제</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {gap.avg === null ? '-' : `${gap.avg > 0 ? '+' : ''}${gap.avg}`}
                {gap.avg !== null && <span className="ml-0.5 text-base font-normal text-obs-sub">점</span>}
              </p>
              <p className="mt-1 text-xs text-obs-sub">
                {gap.avg === null
                  ? '아직 비교할 기록이 없어요'
                  : gap.avg < 0
                    ? `하고 나니 예상보다 평균 ${Math.abs(gap.avg)}점 덜 무거웠어요 · ${gap.count}회`
                    : gap.avg > 0
                      ? `하고 나니 예상보다 평균 ${gap.avg}점 무거웠어요 · ${gap.count}회`
                      : `예상과 실제가 평균적으로 같았어요 · ${gap.count}회`}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-obs-line bg-obs-card p-6">
            <h3 className="font-sans text-base font-semibold">도전 기록</h3>
            {list.length === 0 ? (
              <p className="mt-3 text-sm text-obs-sub">아직 보낸 도전 미션이 없어요.</p>
            ) : (
              <table className="mt-3 w-full text-left text-sm">
                <thead className="text-xs text-obs-sub">
                  <tr className="border-b border-obs-line">
                    <th scope="col" className="py-2 pr-3 font-medium">보낸 회기</th>
                    <th scope="col" className="py-2 pr-3 font-medium">과제</th>
                    <th scope="col" className="py-2 pr-3 font-medium">상태</th>
                    <th scope="col" className="py-2 pr-3 font-medium">예상 → 실제</th>
                    <th scope="col" className="py-2 font-medium">
                      <span className="sr-only">관리</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-obs-line">
                  {list.map((c) => (
                    <tr key={c.id} className="align-top">
                      <td className="whitespace-nowrap py-3 pr-3 text-obs-sub">
                        {c.session}회기
                        <span className="block text-xs">{formatDate(c.createdAt)}</span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className="text-xs text-obs-sub">
                          {c.step}단계 · {STEP_LABEL[c.step]}
                          {c.linkedSkills.length > 0 && ` · ${c.linkedSkills.map((id) => PLANETS.find((p) => p.id === id)?.name).join(', ')}`}
                        </span>
                        <p>{c.title}</p>
                        {c.reflection && <p className="mt-1 rounded-lg bg-obs-bg px-2.5 py-1.5">소감: {c.reflection}</p>}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[c.status]}`}>
                          {CHALLENGE_STATUS_TEXT[c.status]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-3 pr-3 tabular-nums">
                        {c.predicted !== undefined ? c.predicted : '-'} → {c.actual !== undefined ? c.actual : '-'}
                      </td>
                      <td className="py-3 text-right">
                        {c.status === '다음 주로' &&
                          (active ? (
                            <span className="block max-w-[7rem] text-xs text-obs-sub">진행 중인 도전이 끝나면 다시 열 수 있어요</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => reopen(c)}
                              aria-label={`${c.title} 다시 열기`}
                              className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-obs-line px-2 py-1 text-xs text-obs-accent hover:bg-obs-bg"
                            >
                              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
                              다시 열기
                            </button>
                          ))}
                        {c.status === '보냄' && (
                          <button
                            type="button"
                            onClick={() => withdraw(c)}
                            aria-label={`${c.title} 거두기`}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-obs-sub hover:bg-obs-bg hover:text-obs-text"
                          >
                            <Undo2 aria-hidden="true" className="h-3.5 w-3.5" />
                            거두기
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <SendForm key={student.id} student={student} />
      </div>
    </section>
  );
}
