import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useApp, useCurrentStudent } from '../../../context/AppContext';
import { checkInsOf } from '../../../lib/selectors';
import Chip from '../../../components/Chip';
import PracticeShell, { PracticeDone, usePracticeComplete } from './PracticeShell';
import { VisibleToCounselor } from '../PlanetMissions';
import AvoidanceGame from '../../../components/student/AvoidanceGame';

const MISSION = 'p2-practice';

const PARTS = [
  { key: 'thought', label: '생각', q: '머릿속에 어떤 말이 떠올랐어?', ph: '예: 다들 나만 빼고 노는 것 같아' },
  { key: 'body', label: '몸', q: '몸은 어떻게 반응했어?', ph: '예: 가슴이 답답하고 손에 힘이 들어감' },
  { key: 'action', label: '행동', q: '그래서 무엇을 했어? (하고 싶었던 것도 괜찮아)', ph: '예: 폰을 엎어 두고 게임만 함' },
] as const;
type PartKey = (typeof PARTS)[number]['key'];

export default function EmotionPartsPage() {
  const { db } = useApp();
  const student = useCurrentStudent()!;
  const { complete, alreadyDone } = usePracticeComplete(MISSION);
  const recentWords = [...new Set(checkInsOf(db, student.id).reverse().map((c) => c.emotionWord))].slice(0, 6);

  const [emotion, setEmotion] = useState('');
  const [parts, setParts] = useState<Record<PartKey, string>>({ thought: '', body: '', action: '' });
  const [phase, setPhase] = useState<'split' | 'cycle' | 'done'>('split');
  const [ready, setReady] = useState(false);

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
          <div>
            <h2 className="font-sans text-lg font-medium text-night-text">3. 감정 키우기 실험</h2>
            <p className="mt-1 text-sm text-night-sub">감정을 피하면 어떻게 될까, 다가가면 어떻게 될까? 직접 눌러 보고 감정 크기가 어떻게 변하는지 지켜봐.</p>
          </div>
          <AvoidanceGame emotion={emotion.trim()} actionHint={parts.action.trim() || undefined} onReady={setReady} />

          {ready && (
            <div className="space-y-4 rounded-3xl border border-night-star/40 bg-night-card p-5 motion-safe:animate-[fadein_0.6s_ease-out]">
              <p className="font-display text-xl text-night-text">실험 결과: 피할수록 커지고, 다가갈수록 작아져</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#FF8E72]/50 bg-[#FF8E72]/10 p-4">
                  <p className="font-medium text-night-text">피했을 때</p>
                  <p className="mt-1 text-sm leading-relaxed text-night-sub">잠깐은 편해져. 그런데 감정은 사라지지 않고 더 크게 돌아와. 그래서 또 피하게 되고… 이렇게 빙글빙글 도는 걸 회피 순환이라고 해.</p>
                </div>
                <div className="rounded-2xl border border-[#7FD6C2]/50 bg-[#7FD6C2]/10 p-4">
                  <p className="font-medium text-night-text">다가갔을 때</p>
                  <p className="mt-1 text-sm leading-relaxed text-night-sub">처음엔 떨리고 불편해. 그래도 버텨 보면 감정이 조금씩 작아져. 앞으로의 행성들이 바로 이 다가가기 연습이야.</p>
                </div>
              </div>
              <button type="button" onClick={finish} className="rounded-xl bg-night-star px-6 py-3 font-medium text-night-bg hover:brightness-105">
                {alreadyDone ? '다시 기록하기' : '알겠어, 기록하기'}
              </button>
            </div>
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
