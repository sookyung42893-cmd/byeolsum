import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Telescope } from 'lucide-react';
import { useApp, useCurrentStudent } from '../../../context/AppContext';
import { checkInsOf } from '../../../lib/selectors';
import { emotionLabel } from '../../../data/emotions';
import Chip from '../../../components/Chip';
import TrapMonster, { TRAP_INFO, trapInfo, type TrapName } from '../../../components/student/TrapMonster';
import PracticeShell, { PracticeDone, usePracticeComplete } from './PracticeShell';

const MISSION = 'p4-practice';

type LensKind = 'balanced' | 'trapped' | 'forced';

interface Round {
  thought: string;
  answer: TrapName;
  /** 렌즈로 다시 본 생각 후보 (순서대로 보여준다) */
  lenses: { text: string; kind: LensKind }[];
}

/**
 * 함정 몬스터 사냥: 거울에 비친 생각 속에 숨은 몬스터(생각 함정)를 찾아 잡고,
 * 렌즈로 다시 본 생각(균형 잡힌 생각)을 골라 거울을 맑게 만든다.
 * 틀려도 벌칙은 없고, 정답 몬스터를 보여주며 함께 잡는다.
 */
const ROUNDS: Round[] = [
  {
    thought: '답장이 30분째 없어. 분명 나를 싫어하게 된 거야.',
    answer: '결론 건너뛰기',
    lenses: [
      { text: '30분이면 충분히 길어. 날 싫어하는 게 맞아.', kind: 'trapped' },
      { text: '바쁘거나 폰을 못 보는 중일 수도 있어. 조금 더 기다려 보고 확인해 보자.', kind: 'balanced' },
      { text: '난 신경 하나도 안 써. 아무 상관 없어.', kind: 'forced' },
    ],
  },
  {
    thought: '발표 망치면 반 애들이 졸업할 때까지 날 비웃을 거야.',
    answer: '최악 상상하기',
    lenses: [
      { text: '난 완벽하게 할 거니까 걱정할 필요도 없어.', kind: 'forced' },
      { text: '분명 망칠 거고, 평생 놀림감이 될 거야.', kind: 'trapped' },
      { text: '조금 실수할 수는 있어. 그래도 다들 금방 잊고, 다음에 또 기회가 있어.', kind: 'balanced' },
    ],
  },
  {
    thought: '쟤 표정 보니까 속으로 날 한심하다고 생각하는 게 분명해.',
    answer: '마음 읽기',
    lenses: [
      { text: '표정만으로는 속마음을 알 수 없어. 그냥 피곤한 걸 수도 있어.', kind: 'balanced' },
      { text: '모두가 날 좋아하니까 그럴 리 없어.', kind: 'forced' },
      { text: '저 눈빛은 확실히 날 무시하는 거야.', kind: 'trapped' },
    ],
  },
  {
    thought: '100점 아니면 공부한 게 다 의미 없어.',
    answer: '전부 아니면 전무',
    lenses: [
      { text: '한 문제라도 틀리면 실패한 거야.', kind: 'trapped' },
      { text: '시험 따위 의미 없으니까 공부 안 해도 돼.', kind: 'forced' },
      { text: '100점이 아니어도 지난번보다 더 많이 알게 됐어. 그만큼 의미가 있어.', kind: 'balanced' },
    ],
  },
  {
    thought: '한 문제 틀렸어. 나는 원래 멍청한 애야.',
    answer: '꼬리표 붙이기',
    lenses: [
      { text: '한 문제 틀린 거지, 내가 멍청한 사람인 건 아니야. 틀린 건 다시 보면 돼.', kind: 'balanced' },
      { text: '역시 난 뭘 해도 안 되는 애야.', kind: 'trapped' },
      { text: '그 문제가 이상했던 거지, 난 하나도 안 틀렸어.', kind: 'forced' },
    ],
  },
];

const LENS_FEEDBACK: Record<LensKind, string> = {
  balanced: '거울이 맑아졌어! 사실에 가깝고, 마음도 조금 편해지는 생각이야.',
  trapped: '음… 아직 몬스터 목소리가 들려. 함정에 그대로 빠진 생각이야. 다른 렌즈로 봐 볼까?',
  forced: '너무 억지로 밝게 바꾸면 오래 못 가. 무조건 괜찮다는 것보다, 사실에 가까운 생각을 골라 봐.',
};

type Stage = 'find' | 'caught' | 'lens' | 'clear';

/** 소개 1장: 같은 상황이라도 생각에 따라 감정이 달라진다 */
const SAME_SITUATION = {
  situation: '복도에서 친구한테 인사했는데, 친구가 그냥 지나갔어.',
  thoughts: [
    { text: '나를 일부러 무시했어.', feeling: '서운하고 화가 나', face: '😠', color: '#FF8E72' },
    { text: '이어폰 끼고 있어서 못 봤나 봐.', feeling: '그냥 괜찮아', face: '🙂', color: '#7FD6C2' },
  ],
};

const INTRO_STEPS = ['생각이 감정을 바꿔', '생각 함정 = 몬스터', '렌즈로 다시 보는 법'];

/** 사냥 전에 기법을 알려주는 소개 (3장) */
function TrapIntro({ onStart }: { onStart: () => void }) {
  const [step, setStep] = useState(0);
  const [seen, setSeen] = useState<number[]>([]);
  const last = step === INTRO_STEPS.length - 1;

  return (
    <section aria-labelledby="intro-title" className="space-y-5">
      {/* 진행 점 */}
      <ol className="flex items-center gap-2" aria-label="소개 진행">
        {INTRO_STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span
              aria-current={i === step ? 'step' : undefined}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                i === step ? 'bg-night-star text-night-bg' : i < step ? 'bg-night-star/30 text-night-text' : 'bg-night-line text-night-sub'
              }`}
            >
              {i + 1}
            </span>
            <span className={`hidden text-sm sm:inline ${i === step ? 'text-night-text' : 'text-night-sub'}`}>{s}</span>
            {i < INTRO_STEPS.length - 1 && <span aria-hidden="true" className="h-px w-6 bg-night-line" />}
          </li>
        ))}
      </ol>

      <div key={step} className="rounded-3xl border border-night-line bg-night-card p-6 motion-safe:animate-[fadein_0.4s_ease-out]">
        {step === 0 && (
          <>
            <h2 id="intro-title" className="text-2xl text-night-text">
              생각이 감정을 바꿔
            </h2>
            <p className="mt-2 leading-relaxed text-night-sub">
              어떤 일이 생기면 머릿속에 생각이 <strong className="font-medium text-night-text">자동으로</strong> 휙 떠올라. 그리고 감정은 일 자체보다 그
              생각을 따라가. 아래 두 생각을 하나씩 눌러 봐.
            </p>
            <div className="mt-5 rounded-2xl bg-night-bg/60 p-4">
              <p className="text-xs text-night-sub">상황</p>
              <p className="mt-0.5 text-lg text-night-text">{SAME_SITUATION.situation}</p>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {SAME_SITUATION.thoughts.map((t, i) => {
                const open = seen.includes(i);
                return (
                  <button
                    key={t.text}
                    type="button"
                    aria-expanded={open}
                    onClick={() => setSeen((s) => (s.includes(i) ? s : [...s, i]))}
                    className="rounded-2xl border-2 p-4 text-left transition motion-safe:hover:-translate-y-0.5"
                    style={{ borderColor: open ? t.color : '#222A55', backgroundColor: open ? `${t.color}14` : 'transparent', ['--focus-color' as string]: t.color }}
                  >
                    <p className="text-xs text-night-sub">이렇게 생각하면</p>
                    <p className="mt-0.5 text-night-text">"{t.text}"</p>
                    <p className="mt-3 flex items-center gap-2 text-night-text" aria-live="polite">
                      {open ? (
                        <>
                          <span aria-hidden="true" className="text-3xl motion-safe:animate-[pop-in_0.4s_ease-out]">
                            {t.face}
                          </span>
                          기분: {t.feeling}
                        </>
                      ) : (
                        <span className="text-sm text-night-sub">눌러서 기분 보기</span>
                      )}
                    </p>
                  </button>
                );
              })}
            </div>
            {seen.length === 2 && (
              <p className="mt-4 rounded-2xl bg-night-star/10 px-4 py-3 leading-relaxed text-night-text motion-safe:animate-[fadein_0.4s_ease-out]">
                똑같은 일인데 생각에 따라 기분이 완전히 달라지지? 그런데 처음 떠오르는 생각은 빠른 대신, 자주 한쪽으로 치우쳐.
              </p>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <h2 id="intro-title" className="text-2xl text-night-text">
              생각 함정 = 몬스터
            </h2>
            <p className="mt-2 leading-relaxed text-night-sub">
              우리가 자주 빠지는 치우친 생각 패턴을 <strong className="font-medium text-night-text">생각 함정</strong>이라고 해. 함정에 빠지면 감정이 실제보다 훨씬
              커져. 누구 머릿속에나 사는 다섯 몬스터를 소개할게.
            </p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TRAP_INFO.map((t) => (
                <li key={t.name} className="flex gap-3 rounded-2xl border p-3" style={{ borderColor: `${t.color}66`, backgroundColor: `${t.color}0F` }}>
                  <span className="h-14 w-14 shrink-0">
                    <TrapMonster name={t.name} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium text-night-text">
                      {t.monster} <span className="text-sm font-normal text-night-sub">· {t.name}</span>
                    </span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-night-sub">{t.desc}</span>
                    <span className="mt-1 block text-sm italic text-night-text">"{t.example}"</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {step === 2 && (
          <>
            <h2 id="intro-title" className="text-2xl text-night-text">
              렌즈로 다시 보는 법
            </h2>
            <p className="mt-2 leading-relaxed text-night-sub">몬스터를 없앨 수는 없지만, 들키면 힘이 쭉 빠져. 세 단계만 기억해.</p>
            <ol className="mt-5 space-y-3">
              {[
                { t: '몬스터 이름 부르기', d: '"아, 지금 폴짝이가 나왔네." 이름만 붙여도 생각과 거리가 생겨.' },
                { t: '탐정 질문 던지기', d: '진짜 증거가 있어? 다른 설명은 없을까? 친구가 이런 생각을 하면 뭐라고 말해 줄까?' },
                { t: '사실에 가까운 생각 고르기', d: '함정에 빠진 생각 대신, 증거에 맞는 생각을 찾아.' },
              ].map((s, i) => (
                <li key={s.t} className="flex gap-3">
                  <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#B9C2FF] text-sm font-semibold text-night-bg">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block font-medium text-night-text">{s.t}</span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-night-sub">{s.d}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-5 rounded-2xl border border-[#FF8E72]/50 bg-[#FF8E72]/10 p-4">
              <p className="font-medium text-night-text">주의! 무조건 긍정은 정답이 아니야</p>
              <p className="mt-1 text-sm leading-relaxed text-night-sub">
                "난 신경 하나도 안 써", "다 잘될 거야"처럼 억지로 밝게 바꾼 생각은 오래 못 가. 목표는 좋은 생각이 아니라 <strong className="font-medium text-night-text">사실에 가까운 생각</strong>이야.
              </p>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {step > 0 && (
          <button type="button" onClick={() => setStep(step - 1)} className="rounded-xl px-4 py-2.5 text-night-sub hover:text-night-text">
            이전
          </button>
        )}
        {last ? (
          <button
            type="button"
            onClick={onStart}
            className="inline-flex items-center gap-2 rounded-xl bg-night-star px-6 py-3 font-medium text-night-bg hover:brightness-105"
          >
            <Telescope aria-hidden="true" className="h-4 w-4" />
            몬스터 사냥 시작!
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={step === 0 && seen.length < 2}
            className="inline-flex items-center gap-2 rounded-xl bg-night-star px-6 py-3 font-medium text-night-bg hover:brightness-105 disabled:cursor-not-allowed disabled:bg-night-line disabled:text-night-sub"
          >
            다음
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
        {step === 0 && seen.length < 2 && <span className="text-sm text-night-sub">두 생각을 모두 눌러 보면 다음으로 갈 수 있어.</span>}
      </div>
    </section>
  );
}

export default function ThinkingTrapsPage() {
  const { db } = useApp();
  const student = useCurrentStudent()!;
  const { complete, alreadyDone } = usePracticeComplete(MISSION);
  const recent = checkInsOf(db, student.id)
    .reverse()
    .filter((c) => c.situation.trim())
    .slice(0, 5);

  const [round, setRound] = useState(0);
  const [stage, setStage] = useState<Stage>('find');
  const [guess, setGuess] = useState<TrapName | null>(null);
  const [firstGuesses, setFirstGuesses] = useState<(TrapName | null)[]>(ROUNDS.map(() => null));
  const [lensPick, setLensPick] = useState<number | null>(null);
  const [caught, setCaught] = useState<TrapName[]>([]);
  const [huntDone, setHuntDone] = useState(false);
  const [ownId, setOwnId] = useState<string | null>(null);
  const [ownTrap, setOwnTrap] = useState<TrapName | null>(null);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);

  const r = ROUNDS[round];
  const own = recent.find((c) => c.id === ownId);
  const answerInfo = trapInfo(r.answer);
  const lensKind = lensPick !== null ? r.lenses[lensPick].kind : null;

  const pickMonster = (name: TrapName) => {
    if (stage !== 'find') return;
    setGuess(name);
    setFirstGuesses((g) => g.map((v, i) => (i === round ? name : v)));
    setCaught((c) => (c.includes(r.answer) ? c : [...c, r.answer]));
    setStage('caught');
  };

  const pickLens = (i: number) => {
    if (stage === 'clear') return;
    setLensPick(i);
    if (r.lenses[i].kind === 'balanced') setStage('clear');
  };

  const nextRound = () => {
    if (round + 1 >= ROUNDS.length) {
      setHuntDone(true);
      return;
    }
    setRound(round + 1);
    setStage('find');
    setGuess(null);
    setLensPick(null);
  };

  const finish = () => {
    const matched = ROUNDS.filter((q, i) => firstGuesses[i] === q.answer).length;
    const lines = [`함정 몬스터 ${caught.length}마리 잡음 (처음에 바로 찾은 것 ${matched}개)`];
    if (own && ownTrap) lines.push(`내 생각에서: "${own.situation}" → ${ownTrap} (${trapInfo(ownTrap).monster})`);
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

  if (!started) {
    return (
      <PracticeShell missionId={MISSION}>
        <TrapIntro
          onStart={() => {
            setStarted(true);
            window.scrollTo({ top: 0 });
          }}
        />
      </PracticeShell>
    );
  }

  return (
    <PracticeShell missionId={MISSION}>
      {/* 몬스터 도감 */}
      <section aria-labelledby="shelf-title" className="rounded-3xl border border-night-line bg-night-card p-4">
        <div className="flex items-baseline justify-between">
          <h2 id="shelf-title" className="font-sans text-base font-medium text-night-text">
            함정 몬스터 도감
          </h2>
          <p className="text-sm tabular-nums text-night-sub">
            <button type="button" onClick={() => setStarted(false)} className="mr-3 text-night-star underline-offset-4 hover:underline">
              설명 다시 보기
            </button>
            {caught.length} / {TRAP_INFO.length} 잡음
          </p>
        </div>
        <ul className="mt-3 grid grid-cols-5 gap-[2%]">
          {TRAP_INFO.map((t) => {
            const got = caught.includes(t.name);
            return (
              <li
                key={t.name}
                className="flex flex-col items-center rounded-2xl border px-1 py-2 text-center transition"
                style={{ borderColor: got ? `${t.color}99` : '#222A55', backgroundColor: got ? `${t.color}14` : 'transparent' }}
              >
                <div className={`h-12 w-12 sm:h-14 sm:w-14 ${got ? 'motion-safe:animate-[pop-in_0.5s_ease-out]' : ''}`}>
                  <TrapMonster name={t.name} silhouette={!got} happy />
                </div>
                <p className="mt-1 text-xs font-medium text-night-text">{got ? t.monster : '???'}</p>
                <p className="text-[11px] leading-tight text-night-sub">{got ? t.name : '아직 못 찾음'}</p>
              </li>
            );
          })}
        </ul>
      </section>

      {!huntDone ? (
        <section aria-labelledby="hunt-title" className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 id="hunt-title" className="font-sans text-lg font-medium text-night-text">
              {stage === 'find' ? '거울 속 생각에 숨은 몬스터를 찾아 봐' : stage === 'clear' ? '거울이 맑아졌어' : '렌즈로 다시 보기'}
            </h2>
            <p className="text-sm tabular-nums text-night-sub">
              거울 {round + 1} / {ROUNDS.length}
            </p>
          </div>

          {/* 거울 */}
          <div
            className="relative overflow-hidden rounded-[2rem] border-2 p-6 sm:p-8"
            style={{
              borderColor: stage === 'clear' ? '#B9C2FF' : '#3A4378',
              background:
                stage === 'clear'
                  ? 'linear-gradient(160deg, #1E2A5C 0%, #151B3A 60%)'
                  : 'radial-gradient(circle at 50% 40%, #2A2350 0%, #151B3A 75%)',
            }}
          >
            {/* 안개 (거울이 맑아지면 걷힌다) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 motion-safe:transition-opacity motion-safe:duration-1000"
              style={{
                opacity: stage === 'clear' ? 0 : 1,
                background: 'radial-gradient(ellipse at 20% 20%, #6B5BA855 0%, transparent 45%), radial-gradient(ellipse at 85% 80%, #6B5BA855 0%, transparent 45%)',
              }}
            />
            {stage === 'clear' && <div aria-hidden="true" className="mirror-sweep pointer-events-none absolute inset-0" />}

            <div className="relative flex items-center gap-5">
              <div className="h-24 w-24 shrink-0 sm:h-28 sm:w-28">
                {stage === 'find' ? (
                  // 정답 모양이 드러나지 않게, 누구인지 모르는 그림자만
                  <svg viewBox="0 0 100 100" className="h-full w-full motion-safe:animate-pulse" aria-hidden="true">
                    <path d="M50 14 C72 14 86 30 86 52 C86 74 72 88 50 88 C28 88 14 74 14 52 C14 30 28 14 50 14 Z" fill="#2A3366" />
                    <ellipse cx="40" cy="48" rx="4" ry="5" fill="#FFE27A" />
                    <ellipse cx="60" cy="48" rx="4" ry="5" fill="#FFE27A" />
                  </svg>
                ) : (
                  <div className="h-full w-full motion-safe:animate-[pop-in_0.5s_ease-out]">
                    <TrapMonster name={r.answer} happy={stage === 'clear'} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-night-sub">{stage === 'clear' ? '렌즈로 다시 본 생각' : '거울에 비친 생각'}</p>
                <p className="mt-1 font-display text-xl leading-relaxed text-night-text sm:text-2xl">
                  "{stage === 'clear' && lensPick !== null ? r.lenses[lensPick].text : r.thought}"
                </p>
                {stage === 'clear' && <p className="mt-2 text-sm text-night-sub line-through decoration-night-sub/60">"{r.thought}"</p>}
              </div>
            </div>

            {stage !== 'find' && (
              <div
                className="relative mt-4 rounded-2xl px-4 py-2.5 text-sm text-[#2A1B3D] motion-safe:animate-[fadein_0.4s_ease-out]"
                style={{ backgroundColor: '#FFF6E8' }}
              >
                <span className="font-semibold">{answerInfo.monster}:</span>{' '}
                {stage === 'clear' ? '으앗, 렌즈에 들켜서 힘이 쭉 빠졌어…' : answerInfo.caught}
              </div>
            )}
          </div>

          <div aria-live="polite" className="min-h-[1.5rem] text-night-text">
            {stage === 'caught' && guess && (
              <p>
                {guess === r.answer ? (
                  <>
                    <span className="font-medium text-emo-calm">잡았다!</span> {answerInfo.monster}({answerInfo.name})가 숨어 있었어.
                  </>
                ) : (
                  <>
                    {trapInfo(guess).monster}도 조금 있을 수 있어. 그런데 진짜 범인은 <span className="font-medium">{answerInfo.monster}({answerInfo.name})</span>였어. 같이 잡았다!
                  </>
                )}
              </p>
            )}
            {(stage === 'lens' || stage === 'clear') && lensKind && <p>{LENS_FEEDBACK[lensKind]}</p>}
          </div>

          {/* 단계별 조작 */}
          {stage === 'find' && (
            <div role="group" aria-label="숨은 몬스터 고르기" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {TRAP_INFO.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => pickMonster(t.name)}
                  className="flex flex-col items-center rounded-2xl border border-night-line bg-night-card px-2 py-3 text-center transition hover:border-night-sub motion-safe:hover:-translate-y-0.5"
                  style={{ ['--focus-color' as string]: t.color }}
                >
                  <span className="h-12 w-12">
                    <TrapMonster name={t.name} />
                  </span>
                  <span className="mt-1 text-sm font-medium text-night-text">{t.monster}</span>
                  <span className="text-xs text-night-sub">{t.name}</span>
                </button>
              ))}
            </div>
          )}

          {stage === 'caught' && (
            <button
              type="button"
              onClick={() => setStage('lens')}
              className="inline-flex items-center gap-2 rounded-xl bg-night-star px-6 py-3 font-medium text-night-bg hover:brightness-105"
            >
              <Telescope aria-hidden="true" className="h-4 w-4" />
              렌즈로 다시 보기
            </button>
          )}

          {(stage === 'lens' || stage === 'clear') && (
            <div className="space-y-2">
              <p className="text-sm text-night-sub">탐정 질문: 진짜 증거가 있어? 다른 설명은 없을까? 이 생각 중 어느 렌즈가 제일 맑게 보여?</p>
              <div role="group" aria-label="다시 본 생각 고르기" className="space-y-2">
                {r.lenses.map((l, i) => {
                  const picked = lensPick === i;
                  const tone =
                    picked && l.kind === 'balanced'
                      ? 'border-emo-calm bg-emo-calm/10'
                      : picked
                        ? 'border-night-sub bg-night-line/40'
                        : 'border-night-line bg-night-card hover:border-night-sub';
                  return (
                    <button
                      key={l.text}
                      type="button"
                      aria-pressed={picked}
                      disabled={stage === 'clear' && !picked}
                      onClick={() => pickLens(i)}
                      className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left text-night-text transition disabled:opacity-40 ${tone}`}
                    >
                      <span aria-hidden="true" className="mt-0.5 text-night-sub">
                        🔍
                      </span>
                      {l.text}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {stage === 'clear' && (
            <button
              type="button"
              onClick={nextRound}
              className="inline-flex items-center gap-2 rounded-xl bg-night-star px-6 py-3 font-medium text-night-bg hover:brightness-105"
            >
              {round + 1 >= ROUNDS.length ? '사냥 끝내기' : '다음 거울로'}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </section>
      ) : (
        <>
          <section className="rounded-3xl border border-night-star/40 bg-night-card p-5 motion-safe:animate-[fadein_0.6s_ease-out]">
            <p className="flex items-center gap-2 font-display text-xl text-night-text">
              <Sparkles aria-hidden="true" className="h-5 w-5 text-night-star" />
              함정 몬스터 다섯 마리를 모두 잡았어!
            </p>
            <p className="mt-2 leading-relaxed text-night-sub">
              몬스터는 누구 머릿속에나 살아. 없앨 수는 없지만, 이름을 불러 주면 힘이 빠져. 마음이 확 상할 때 "지금 어떤 몬스터가 나왔지?" 하고 찾아봐.
            </p>
          </section>

          {recent.length > 0 && (
            <section aria-labelledby="own-title" className="space-y-3">
              <h2 id="own-title" className="font-sans text-lg font-medium text-night-text">
                보너스: 내 생각에도 몬스터가 숨어 있을까? <span className="text-sm font-normal text-night-sub">(선택)</span>
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
                <div className="flex flex-wrap gap-2" role="group" aria-label="내 생각에 숨은 몬스터 고르기">
                  {TRAP_INFO.map((t) => (
                    <Chip key={t.name} selected={ownTrap === t.name} onClick={() => setOwnTrap(ownTrap === t.name ? null : t.name)}>
                      {t.monster} · {t.name}
                    </Chip>
                  ))}
                </div>
              )}
            </section>
          )}

          <button
            type="button"
            onClick={finish}
            className="inline-flex items-center gap-2 rounded-xl bg-night-star px-6 py-3 font-medium text-night-bg hover:brightness-105"
          >
            {alreadyDone ? '다시 기록하기' : '연습 마치기'}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </>
      )}
    </PracticeShell>
  );
}
