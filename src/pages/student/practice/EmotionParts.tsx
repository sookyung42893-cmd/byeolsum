import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useApp, useCurrentStudent } from '../../../context/AppContext';
import { checkInsOf } from '../../../lib/selectors';
import Chip from '../../../components/Chip';
import PracticeShell, { PracticeDone, usePracticeComplete } from './PracticeShell';
import { VisibleToCounselor } from '../PlanetMissions';

const MISSION = 'p2-practice';

const PARTS = [
  { key: 'thought', label: '생각', q: '머릿속에 어떤 말이 떠올랐어?', ph: '예: 다들 나만 빼고 노는 것 같아' },
  { key: 'body', label: '몸', q: '몸은 어떻게 반응했어?', ph: '예: 가슴이 답답하고 손에 힘이 들어감' },
  { key: 'action', label: '행동', q: '그래서 무엇을 했어? (하고 싶었던 것도 괜찮아)', ph: '예: 폰을 엎어 두고 게임만 함' },
] as const;
type PartKey = (typeof PARTS)[number]['key'];

/**
 * 회피 순환 그림: 피함 → 잠깐 편함 → 더 커짐 → 다시 피함.
 * 바깥으로 빠져나가는 길(다가가기 → 조금씩 작아짐)도 함께 보여준다. step만큼 차례로 드러난다.
 */
function AvoidanceCycle({ emotion, step }: { emotion: string; step: number }) {
  const nodes = [
    { x: 210, y: 70, label: '감정을 피함', sub: '외면하기, 딴짓하기' },
    { x: 330, y: 250, label: '잠깐 편해짐', sub: '그 순간엔 괜찮은 듯' },
    { x: 90, y: 250, label: '다음엔 더 커짐', sub: '피한 감정이 다시 와' },
  ];
  const arrows = ['M 262 92 Q 330 140 336 205', 'M 280 278 Q 210 312 140 278', 'M 84 205 Q 92 130 158 92'];
  const show = (i: number) => step > i;
  return (
    <svg viewBox="0 0 560 340" className="block w-full" role="img" aria-label={`회피 순환: ${emotion}을 피하면 잠깐 편해지지만 다음엔 더 커져서 다시 피하게 돼. 다가가면 조금씩 작아져.`}>
      <defs>
        <marker id="cycle-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#FF8E72" />
        </marker>
        <marker id="exit-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#7FD6C2" />
        </marker>
      </defs>
      <circle cx={210} cy={190} r={46} fill="#151B3A" stroke="#222A55" />
      <text x={210} y={186} textAnchor="middle" fill="#A9B0D6" fontSize="11">
        나의 감정
      </text>
      <text x={210} y={204} textAnchor="middle" fill="#EEF0FF" fontSize="15">
        {emotion.length > 7 ? `${emotion.slice(0, 7)}…` : emotion}
      </text>

      {arrows.map((d, i) =>
        show(i + 1) ? (
          <path key={d} d={d} fill="none" stroke="#FF8E72" strokeWidth={2.5} markerEnd="url(#cycle-arrow)" className="motion-safe:animate-[fadein_0.6s_ease-out]" />
        ) : null,
      )}
      {nodes.map((n, i) =>
        show(i) ? (
          <g key={n.label} className="motion-safe:animate-[fadein_0.6s_ease-out]">
            <rect x={n.x - 68} y={n.y - 26} width={136} height={52} rx={14} fill="#151B3A" stroke="#FF8E72" strokeOpacity={0.6} />
            <text x={n.x} y={n.y - 3} textAnchor="middle" fill="#EEF0FF" fontSize="14">
              {n.label}
            </text>
            <text x={n.x} y={n.y + 15} textAnchor="middle" fill="#A9B0D6" fontSize="11">
              {n.sub}
            </text>
          </g>
        ) : null,
      )}

      {show(4) && (
        <g className="motion-safe:animate-[fadein_0.8s_ease-out]">
          <path d="M 278 70 Q 400 40 440 100" fill="none" stroke="#7FD6C2" strokeWidth={2.5} strokeDasharray="6 5" markerEnd="url(#exit-arrow)" />
          <text x={360} y={46} textAnchor="middle" fill="#7FD6C2" fontSize="12">
            다가가기
          </text>
          <rect x={410} y={104} width={130} height={52} rx={14} fill="#151B3A" stroke="#7FD6C2" strokeOpacity={0.7} />
          <text x={475} y={127} textAnchor="middle" fill="#EEF0FF" fontSize="14">
            조금씩 작아짐
          </text>
          <text x={475} y={145} textAnchor="middle" fill="#A9B0D6" fontSize="11">
            견뎌 볼수록 덜 무서워
          </text>
        </g>
      )}
    </svg>
  );
}

const CYCLE_TEXT = [
  '감정이 올라오면, 우리는 자주 그걸 피하려고 해.',
  '피하면 그 순간은 정말 편해져. 그래서 또 피하고 싶어지지.',
  '그런데 피한 감정은 사라지지 않고, 다음에 더 크게 돌아와.',
  '그러면 또 피하게 되고… 이렇게 빙글빙글 도는 게 회피 순환이야.',
  '빠져나가는 길은 감정에 조금씩 다가가 보는 거야. 견뎌 볼수록 감정은 조금씩 작아져. 앞으로의 행성들이 그 연습이야.',
];

export default function EmotionPartsPage() {
  const { db } = useApp();
  const student = useCurrentStudent()!;
  const { complete, alreadyDone } = usePracticeComplete(MISSION);
  const recentWords = [...new Set(checkInsOf(db, student.id).reverse().map((c) => c.emotionWord))].slice(0, 6);

  const [emotion, setEmotion] = useState('');
  const [parts, setParts] = useState<Record<PartKey, string>>({ thought: '', body: '', action: '' });
  const [phase, setPhase] = useState<'split' | 'cycle' | 'done'>('split');
  const [cycleStep, setCycleStep] = useState(1);

  const filled = PARTS.filter((p) => parts[p.key].trim()).length;
  const canNext = emotion.trim() && filled > 0;

  const finish = () => {
    const lines = [`감정: ${emotion.trim()}`, ...PARTS.filter((p) => parts[p.key].trim()).map((p) => `${p.label}: ${parts[p.key].trim()}`)];
    complete(lines.join('\n'));
    setPhase('done');
  };

  return (
    <PracticeShell missionId={MISSION}>
      {phase === 'split' && (
        <section className="space-y-6">
          <div>
            <h2 className="font-sans text-lg font-medium text-night-text">1. 어떤 감정을 분해해 볼까?</h2>
            {recentWords.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="최근에 띄운 감정">
                {recentWords.map((w) => (
                  <Chip key={w} selected={emotion === w} onClick={() => setEmotion(w)}>
                    {w}
                  </Chip>
                ))}
              </div>
            )}
            <label htmlFor="emotion" className="mt-3 block text-sm text-night-sub">
              또는 직접 적기
            </label>
            <input
              id="emotion"
              value={emotion}
              maxLength={15}
              onChange={(e) => setEmotion(e.target.value)}
              className="mt-1 w-full max-w-xs rounded-xl border border-night-line bg-night-bg px-4 py-2.5 text-night-text outline-none focus:border-night-star"
            />
          </div>

          <div>
            <h2 className="font-sans text-lg font-medium text-night-text">2. 생각 · 몸 · 행동으로 나눠 보자</h2>
            <p className="mt-1 text-sm text-night-sub">감정은 한 덩어리 같지만, 사실 세 조각으로 이루어져 있어. 떠오르는 것만 적어도 돼.</p>
            <div className="mt-4 grid grid-cols-3 gap-[3%]">
              {PARTS.map((p) => (
                <div key={p.key} className="rounded-2xl border border-night-line bg-night-card p-4">
                  <label htmlFor={`part-${p.key}`} className="block">
                    <span className="font-display text-lg text-night-star">{p.label}</span>
                    <span className="mt-1 block text-sm text-night-text">{p.q}</span>
                  </label>
                  <textarea
                    id={`part-${p.key}`}
                    rows={3}
                    maxLength={80}
                    placeholder={p.ph}
                    value={parts[p.key]}
                    onChange={(e) => setParts((s) => ({ ...s, [p.key]: e.target.value }))}
                    className="mt-2 w-full resize-none rounded-xl border border-night-line bg-night-bg px-3 py-2 text-sm text-night-text outline-none placeholder:text-night-sub/80 focus:border-night-star"
                  />
                </div>
              ))}
            </div>
            <div className="mt-2">
              <VisibleToCounselor />
            </div>
          </div>

          <button
            type="button"
            disabled={!canNext}
            onClick={() => setPhase('cycle')}
            className="inline-flex items-center gap-2 rounded-xl bg-night-star px-6 py-3 font-medium text-night-bg hover:brightness-105 disabled:cursor-not-allowed disabled:bg-night-line disabled:text-night-sub"
          >
            회피 순환 보러 가기
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
          {!canNext && <p className="text-xs text-night-sub">감정 하나와 조각 하나 이상을 적으면 다음으로 갈 수 있어.</p>}
        </section>
      )}

      {phase === 'cycle' && (
        <section className="space-y-5">
          <h2 className="font-sans text-lg font-medium text-night-text">3. 피할수록 커지는 회피 순환</h2>
          <div className="rounded-3xl border border-night-line bg-night-card p-4">
            <AvoidanceCycle emotion={emotion.trim()} step={cycleStep} />
          </div>
          <p aria-live="polite" className="min-h-[3rem] text-lg leading-relaxed text-night-text">
            {CYCLE_TEXT[cycleStep - 1]}
            {cycleStep === 2 && parts.action.trim() && (
              <span className="mt-1 block text-sm text-night-sub">네가 적은 행동 "{parts.action.trim()}"도 혹시 피하는 행동이었을까?</span>
            )}
          </p>
          {cycleStep < CYCLE_TEXT.length ? (
            <button
              type="button"
              onClick={() => setCycleStep((s) => s + 1)}
              className="inline-flex items-center gap-2 rounded-xl border border-night-line px-5 py-2.5 text-night-text hover:bg-night-line/50"
            >
              다음
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={finish} className="rounded-xl bg-night-star px-6 py-3 font-medium text-night-bg hover:brightness-105">
              {alreadyDone ? '다시 기록하기' : '알겠어, 기록하기'}
            </button>
          )}
        </section>
      )}

      {phase === 'done' && (
        <PracticeDone missionId={MISSION}>
          <p className="mt-2 text-sm text-night-sub">다음에 그 감정이 오면, 피하고 싶은 마음이 드는지 한번 알아차려 봐. 이름 행성의 현실 미션 "도망 포착"이 그 연습이야.</p>
        </PracticeDone>
      )}
    </PracticeShell>
  );
}
