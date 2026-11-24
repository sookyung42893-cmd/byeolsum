import { useEffect, useRef, useState } from 'react';
import { Footprints, RotateCcw, Undo2 } from 'lucide-react';

/**
 * 감정 키우기 실험 (회피 순환을 직접 겪어 보는 미니게임).
 * - 피하기: 감정이 휙 작아져 잠깐 편해지지만, 곧 더 크게 돌아온다
 * - 다가가기: 처음엔 떨리고 살짝 커 보이지만, 버티면 조금씩 작아진다
 * 피하기·다가가기를 각각 두 번 이상 해 보면 onReady가 불린다.
 */

const MIN = 0.4;
const MAX = 2.3;
const NEED = 2;

type Mood = 'calm' | 'relief' | 'worried' | 'nervous' | 'proud';
type Move = { kind: 'avoid' | 'approach'; size: number };

const AVOID_RELIEF = ['휴… 안 보이니까 편하다.', '또 숨겼다. 일단은 편해!', '안 보면 그만이지 뭐…'];
const AVOID_GROW = ['어? 아까보다 더 커져서 돌아왔어!', '또 커졌어. 피할수록 덩치가 불어나네.', '점점 감당하기 어려워지고 있어…'];
const APPROACH_NERVOUS = ['으… 가까이 가니까 좀 떨린다.', '그래도 한 걸음 더 가 보자.', '아직 불편하지만 버텨 보는 중.'];
const APPROACH_SHRINK = ['어라, 조금 작아졌네?', '견뎌 보니까 덜 무서워졌어.', '이 정도면 같이 있을 만해.'];

const pick = (list: string[], n: number) => list[Math.min(n, list.length - 1)];

/** 작을수록 부드러운 살구색, 클수록 진한 빨강 */
function blobColor(size: number) {
  const t = Math.max(0, Math.min(1, (size - MIN) / (MAX - MIN)));
  const a = [0xff, 0xc4, 0x9e];
  const b = [0xff, 0x5c, 0x6c];
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
}

/** 감정 캐릭터. 기분에 따라 표정이 바뀐다 */
function EmotionBlob({ mood, color }: { mood: Mood; color: string }) {
  const ink = '#2A1B3D';
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <radialGradient id="blob-shine" cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* 몸 (말랑한 별 모양) */}
      <path
        d="M100 18 C116 18 122 46 138 52 C154 58 182 50 186 68 C190 86 166 98 166 116 C166 134 186 152 174 168 C162 184 134 170 118 178 C104 186 96 188 82 178 C66 168 38 182 26 166 C14 150 34 134 34 116 C34 98 10 86 14 68 C18 50 46 58 62 52 C78 46 84 18 100 18 Z"
        fill={color}
        style={{ transition: 'fill 0.6s ease' }}
      />
      <path
        d="M100 18 C116 18 122 46 138 52 C154 58 182 50 186 68 C190 86 166 98 166 116 C166 134 186 152 174 168 C162 184 134 170 118 178 C104 186 96 188 82 178 C66 168 38 182 26 166 C14 150 34 134 34 116 C34 98 10 86 14 68 C18 50 46 58 62 52 C78 46 84 18 100 18 Z"
        fill="url(#blob-shine)"
      />
      {/* 볼 */}
      <ellipse cx="66" cy="122" rx="11" ry="7" fill="#FF7A9A" opacity="0.45" />
      <ellipse cx="134" cy="122" rx="11" ry="7" fill="#FF7A9A" opacity="0.45" />

      {/* 눈 */}
      {mood === 'relief' || mood === 'proud' ? (
        <g fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round">
          <path d="M70 102 Q78 94 86 102" />
          <path d="M114 102 Q122 94 130 102" />
        </g>
      ) : mood === 'nervous' ? (
        <g fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M70 94 L84 102 L70 110" />
          <path d="M130 94 L116 102 L130 110" />
        </g>
      ) : (
        <g fill={ink}>
          <ellipse cx="78" cy="102" rx="7" ry={mood === 'worried' ? 10 : 8} />
          <ellipse cx="122" cy="102" rx="7" ry={mood === 'worried' ? 10 : 8} />
          <circle cx="80" cy="98" r="2.4" fill="#fff" />
          <circle cx="124" cy="98" r="2.4" fill="#fff" />
        </g>
      )}
      {/* 걱정 눈썹 */}
      {mood === 'worried' && (
        <g fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round">
          <path d="M66 84 L86 78" />
          <path d="M134 84 L114 78" />
        </g>
      )}

      {/* 입 */}
      {mood === 'worried' ? (
        <path d="M84 138 Q92 130 100 136 Q108 142 116 134" fill="none" stroke={ink} strokeWidth="4.5" strokeLinecap="round" />
      ) : mood === 'nervous' ? (
        <path d="M86 136 L92 131 L98 136 L104 131 L110 136 L116 131" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      ) : mood === 'relief' ? (
        <ellipse cx="100" cy="134" rx="7" ry="5" fill={ink} />
      ) : (
        <path d="M86 128 Q100 144 114 128" fill="none" stroke={ink} strokeWidth="4.5" strokeLinecap="round" />
      )}

      {/* 땀방울 */}
      {(mood === 'nervous' || mood === 'worried') && (
        <path d="M160 70 Q168 82 160 88 Q152 82 160 70 Z" fill="#9FD8FF" stroke="#5FA8E0" strokeWidth="1.5" />
      )}
      {/* 반짝 */}
      {mood === 'proud' && (
        <g fill="#FFF3C4">
          <path d="M170 40 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 z" />
          <path d="M30 44 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 z" />
        </g>
      )}
    </svg>
  );
}

export default function AvoidanceGame({
  emotion,
  actionHint,
  onReady,
}: {
  emotion: string;
  /** 학생이 앞에서 적은 행동 (있으면 첫 피하기 뒤에 물어본다) */
  actionHint?: string;
  onReady: (ready: boolean) => void;
}) {
  const [size, setSize] = useState(1);
  const [mood, setMood] = useState<Mood>('calm');
  const [msg, setMsg] = useState(`이게 너의 "${emotion}"이야. 피해 볼래, 다가가 볼래?`);
  const [busy, setBusy] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [avoidN, setAvoidN] = useState(0);
  const [approachN, setApproachN] = useState(0);
  const [history, setHistory] = useState<Move[]>([]);
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);
  const ready = avoidN >= NEED && approachN >= NEED;
  useEffect(() => onReady(ready), [ready, onReady]);

  const avoid = () => {
    if (busy) return;
    setBusy(true);
    const n = avoidN;
    setAvoidN(n + 1);
    const prev = size;
    setSize(Math.max(0.25, prev * 0.4));
    setMood('relief');
    setMsg(pick(AVOID_RELIEF, n));
    timer.current = window.setTimeout(() => {
      const next = Math.min(MAX, prev * 1.3 + 0.08);
      setSize(next);
      setMood('worried');
      setMsg(next >= MAX ? '이제 너무 커져서 피하기도 버거워…' : pick(AVOID_GROW, n));
      setHistory((h) => [...h, { kind: 'avoid' as const, size: next }].slice(-10));
      setBusy(false);
    }, 1400);
  };

  const approach = () => {
    if (busy) return;
    setBusy(true);
    const n = approachN;
    setApproachN(n + 1);
    const prev = size;
    setShaking(true);
    setSize(Math.min(MAX + 0.1, prev * 1.08));
    setMood('nervous');
    setMsg(pick(APPROACH_NERVOUS, n));
    timer.current = window.setTimeout(() => {
      const next = Math.max(MIN, prev * 0.75);
      setShaking(false);
      setSize(next);
      setMood(next <= 0.7 ? 'proud' : 'calm');
      setMsg(next <= MIN ? '이제 손바닥만 해졌어. 감정은 그대로 있지만, 다룰 만해!' : pick(APPROACH_SHRINK, n));
      setHistory((h) => [...h, { kind: 'approach' as const, size: next }].slice(-10));
      setBusy(false);
    }, 1400);
  };

  const restart = () => {
    window.clearTimeout(timer.current);
    setSize(1);
    setMood('calm');
    setShaking(false);
    setBusy(false);
    setHistory([]);
    setMsg(`다시 처음부터! 이번엔 어떻게 해 볼래?`);
  };

  const pct = Math.round(size * 100);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-night-line bg-gradient-to-b from-night-card to-night-bg">
        {/* 크기 기록 */}
        <div className="absolute left-4 top-4 z-10">
          <p className="text-xs text-night-sub">크기 기록</p>
          <div className="mt-1 flex h-10 items-end gap-1" aria-hidden="true">
            {history.length === 0 && <span className="text-xs text-night-sub/80">아직 없음</span>}
            {history.map((h, i) => (
              <span
                key={i}
                className="w-2.5 rounded-sm"
                style={{ height: `${(h.size / MAX) * 100}%`, backgroundColor: h.kind === 'avoid' ? '#FF8E72' : '#7FD6C2' }}
              />
            ))}
          </div>
        </div>
        <p className="absolute right-4 top-4 z-10 rounded-full bg-night-bg/70 px-3 py-1 text-sm tabular-nums text-night-text">
          감정 크기 {pct}%
        </p>

        <div className="flex h-[340px] items-center justify-center pt-6" role="img" aria-label={`감정 "${emotion}" 크기 ${pct}%`}>
          <div
            className="flex flex-col items-center motion-safe:transition-transform motion-safe:duration-700"
            style={{ transform: `scale(${size})`, transitionTimingFunction: 'cubic-bezier(.34,1.56,.64,1)' }}
          >
            <div className={`h-28 w-28 ${shaking ? 'blob-wobble' : 'blob-idle'}`}>
              <EmotionBlob mood={mood} color={blobColor(size)} />
            </div>
          </div>
        </div>
        <p className="absolute inset-x-0 bottom-3 text-center font-display text-lg text-night-text">{emotion}</p>
      </div>

      <p aria-live="polite" className="min-h-[3.5rem] text-lg leading-relaxed text-night-text">
        {msg}
        {avoidN === 1 && !busy && actionHint && (
          <span className="mt-1 block text-sm text-night-sub">네가 적은 행동 "{actionHint}"도 혹시 피하는 행동이었을까?</span>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={avoid}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-2xl border-2 border-[#FF8E72] bg-[#FF8E72]/10 px-6 py-3 text-lg text-night-text transition hover:bg-[#FF8E72]/20 disabled:cursor-wait disabled:opacity-50"
          style={{ ['--focus-color' as string]: '#FF8E72' }}
        >
          <Undo2 aria-hidden="true" className="h-5 w-5 text-[#FF8E72]" />
          피하기
          <span className="text-sm tabular-nums text-night-sub">{avoidN}</span>
        </button>
        <button
          type="button"
          onClick={approach}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-2xl border-2 border-[#7FD6C2] bg-[#7FD6C2]/10 px-6 py-3 text-lg text-night-text transition hover:bg-[#7FD6C2]/20 disabled:cursor-wait disabled:opacity-50"
          style={{ ['--focus-color' as string]: '#7FD6C2' }}
        >
          <Footprints aria-hidden="true" className="h-5 w-5 text-[#7FD6C2]" />
          다가가기
          <span className="text-sm tabular-nums text-night-sub">{approachN}</span>
        </button>
        <button type="button" onClick={restart} className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-night-sub hover:text-night-text">
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          처음 크기로
        </button>
      </div>

      {!ready && (
        <p className="text-sm text-night-sub">
          피하기와 다가가기를 각각 {NEED}번 이상 해 봐. (피하기 {Math.min(avoidN, NEED)}/{NEED} · 다가가기 {Math.min(approachN, NEED)}/{NEED})
        </p>
      )}
    </div>
  );
}
