import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Orbit, Users, type LucideIcon } from 'lucide-react';
import { useApp, useCurrentStudent } from '../../context/AppContext';
import { colorOf, emotionLabel } from '../../data/emotions';
import { checkInsOf } from '../../lib/selectors';
import { formatDateTime } from '../../lib/dates';
import { newId } from '../../lib/auth';
import IntensitySlider from '../../components/IntensitySlider';
import { VisibleToCounselor } from './PlanetMissions';import type { CheckIn, Strategy, StrategyUse } from '../../types';

type LensStrategy = Exclude<Strategy, '별똥별'>;

interface Lens {
  strategy: LensStrategy;
  icon: LucideIcon;
  desc: string;
  questions: string[];
}

const LENSES: Lens[] = [
  {
    strategy: '1년 뒤 궤도',
    icon: Orbit,
    desc: '1년 뒤의 나에게서 지금을 바라봐',
    questions: [
      '1년 뒤의 나는 이 일을 얼마나 기억하고 있을까?',
      '1년 뒤의 내가 지금의 나에게 한마디 해준다면?',
      '시간이 지나고 보면, 이 일에서 덜 중요해 보일 부분은 뭘까?',
    ],
  },
  {
    strategy: '친구별 시점',
    icon: Users,
    desc: '아끼는 친구의 별에서 바라봐',
    questions: [
      '가장 친한 친구가 똑같은 일을 겪었다면, 뭐라고 말해줄 거야?',
      '그 친구가 이 일을 너무 크게 받아들이고 있다면, 다르게 볼 수 있는 부분은?',
      '이 일에 함께 있던 사람에게는 어떤 사정이 있었을까?',
    ],
  },
  {
    strategy: '3인칭 관측일지',
    icon: BookOpen,
    desc: '관측자가 되어 "그 아이는"으로 적어봐',
    questions: [
      '관측자가 되어 적어봐. "그 아이는 ___ 일이 있어서 ___ 느꼈다."',
      '관측자가 보기에, 그 아이가 그렇게 느낀 건 이해할 만한 일일까?',
      '관측자가 그 아이에게 권하고 싶은 다음 한 걸음은?',
    ],
  },
];

const STEPS = ['상황', '렌즈', '예보', '관측', '마무리'] as const;
type StepIndex = 0 | 1 | 2 | 3 | 4;

function Stepper({ current }: { current: StepIndex }) {
  return (
    <ol className="mb-8 flex items-center gap-2 text-sm" aria-label="관측 단계">
      {STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-2" aria-current={i === current ? 'step' : undefined}>
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs ${
              i === current
                ? 'border-night-star bg-night-star font-medium text-night-bg'
                : i < current
                  ? 'border-night-star text-night-star'
                  : 'border-night-line text-night-sub'
            }`}
          >
            {i + 1}
          </span>
          <span className={i === current ? 'text-night-text' : 'text-night-sub'}>{s}</span>
          {i < STEPS.length - 1 && <span aria-hidden="true" className="mx-1 h-px w-8 bg-night-line" />}
        </li>
      ))}
    </ol>
  );
}

function SituationSummary({ c }: { c: CheckIn }) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorOf(c) }} />
      <div className="min-w-0">
        <p className="text-night-text">{c.situation || '(상황 메모 없음)'}</p>
        <p className="mt-0.5 text-xs text-night-sub">
          {emotionLabel(c)} · 강도 {c.intensity} · {formatDateTime(c.timestamp)}
        </p>
      </div>
    </div>
  );
}

function NavButtons({
  onBack,
  onNext,
  nextLabel = '다음',
  nextDisabled,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-8 flex items-center gap-3">
      {onBack && (
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-night-sub hover:text-night-text">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          이전
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="inline-flex items-center gap-2 rounded-xl bg-night-star px-6 py-3 font-medium text-night-bg transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-night-line disabled:text-night-sub"
      >
        {nextLabel}
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function TelescopePage() {
  const { db, updateDb } = useApp();
  const student = useCurrentStudent()!;
  const [params] = useSearchParams();
  const initialId = params.get('checkIn');

  const all = checkInsOf(db, student.id).reverse();
  const initial = all.find((c) => c.id === initialId);

  const [step, setStep] = useState<StepIndex>(initial ? 1 : 0);
  const [checkInId, setCheckInId] = useState<string | null>(initial?.id ?? null);
  const [lens, setLens] = useState<LensStrategy | null>(null);
  const [predicted, setPredicted] = useState(initial ? Math.max(0, initial.intensity - 2) : 5);
  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  const [actual, setActual] = useState(5);
  const [savedUse, setSavedUse] = useState<StrategyUse | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    // 단계가 바뀌면 새 단계 제목으로 포커스를 옮겨 스크린리더가 따라올 수 있게
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const selected = all.find((c) => c.id === checkInId);
  const lensInfo = LENSES.find((l) => l.strategy === lens);

  // 상황 메모가 있는 최근 기록 + 링크로 넘어온 기록
  const choices = all.filter((c) => c.situation.trim()).slice(0, 10);
  if (initial && !choices.includes(initial)) choices.unshift(initial);

  const chooseSituation = (c: CheckIn) => {
    setCheckInId(c.id);
    setPredicted(Math.max(0, c.intensity - 2));
  };

  const finish = () => {
    if (!selected || !lensInfo) return;
    const note = lensInfo.questions
      .map((q, i) => (answers[i].trim() ? `Q. ${q}\nA. ${answers[i].trim()}` : null))
      .filter(Boolean)
      .join('\n\n');
    const use: StrategyUse = {
      id: newId('su'),
      checkInId: selected.id,
      strategy: lensInfo.strategy,
      predictedAfter: predicted,
      actualAfter: actual,
      note,
      createdAt: new Date().toISOString(),
    };
    updateDb((d) => ({ ...d, strategyUses: [...d.strategyUses, use] }));
    setSavedUse(use);
    setStep(4);
  };

  const again = () => {
    setLens(null);
    setAnswers(['', '', '']);
    setSavedUse(null);
    setStep(1);
  };

  const heading = (children: ReactNode) => (
    <h2 ref={headingRef} tabIndex={-1} className="text-2xl text-night-text outline-none">
      {children}
    </h2>
  );

  return (
    <div className="max-w-3xl">
      <header className="mb-8">
        <h1 className="text-3xl text-night-text">망원경 관측</h1>
        <p className="mt-2 text-night-sub">렌즈를 바꿔 끼우면, 같은 일도 조금 다르게 보일 때가 있어.</p>
      </header>

      <Stepper current={step} />

      {selected && step > 0 && step < 4 && (
        <div className="mb-8 rounded-2xl border border-night-line bg-night-card p-5">
          <p className="mb-2 text-xs text-night-sub">관측할 상황</p>
          <SituationSummary c={selected} />
          {lensInfo && step > 1 && <p className="mt-3 text-sm text-night-star">렌즈: {lensInfo.strategy}</p>}
        </div>
      )}

      {step === 0 && (
        <section>
          {heading('어떤 상황을 들여다볼까?')}
          {choices.length > 0 ? (
            <ul className="mt-5 space-y-2">
              {choices.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-pressed={checkInId === c.id}
                    onClick={() => chooseSituation(c)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      checkInId === c.id ? 'border-night-star bg-night-star/10' : 'border-night-line bg-night-card hover:border-night-sub'
                    }`}
                  >
                    <SituationSummary c={c} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 rounded-2xl border border-night-line bg-night-card p-5 text-night-sub">
              아직 상황을 적어둔 기록이 없어.{' '}
              <Link to="/student/checkin" className="text-night-star underline underline-offset-4">
                감정 좌표 찍기
              </Link>
              에서 어떤 일이 있었는지 함께 남기면 여기서 볼 수 있어.
            </p>
          )}
          <NavButtons onNext={() => setStep(1)} nextDisabled={!selected} />
        </section>
      )}

      {step === 1 && (
        <section>
          {heading('어떤 렌즈를 끼워볼까?')}
          <div className="mt-5 grid grid-cols-3 gap-3">
            {LENSES.map(({ strategy, icon: Icon, desc }) => (
              <button
                key={strategy}
                type="button"
                aria-pressed={lens === strategy}
                onClick={() => setLens(strategy)}
                className={`flex flex-col gap-3 rounded-2xl border p-5 text-left transition ${
                  lens === strategy ? 'border-night-star bg-night-star/10' : 'border-night-line bg-night-card hover:border-night-sub'
                }`}
              >
                <Icon aria-hidden="true" className="h-6 w-6 text-night-star" />
                <span className="font-display text-lg text-night-text">{strategy}</span>
                <span className="text-sm text-night-sub">{desc}</span>
              </button>
            ))}
          </div>
          <NavButtons onBack={() => setStep(0)} onNext={() => setStep(2)} nextDisabled={!lens} />
        </section>
      )}

      {step === 2 && selected && (
        <section>
          {heading('관측이 끝나면, 몇 점쯤 될 것 같아?')}
          <p className="mt-2 text-night-sub">
            지금 강도는 {selected.intensity}이야. 맞히는 게 목적이 아니니까 느낌대로 예보해봐.
          </p>
          <div className="mt-6 max-w-md">
            <IntensitySlider label="관측 후 예상 강도" value={predicted} onChange={setPredicted} />
          </div>
          <NavButtons
            onBack={() => setStep(1)}
            onNext={() => {
              setActual(predicted);
              setStep(3);
            }}
          />
        </section>
      )}

      {step === 3 && lensInfo && (
        <section>
          {heading(`${lensInfo.strategy} 렌즈로 관측 중`)}
          <p className="mt-2 text-night-sub">떠오르는 만큼만 적어도 괜찮아. 하나만 적어도 돼.</p>
          <div className="mt-1">
            <VisibleToCounselor />
          </div>
          <div className="mt-6 space-y-6">
            {lensInfo.questions.map((q, i) => (
              <div key={q}>
                <label htmlFor={`obs-${i}`} className="mb-2 block text-night-text">
                  {q}
                </label>
                <textarea
                  id={`obs-${i}`}
                  rows={3}
                  value={answers[i]}
                  onChange={(e) => setAnswers((a) => a.map((v, j) => (j === i ? e.target.value : v)))}
                  className="w-full resize-none rounded-xl border border-night-line bg-night-bg px-4 py-3 text-night-text outline-none focus:border-night-star"
                />
              </div>
            ))}
            <div className="max-w-md rounded-2xl border border-night-line bg-night-card p-5">
              <IntensitySlider label="관측을 마친 지금, 실제 강도는?" value={actual} onChange={setActual} />
            </div>
          </div>
          <NavButtons
            onBack={() => setStep(2)}
            onNext={finish}
            nextLabel="관측 마치기"
            nextDisabled={answers.every((a) => !a.trim())}
          />
        </section>
      )}

      {step === 4 && savedUse && selected && (
        <section>
          {heading('관측일지를 남겼어')}
          <p className="mt-2 text-night-sub">밤하늘로 돌아가면 이 별의 빛 갈래 하나에 렌즈 색이 스며들어 있을 거야. (갈래 네 개까지)</p>
          <dl className="mt-6 grid max-w-xl grid-cols-3 gap-3">
            {[
              { label: '시작할 때', value: selected.intensity },
              { label: '예보', value: savedUse.predictedAfter },
              { label: '실제', value: savedUse.actualAfter },
            ].map((d) => (
              <div key={d.label} className="rounded-2xl border border-night-line bg-night-card p-5">
                <dt className="text-sm text-night-sub">{d.label}</dt>
                <dd className="mt-1 font-display text-3xl text-night-text">{d.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 max-w-xl leading-relaxed text-night-text">
            {savedUse.actualAfter < savedUse.predictedAfter
              ? '예보보다 마음이 더 가벼워졌어. 렌즈를 끼우기 전엔 잘 안 보이던 부분이 있었나 봐.'
              : savedUse.actualAfter === savedUse.predictedAfter
                ? '예보랑 딱 맞았어. 내 마음을 꽤 잘 알고 있는 거야.'
                : '아직 마음이 무거울 수 있어. 그것도 괜찮아. 렌즈를 바꿔보거나, 별똥별 궤적을 함께 해봐도 좋아.'}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/student/sky"
              state={{ observedUseId: savedUse.id }}
              className="rounded-xl bg-night-star px-5 py-3 font-medium text-night-bg hover:brightness-105"
            >
              밤하늘에서 별 보기
            </Link>
            <button type="button" onClick={again} className="rounded-xl border border-night-line px-5 py-3 text-night-text hover:bg-night-line/50">
              다른 렌즈로 한 번 더
            </button>
            {savedUse.actualAfter > savedUse.predictedAfter && (
              <Link
                to={`/student/meteor?checkIn=${selected.id}`}
                className="rounded-xl border border-emo-hot/60 px-5 py-3 text-night-text hover:bg-emo-hot/10"
              >
                별똥별 궤적
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
