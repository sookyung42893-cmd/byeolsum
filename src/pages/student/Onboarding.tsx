import { useState } from 'react';
import { Eye, LifeBuoy, NotebookPen, ShieldCheck } from 'lucide-react';
import { useApp, useCurrentStudent } from '../../context/AppContext';
import { ASSESSMENT_CONFIG } from '../../data/assessment';
import { newId } from '../../lib/auth';
import StarField from '../../components/StarField';
import Logo from '../../components/Logo';
import type { Assessment, AssessmentTiming } from '../../types';

/** 첫 실행 동의 화면: 무엇을 기록하는지, 선생님이 무엇을 보는지, 위험 신호 알림, 보호자 동의. 동의해야 시작 */
export function ConsentPage() {
  const { updateDb } = useApp();
  const student = useCurrentStudent()!;
  const [agree, setAgree] = useState(false);
  const [guardian, setGuardian] = useState(false);

  const start = () => {
    if (!agree) return;
    updateDb((d) => ({
      ...d,
      consents: [...d.consents.filter((c) => c.studentId !== student.id), { studentId: student.id, agreedAt: new Date().toISOString(), guardianConsent: guardian }],
    }));
  };

  const blocks = [
    {
      icon: NotebookPen,
      title: '별숨에 기록되는 것',
      body: '감정 좌표와 강도, 몸 위치, 상황 메모, 망원경 관측 메모, 별똥별 기록, 행성 미션과 도전 미션의 소감, 연락할 사람, 별빛편지, 시작과 끝에 하는 정서조절 설문이야.',
    },
    {
      icon: Eye,
      title: '상담 선생님이 볼 수 있는 기록',
      body: '위에 적은 기록은 모두 담당 상담 선생님이 볼 수 있어. 회기에서 너를 더 잘 돕기 위해서야. 다른 친구나 다른 선생님에게는 보이지 않아. 기록하는 곳마다 "선생님이 볼 수 있는 기록이야"라고 작게 적어 둘게.',
    },
    {
      icon: ShieldCheck,
      title: '위험 신호가 보이면 선생님에게 알림이 가',
      body: '강도 10이 두 번 이어지거나, 기록에 많이 위험해 보이는 말이 있으면 선생님에게 알림이 가. 선생님이 근무 시간(평일 9~18시)이 아니면 다음 근무일 아침에 확인하게 돼. 그리고 이런 알림이 모든 위험을 알아채지는 못해.',
    },
    {
      icon: LifeBuoy,
      title: '지금 당장 위험하다고 느껴지면',
      body: '앱을 기다리지 말고 바로 청소년상담 1388(24시간) 또는 자살예방상담 109(24시간)에 연락해 줘. 사이드 메뉴의 "도움 받기"에서 언제든 다시 볼 수 있어.',
    },
  ];

  return (
    <div className="theme-night relative min-h-screen overflow-hidden bg-night-bg text-night-text">
      <StarField meteors={false} />
      <main className="relative mx-auto max-w-3xl px-[5%] py-14">
        <p className="flex items-center gap-2 font-display text-2xl text-night-star">
          <Logo className="h-[1.3em] w-auto" />
          별숨
        </p>
        <h1 className="mt-6 text-3xl text-night-text">항해를 시작하기 전에</h1>
        <p className="mt-2 text-night-sub">{student.name}, 반가워. 별숨이 무엇을 기록하고 누가 보는지 먼저 알려줄게.</p>

        <ul className="mt-8 space-y-3">
          {blocks.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4 rounded-2xl border border-night-line bg-night-card p-5">
              <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-night-star" />
              <div>
                <h2 className="font-sans text-base font-medium text-night-text">{title}</h2>
                <p className="mt-1 leading-relaxed text-night-sub">{body}</p>
              </div>
            </li>
          ))}
        </ul>

        <form
          className="mt-8 space-y-3 rounded-2xl border border-night-star/50 bg-night-card p-5"
          onSubmit={(e) => {
            e.preventDefault();
            start();
          }}
        >
          <label className="flex items-start gap-3 text-night-text">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-4 w-4 accent-[#F4C979]" />
            <span>
              위 내용을 읽고 이해했어. 별숨을 사용하는 데 동의해. <span className="text-sm text-night-sub">(필수)</span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-night-text">
            <input type="checkbox" checked={guardian} onChange={(e) => setGuardian(e.target.checked)} className="mt-1 h-4 w-4 accent-[#F4C979]" />
            <span>
              보호자(부모님 등)에게 별숨을 쓴다고 알리고 동의를 받았어. <span className="text-sm text-night-sub">(아직이면 비워 둬도 돼. 상담 선생님이 확인해 줄 거야)</span>
            </span>
          </label>
          <button
            type="submit"
            disabled={!agree}
            className="mt-2 rounded-xl bg-night-star px-6 py-3 font-medium text-night-bg hover:brightness-105 disabled:cursor-not-allowed disabled:bg-night-line disabled:text-night-sub"
          >
            동의하고 시작하기
          </button>
          {!agree && <p className="text-xs text-night-sub">첫 번째 칸에 동의해야 시작할 수 있어.</p>}
        </form>
      </main>
    </div>
  );
}

/**
 * 정서조절 척도 (사전: 시작할 때 / 사후: 별빛 행성에서).
 * 문항 수와 응답 범위는 data/assessment.ts 설정을 따른다.
 */
export function AssessmentForm({ timing, onDone }: { timing: AssessmentTiming; onDone?: () => void }) {
  const { updateDb } = useApp();
  const student = useCurrentStudent()!;
  const { items, scaleMin, scaleMax, scaleLabels, name } = ASSESSMENT_CONFIG;
  const [answers, setAnswers] = useState<(number | null)[]>(() => items.map(() => null));
  const answered = answers.filter((a) => a !== null).length;
  const values = Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i);

  const submit = () => {
    if (answered < items.length) return;
    const a: Assessment = { id: newId('as'), studentId: student.id, timing, scores: answers as number[], takenAt: new Date().toISOString() };
    updateDb((d) => ({ ...d, assessments: [...d.assessments, a] }));
    onDone?.();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-4"
    >
      <p className="text-sm text-night-sub">
        {name} · {items.length}문항 · 정답은 없어. 요즘의 나와 가까운 곳을 골라 줘. 상담 선생님이 볼 수 있는 기록이야.
      </p>
      <ol className="space-y-3">
        {items.map((item, i) => (
          <li key={i}>
            <fieldset className="rounded-2xl border border-night-line bg-night-card p-4">
              <legend className="sr-only">
                {i + 1}번. {item}
              </legend>
              <p aria-hidden="true" className="text-night-text">
                <span className="mr-2 text-night-star">{i + 1}</span>
                {item}
              </p>
              <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>
                {values.map((v, j) => (
                  <label
                    key={v}
                    className={`cursor-pointer rounded-xl border px-2 py-2 text-center text-sm transition has-[:focus-visible]:shadow-[0_0_0_2px_#F4C979,0_0_14px_3px_rgba(244,201,121,0.45)] ${
                      answers[i] === v ? 'border-night-star bg-night-star/15 text-night-text' : 'border-night-line text-night-sub hover:bg-night-line/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q${i}`}
                      value={v}
                      checked={answers[i] === v}
                      onChange={() => setAnswers((a) => a.map((x, k) => (k === i ? v : x)))}
                      className="sr-only"
                    />
                    <span className="block font-display text-lg text-night-text">{v}</span>
                    <span className="block text-xs">{scaleLabels[j] ?? ''}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={answered < items.length}
          className="rounded-xl bg-night-star px-6 py-3 font-medium text-night-bg hover:brightness-105 disabled:cursor-not-allowed disabled:bg-night-line disabled:text-night-sub"
        >
          제출하기
        </button>
        <span className="text-sm text-night-sub" aria-live="polite">
          {answered} / {items.length} 답함
        </span>
      </div>
    </form>
  );
}

/** 동의 다음: 시작할 때(사전) 척도 */
export function PreAssessmentPage() {
  return (
    <div className="theme-night relative min-h-screen bg-night-bg text-night-text">
      <main className="relative mx-auto max-w-3xl px-[5%] py-14">
        <h1 className="text-3xl text-night-text">출발 전 마음 점검</h1>
        <p className="mt-2 text-night-sub">항해를 시작하기 전에, 지금의 나를 한 번 살펴보자. 별빛 행성에 도착하면 한 번 더 해서 비교해 볼 거야.</p>
        <div className="mt-8">
          <AssessmentForm timing="사전" />
        </div>
      </main>
    </div>
  );
}
