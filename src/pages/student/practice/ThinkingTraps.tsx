import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Telescope } from 'lucide-react';
import { useApp, useCurrentStudent } from '../../../context/AppContext';
import { checkInsOf } from '../../../lib/selectors';
import { emotionLabel } from '../../../data/emotions';
import Chip from '../../../components/Chip';
import PracticeShell, { PracticeDone, usePracticeComplete } from './PracticeShell';

const MISSION = 'p4-practice';

const TRAPS = [
  { name: '결론 건너뛰기', desc: '확인도 하기 전에 결론부터 내려 버려.' },
  { name: '최악 상상하기', desc: '일어날 수 있는 가장 나쁜 일만 떠올려.' },
  { name: '마음 읽기', desc: '다른 사람 속마음을 안다고 믿어 버려.' },
  { name: '전부 아니면 전무', desc: '완벽하지 않으면 다 실패라고 봐.' },
  { name: '꼬리표 붙이기', desc: '한 번의 일로 나를 "원래 그런 사람"이라고 정해.' },
] as const;
type Trap = (typeof TRAPS)[number]['name'];

const QUIZ: { thought: string; answer: Trap }[] = [
  { thought: '답장이 30분째 없어. 분명 나를 싫어하게 된 거야.', answer: '결론 건너뛰기' },
  { thought: '발표 망치면 반 애들이 졸업할 때까지 날 비웃을 거야.', answer: '최악 상상하기' },
  { thought: '쟤 표정 보니까 속으로 날 한심하다고 생각하는 게 분명해.', answer: '마음 읽기' },
  { thought: '100점 아니면 공부한 게 다 의미 없어.', answer: '전부 아니면 전무' },
  { thought: '한 문제 틀렸어. 나는 원래 멍청한 애야.', answer: '꼬리표 붙이기' },
];

export default function ThinkingTrapsPage() {
  const { db } = useApp();
  const student = useCurrentStudent()!;
  const { complete, alreadyDone } = usePracticeComplete(MISSION);
  const recent = checkInsOf(db, student.id)
    .reverse()
    .filter((c) => c.situation.trim())
    .slice(0, 5);

  const [picks, setPicks] = useState<(Trap | null)[]>(QUIZ.map(() => null));
  const [ownId, setOwnId] = useState<string | null>(null);
  const [ownTrap, setOwnTrap] = useState<Trap | null>(null);
  const [done, setDone] = useState(false);

  const answered = picks.filter(Boolean).length;
  const own = recent.find((c) => c.id === ownId);

  const finish = () => {
    const found = [...new Set(picks.filter(Boolean))].join(', ');
    const lines = [`예시에서 찾아본 함정: ${found}`];
    if (own && ownTrap) lines.push(`내 생각에서: "${own.situation}" → ${ownTrap}`);
    complete(lines.join('\n'));
    setDone(true);
  };

  if (done) {
    return (
      <PracticeShell missionId={MISSION}>
        <PracticeDone missionId={MISSION}>
          {own && (
            <Link
              to={`/student/telescope?checkIn=${own.id}`}
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-night-star underline-offset-4 hover:underline"
            >
              <Telescope aria-hidden="true" className="h-4 w-4" />
              "{own.situation}"을 망원경 렌즈로 다시 보기
            </Link>
          )}
        </PracticeDone>
      </PracticeShell>
    );
  }

  return (
    <PracticeShell missionId={MISSION}>
      <section aria-labelledby="traps-title">
        <h2 id="traps-title" className="font-sans text-lg font-medium text-night-text">
          생각 함정 다섯 가지
        </h2>
        <ul className="mt-3 grid grid-cols-5 gap-[2%]">
          {TRAPS.map((t) => (
            <li key={t.name} className="rounded-2xl border border-night-line bg-night-card p-3">
              <p className="font-medium text-night-star">{t.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-night-sub">{t.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="quiz-title" className="space-y-4">
        <h2 id="quiz-title" className="font-sans text-lg font-medium text-night-text">
          1. 이 생각은 어떤 함정에 빠졌을까?
        </h2>
        <p className="text-sm text-night-sub">정답 맞히기가 아니야. 하나에 꼭 들어맞지 않을 수도 있어.</p>
        <ol className="space-y-3">
          {QUIZ.map((q, i) => {
            const pick = picks[i];
            return (
              <li key={q.thought} className="rounded-2xl border border-night-line bg-night-card p-4">
                <p className="text-night-text">"{q.thought}"</p>
                <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={`${i + 1}번 생각의 함정 고르기`}>
                  {TRAPS.map((t) => (
                    <Chip key={t.name} selected={pick === t.name} onClick={() => setPicks((p) => p.map((v, j) => (j === i ? t.name : v)))}>
                      {t.name}
                    </Chip>
                  ))}
                </div>
                {pick && (
                  <p aria-live="polite" className="mt-2 text-sm text-night-sub">
                    {pick === q.answer
                      ? `맞아, ${q.answer}에 가까워.`
                      : `그렇게 볼 수도 있어. 이 생각은 ${q.answer}에 더 가까워.`}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {recent.length > 0 && (
        <section aria-labelledby="own-title" className="space-y-3">
          <h2 id="own-title" className="font-sans text-lg font-medium text-night-text">
            2. 내 생각에서도 찾아볼까? <span className="text-sm font-normal text-night-sub">(선택)</span>
          </h2>
          <div className="flex flex-col gap-2">
            {recent.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={ownId === c.id}
                onClick={() => setOwnId(ownId === c.id ? null : c.id)}
                className={`rounded-2xl border p-3 text-left text-sm transition ${
                  ownId === c.id ? 'border-night-star bg-night-star/10' : 'border-night-line bg-night-card hover:border-night-sub'
                }`}
              >
                <span className="text-night-text">{c.situation}</span>
                <span className="ml-2 text-xs text-night-sub">{emotionLabel(c)}</span>
              </button>
            ))}
          </div>
          {own && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="내 생각의 함정 고르기">
              {TRAPS.map((t) => (
                <Chip key={t.name} selected={ownTrap === t.name} onClick={() => setOwnTrap(ownTrap === t.name ? null : t.name)}>
                  {t.name}
                </Chip>
              ))}
            </div>
          )}
        </section>
      )}

      <div>
        <button
          type="button"
          disabled={answered < QUIZ.length}
          onClick={finish}
          className="inline-flex items-center gap-2 rounded-xl bg-night-star px-6 py-3 font-medium text-night-bg hover:brightness-105 disabled:cursor-not-allowed disabled:bg-night-line disabled:text-night-sub"
        >
          {alreadyDone ? '다시 기록하기' : '연습 마치기'}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>
        {answered < QUIZ.length && (
          <p className="mt-2 text-xs text-night-sub">
            다섯 생각을 모두 살펴보면 마칠 수 있어 ({answered}/{QUIZ.length})
          </p>
        )}
      </div>
    </PracticeShell>
  );
}
