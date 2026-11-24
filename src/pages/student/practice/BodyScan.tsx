import { useEffect, useState } from 'react';
import { Pause, Play, SkipForward } from 'lucide-react';
import BodyMap from '../../../components/BodyMap';
import { BODY_PARTS, type BodyPart } from '../../../types';
import PracticeShell, { PracticeDone, usePracticeComplete } from './PracticeShell';
import { VisibleToCounselor } from '../PlanetMissions';

const MISSION = 'p3-practice';
const TOTAL_MS = 60_000;
const PER_PART = TOTAL_MS / BODY_PARTS.length;

const GUIDE: Record<BodyPart, string> = {
  머리: '머리 꼭대기로 주의를 옮겨 봐. 무겁거나 지끈한 느낌이 있는지 그냥 살펴봐.',
  얼굴: '이마, 눈가, 턱. 힘이 들어가 있다면 고치려 하지 말고 알아차리기만 해.',
  '목·어깨': '어깨가 귀 쪽으로 올라가 있지는 않은지 느껴 봐.',
  가슴: '숨이 드나드는 가슴. 답답하거나 두근거리는 느낌이 있는지.',
  배: '배 속은 어때? 꼬이거나 묵직한 느낌이 있는지 살펴봐.',
  '팔·손': '손에 힘이 들어가 있는지, 주먹을 쥐고 있지는 않은지.',
  다리: '다리와 발바닥이 바닥에 닿아 있는 느낌을 느껴 봐.',
};

export default function BodyScanPage() {
  const { complete, alreadyDone } = usePracticeComplete(MISSION);
  const [phase, setPhase] = useState<'ready' | 'scan' | 'pick' | 'done'>('ready');
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [part, setPart] = useState<BodyPart | null>(null);
  const [feeling, setFeeling] = useState('');

  useEffect(() => {
    if (phase !== 'scan' || paused) return;
    const started = Date.now() - elapsed;
    const t = window.setInterval(() => {
      const e = Date.now() - started;
      if (e >= TOTAL_MS) {
        setElapsed(TOTAL_MS);
        setPhase('pick');
      } else setElapsed(e);
    }, 200);
    return () => window.clearInterval(t);
    // elapsed는 다시 시작할 때 기준점으로만 쓴다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, paused]);

  const current = BODY_PARTS[Math.min(BODY_PARTS.length - 1, Math.floor(elapsed / PER_PART))];
  const left = Math.ceil((TOTAL_MS - elapsed) / 1000);

  const finish = () => {
    const where = part ? `감정이 가장 느껴진 곳: ${part}${feeling.trim() ? ` (${feeling.trim()})` : ''}` : '특별히 감정이 느껴지는 곳은 없었어';
    complete(where);
    setPhase('done');
  };

  return (
    <PracticeShell missionId={MISSION}>
      {phase === 'ready' && (
        <section className="space-y-5">
          <p className="max-w-2xl leading-relaxed text-night-text">
            편하게 앉아서, 1분 동안 머리부터 발끝까지 차례로 주의를 옮겨 볼 거야. 느낌을 바꾸려고 하지 않아도 돼. 그냥 "아, 여기가
            이렇구나" 하고 알아차리기만 하면 돼.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setElapsed(0);
                setPhase('scan');
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-night-star px-6 py-3 font-medium text-night-bg hover:brightness-105"
            >
              <Play aria-hidden="true" className="h-4 w-4" />
              1분 바디스캔 시작
            </button>
            <button type="button" onClick={() => setPhase('pick')} className="rounded-xl px-4 py-3 text-night-sub hover:text-night-text">
              안내 없이 바로 고르기
            </button>
          </div>
        </section>
      )}

      {phase === 'scan' && (
        <section className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-[5%]">
          <div className="w-[55%] max-w-[14rem] shrink-0 sm:w-[34%]">
            <BodyMap value={current} onChange={() => undefined} color="#FF9AAE" readOnly />
          </div>
          <div className="min-w-0 flex-1 space-y-5">
            <p className="text-sm text-night-sub">
              {BODY_PARTS.indexOf(current) + 1} / {BODY_PARTS.length} · 남은 시간 {left}초
            </p>
            <div aria-live="polite">
              <h2 className="font-display text-2xl text-night-star">{current}</h2>
              <p className="mt-2 text-lg leading-relaxed text-night-text">{GUIDE[current]}</p>
            </div>
            <div
              role="progressbar"
              aria-label="바디스캔 진행"
              aria-valuemin={0}
              aria-valuemax={60}
              aria-valuenow={Math.round(elapsed / 1000)}
              className="h-1.5 w-full overflow-hidden rounded-full bg-night-line"
            >
              <div className="h-full bg-[#FF9AAE]" style={{ width: `${(elapsed / TOTAL_MS) * 100}%` }} />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-night-line px-4 py-2 text-sm text-night-text hover:bg-night-line/50"
              >
                {paused ? <Play aria-hidden="true" className="h-4 w-4" /> : <Pause aria-hidden="true" className="h-4 w-4" />}
                {paused ? '이어서' : '잠깐 멈춤'}
              </button>
              <button
                type="button"
                onClick={() => setPhase('pick')}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm text-night-sub hover:text-night-text"
              >
                <SkipForward aria-hidden="true" className="h-4 w-4" />
                끝내고 고르기
              </button>
            </div>
          </div>
        </section>
      )}

      {phase === 'pick' && (
        <section className="space-y-5">
          <h2 className="font-sans text-lg font-medium text-night-text">지금 감정이 가장 느껴지는 곳은 어디야?</h2>
          <BodyMap value={part} onChange={setPart} color="#FF9AAE" />
          <div>
            <label htmlFor="feeling" className="block text-sm text-night-text">
              어떤 느낌이야? {part && <span className="text-night-sub">(골랐으면 꼭 적어 줘)</span>}
            </label>
            <input
              id="feeling"
              value={feeling}
              maxLength={20}
              placeholder="예: 답답함, 두근거림, 뻐근함"
              onChange={(e) => setFeeling(e.target.value)}
              className="mt-1 w-full max-w-xs rounded-xl border border-night-line bg-night-bg px-4 py-2.5 text-night-text outline-none placeholder:text-night-sub/80 focus:border-night-star"
            />
          </div>
          <VisibleToCounselor />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={finish}
              disabled={Boolean(part) && !feeling.trim()}
              className="rounded-xl bg-night-star px-6 py-3 font-medium text-night-bg hover:brightness-105 disabled:cursor-not-allowed disabled:bg-night-line disabled:text-night-sub"
            >
              {part ? (alreadyDone ? '다시 기록하기' : '기록하기') : '특별히 느껴지는 곳이 없어'}
            </button>
          </div>
        </section>
      )}

      {phase === 'done' && (
        <PracticeDone missionId={MISSION}>
          <p className="mt-2 text-sm text-night-sub">
            감정은 몸에서 먼저 신호를 보낼 때가 많아. 다음에 감정 좌표를 찍을 때 몸 지도에도 표시해 봐.
          </p>
        </PracticeDone>
      )}
    </PracticeShell>
  );
}
