import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, CornerDownRight, Flag, Radio, RotateCcw } from 'lucide-react';
import { useApp, useCurrentStudent } from '../../context/AppContext';
import { planetById } from '../../data/planets';
import { activeChallenge, challengesOf, courageStars, isPlanetOpen, postponedChallenges } from '../../lib/voyage';
import {
  CHALLENGE_STATUS_TEXT,
  STEP_LABEL,
  completeChallenge,
  postponeChallenge,
  recordPredicted,
  resumeChallenge,
} from '../../lib/challenge';
import { daysUntil, formatDate } from '../../lib/dates';
import IntensitySlider from '../../components/IntensitySlider';
import CourageStarIcon from '../../components/codex/CourageStarIcon';
import { VisibleToCounselor } from './PlanetMissions';
import type { Challenge } from '../../types';

const REFLECTION_MAX = 100;
const HEART_LABELS = { minLabel: '0 아무렇지 않음', maxLabel: '10 아주 무거움' };

/** 1~3단계 계단 표시 */
function StepDots({ step }: { step: Challenge['step'] }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-night-text">
      <span aria-hidden="true" className="flex items-end gap-0.5">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`w-2 rounded-sm ${n <= step ? 'bg-night-star' : 'bg-night-line'}`}
            style={{ height: `${6 + n * 4}px` }}
          />
        ))}
      </span>
      {step}단계 · {STEP_LABEL[step]}
    </span>
  );
}

function dueText(dueDate: string) {
  const d = daysUntil(dueDate);
  const date = formatDate(dueDate + 'T00:00:00');
  if (d > 0) return `${date}까지 (D-${d})`;
  if (d === 0) return `${date}까지 (오늘)`;
  return `${date}까지였어. 늦어도 괜찮아`;
}

/** 지금 도전 카드: 하기 전 마음 → 해 보기 → 하고 나서 마음 + 소감 */
function ActiveChallenge({ ch, onDone }: { ch: Challenge; onDone: (c: Challenge) => void }) {
  const { updateDb } = useApp();
  const student = useCurrentStudent()!;
  const [predicted, setPredicted] = useState(ch.predicted ?? 6);
  const [actual, setActual] = useState(ch.predicted ?? 5);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [editPredicted, setEditPredicted] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const before = ch.status === '보냄' || editPredicted;

  const savePredicted = () => {
    updateDb((d) => recordPredicted(d, ch.id, predicted));
    setActual(predicted);
    setEditPredicted(false);
  };

  const finish = () => {
    const t = text.trim();
    if (!t) {
      setError('한 줄 소감을 남겨야 기록돼. 짧아도 괜찮아.');
      textRef.current?.focus();
      return;
    }
    updateDb((d) => completeChallenge(d, ch.id, actual, t));
    onDone({ ...ch, actual, reflection: t, status: '완료' });
  };

  return (
    <article
      aria-labelledby="active-title"
      className="rounded-3xl border border-night-star/60 bg-night-card p-6 shadow-[0_0_32px_rgba(244,201,121,0.10)]"
    >
      <p className="flex items-center gap-2 text-sm text-night-star">
        <Radio aria-hidden="true" className="h-4 w-4" />
        관측소에서 신호가 왔어 · {ch.session}회기
      </p>
      <h2 id="active-title" className="mt-2 font-display text-2xl leading-snug text-night-text">
        {ch.title}
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <StepDots step={ch.step} />
        <span className="inline-flex items-center gap-1.5 text-night-sub">
          <CalendarDays aria-hidden="true" className="h-4 w-4" />
          {dueText(ch.dueDate)}
        </span>
      </div>

      {ch.counselorMessage && (
        <blockquote className="mt-4 border-l-2 border-night-star/60 pl-4 leading-relaxed text-night-text">
          {ch.counselorMessage}
          <footer className="mt-1 text-xs text-night-sub">— 상담 선생님</footer>
        </blockquote>
      )}

      {ch.linkedSkills.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-night-sub">챙겨갈 기술</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {ch.linkedSkills.map((id) => {
              const p = planetById(id);
              const open = isPlanetOpen(student, id);
              return (
                <li key={id}>
                  {open ? (
                    <Link
                      to={`/student/planet/${id}`}
                      className="inline-flex items-center gap-2 rounded-full border border-night-line px-3 py-1.5 text-sm text-night-text hover:bg-night-line/50"
                    >
                      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.name} · {p.theme}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-full border border-night-line px-3 py-1.5 text-sm text-night-sub">
                      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-6 border-t border-night-line pt-5">
        {before ? (
          <section aria-labelledby="before-title" className="space-y-4">
            <h3 id="before-title" className="font-sans text-base font-medium text-night-text">
              1. 하기 전, 이 도전을 떠올리면 마음이 몇 점이야?
            </h3>
            <div className="max-w-md">
              <IntensitySlider label="하기 전 마음" hideLabel value={predicted} onChange={setPredicted} color="#FFC98A" {...HEART_LABELS} />
            </div>
            <p className="text-xs text-night-sub">맞히는 게 목적이 아니야. 지금 느껴지는 대로 적어 봐.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={savePredicted} className="rounded-xl bg-night-star px-5 py-2.5 font-medium text-night-bg hover:brightness-105">
                {editPredicted ? '고친 대로 저장' : '적어 두고 도전하러 가기'}
              </button>
              {!editPredicted && <LaterButton id={ch.id} />}
            </div>
          </section>
        ) : (
          <form
            noValidate
            aria-labelledby="after-title"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              finish();
            }}
          >
            <p className="text-sm text-night-sub">
              하기 전 마음 <span className="font-display text-lg text-night-text">{ch.predicted}</span>점으로 적어 뒀어.{' '}
              <button type="button" onClick={() => setEditPredicted(true)} className="text-night-star underline-offset-4 hover:underline">
                고치기
              </button>
            </p>
            <h3 id="after-title" className="font-sans text-base font-medium text-night-text">
              2. 다녀왔어? 하고 나서 마음은 몇 점이었어?
            </h3>
            <div className="max-w-md">
              <IntensitySlider label="하고 나서 마음" hideLabel value={actual} onChange={setActual} color="#FFC98A" {...HEART_LABELS} />
            </div>
            <div>
              <label htmlFor="challenge-reflection" className="block text-sm text-night-text">
                해 보니 어땠는지 한 줄 소감 <span className="text-night-star">(꼭 적어 줘)</span>
              </label>
              <textarea
                id="challenge-reflection"
                ref={textRef}
                rows={2}
                value={text}
                maxLength={REFLECTION_MAX}
                required
                aria-required="true"
                aria-invalid={Boolean(error)}
                aria-describedby="challenge-reflection-help"
                onChange={(e) => {
                  setText(e.target.value.slice(0, REFLECTION_MAX));
                  if (error) setError('');
                }}
                className={`mt-1.5 w-full max-w-xl resize-none rounded-xl border bg-night-bg px-3 py-2 text-night-text outline-none focus:border-night-star ${
                  error ? 'border-emo-hot' : 'border-night-line'
                }`}
              />
              <div id="challenge-reflection-help" className="flex max-w-xl items-start justify-between gap-3">
                {error ? (
                  <p role="alert" className="text-xs text-emo-hot">
                    {error}
                  </p>
                ) : (
                  <VisibleToCounselor />
                )}
                <span className="text-xs tabular-nums text-night-sub">
                  {text.length} / {REFLECTION_MAX}
                </span>
              </div>
            </div>
            <p className="text-xs text-night-sub">잘 됐든 아니든, 해 본 것만으로 용기의 별이 떠. {!text.trim() && '소감을 한 줄 적으면 기록할 수 있어.'}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={!text.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-night-star px-5 py-2.5 font-medium text-night-bg hover:brightness-105 disabled:cursor-not-allowed disabled:bg-night-line disabled:text-night-sub"
              >
                <Flag aria-hidden="true" className="h-4 w-4" />
                도전 기록하기
              </button>
              <LaterButton id={ch.id} />
            </div>
          </form>
        )}
      </div>
    </article>
  );
}

function LaterButton({ id }: { id: string }) {
  const { updateDb } = useApp();
  return (
    <button
      type="button"
      onClick={() => updateDb((d) => postponeChallenge(d, id))}
      className="inline-flex items-center gap-1.5 rounded-xl border border-night-line px-4 py-2.5 text-sm text-night-text hover:bg-night-line/50"
    >
      <CornerDownRight aria-hidden="true" className="h-4 w-4" />
      아직 어려워 · 다음 주로
    </button>
  );
}

/** 도전을 기록한 직후: 용기의 별이 떠오른다 */
function JustDone({ ch }: { ch: Challenge }) {
  return (
    <section aria-live="polite" className="flex items-center gap-[4%] rounded-3xl border border-night-star/60 bg-night-card p-6">
      <div className="h-20 w-20 shrink-0 motion-safe:animate-[courage-rise_1.2s_ease-out]">
        <CourageStarIcon className="h-full w-full drop-shadow-[0_0_14px_rgba(244,201,121,0.6)]" />
      </div>
      <div className="min-w-0">
        <p className="font-display text-xl text-night-text">용기의 별이 하나 떴어</p>
        <p className="mt-1 text-sm text-night-sub">
          결과가 어땠든, 피하던 것에 다가가 본 것 자체가 기록이야. 마음 점수: 예상 {ch.predicted} → 실제 {ch.actual}
        </p>
        <Link to="/student/sky" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-night-star underline-offset-4 hover:underline">
          밤하늘에서 용기의 별 보기
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

export default function ChallengePage() {
  const { db, updateDb } = useApp();
  const student = useCurrentStudent()!;
  const active = activeChallenge(db, student.id);
  const [justDone, setJustDone] = useState<Challenge | null>(null);
  const past = challengesOf(db, student.id).filter((c) => c.status === '완료');
  const postponed = postponedChallenges(db, student.id);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl text-night-text">도전 미션</h1>
        <p className="mt-2 max-w-2xl leading-relaxed text-night-sub">
          상담 선생님과 회기에서 함께 정한, 피하던 것에 한 걸음 다가가 보는 과제야. 성공했는지는 중요하지 않아. 해 보면 결과와
          상관없이 밤하늘에 용기의 별이 떠.
        </p>
        <p className="mt-1 text-sm text-night-sub">지금까지 띄운 용기의 별 {courageStars(db, student.id)}개</p>
      </header>

      {justDone && <JustDone ch={justDone} />}

      {active ? (
        <ActiveChallenge key={active.id} ch={active} onDone={setJustDone} />
      ) : (
        !justDone && (
          <p className="rounded-3xl border border-night-line bg-night-card p-6 text-night-sub">
            지금은 도착한 도전 미션이 없어. 다음 회기에 선생님과 함께 정해 보자.
          </p>
        )
      )}

      {postponed.length > 0 && (
        <section aria-labelledby="later-title">
          <h2 id="later-title" className="font-sans text-lg font-medium text-night-text">
            다음 주로 넘겨 둔 도전
          </h2>
          <p className="mt-1 text-sm text-night-sub">
            넘겨 둔 건 괜찮아. 마음이 내킬 때 스스로 다시 꺼내도 되고, 회기에서 선생님과 다시 열어도 돼.
          </p>
          <ul className="mt-3 space-y-3">
            {postponed.map((c) => (
              <li key={c.id} className="flex flex-col gap-3 rounded-2xl border border-night-line bg-night-card p-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <CornerDownRight aria-hidden="true" className="hidden h-5 w-5 shrink-0 text-night-sub sm:block" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-night-sub">
                    {c.session}회기 · {c.step}단계 · {formatDate(c.createdAt)}에 받음
                    {c.predicted !== undefined && ` · 하기 전 마음 ${c.predicted}점 적어 둠`}
                  </p>
                  <p className="mt-0.5 font-medium text-night-text">{c.title}</p>
                </div>
                {active ? (
                  <p className="text-xs text-night-sub">지금 도전을 먼저 마치거나 넘기면 다시 꺼낼 수 있어</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setJustDone(null);
                      updateDb((d) => resumeChallenge(d, c.id));
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-night-star/60 px-4 py-2 text-sm text-night-text hover:bg-night-star/10"
                  >
                    <RotateCcw aria-hidden="true" className="h-4 w-4" />
                    지금 다시 도전하기
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="past-title">
        <h2 id="past-title" className="font-sans text-lg font-medium text-night-text">
          지난 도전 기록
        </h2>
        {past.length === 0 ? (
          <p className="mt-3 text-sm text-night-sub">아직 기록이 없어.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {past.map((c) => (
              <li key={c.id} className="flex items-start gap-4 rounded-2xl border border-night-line bg-night-card p-4">
                <div className="mt-0.5 h-8 w-8 shrink-0">
                  {c.status === '완료' ? (
                    <CourageStarIcon className="h-8 w-8" />
                  ) : (
                    <CornerDownRight aria-hidden="true" className="h-6 w-6 text-night-sub" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-night-sub">
                    {c.session}회기 · {c.step}단계 · {formatDate(c.completedAt ?? c.createdAt)} · {CHALLENGE_STATUS_TEXT[c.status]}
                  </p>
                  <p className="mt-0.5 font-medium text-night-text">{c.title}</p>
                  {c.status === '완료' && c.predicted !== undefined && c.actual !== undefined && (
                    <p className="mt-1 text-sm text-night-sub">
                      마음 점수 예상 <span className="tabular-nums text-night-text">{c.predicted}</span> → 실제{' '}
                      <span className="tabular-nums text-night-text">{c.actual}</span>
                    </p>
                  )}
                  {c.reflection && <p className="mt-1.5 rounded-xl bg-night-bg/70 px-3 py-2 text-sm text-night-text">{c.reflection}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
