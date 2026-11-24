import { useCallback, useEffect, useRef, useState } from 'react';
import { Footprints, RotateCcw } from 'lucide-react';

/**
 * 감정 키우기 실험 (회피 순환을 직접 겪어 보는 미니게임).
 * - 피하기: 피하는 방법 카드를 고르면 감정이 휙 작아져 잠깐 편해지지만, 곧 더 크게 돌아온다
 * - 다가가기: 버튼을 꾹 누르고 버티는 동안 떨리다가, 끝까지 버티면 조금씩 작아진다 (중간에 떼도 벌칙 없음)
 * - 감정 캐릭터가 말풍선으로 반응한다
 * 피하기·다가가기를 각각 두 번 이상 해 보면 onReady가 불린다.
 */

const MIN = 0.4;
const MAX = 2.3;
const NEED = 2;
/** 다가가기에서 버텨야 하는 시간 */
const HOLD_MS = 3000;

type Mood = 'calm' | 'relief' | 'worried' | 'nervous' | 'proud';
type Move = { kind: 'avoid' | 'approach'; size: number };

interface AvoidCard {
  id: string;
  icon: string;
  label: string;
  /** 피한 직후 (잠깐 편함) */
  relief: string;
  /** 다시 돌아왔을 때 (더 커짐) */
  grow: string;
}

const AVOID_CARDS: AvoidCard[] = [
  { id: 'phone', icon: '📱', label: '폰 보기', relief: '스크롤 하는 동안은 싹 잊었다!', grow: '폰을 내려놓으니까… 아까보다 더 커져 있네.' },
  { id: 'hide', icon: '🛏️', label: '방에 숨기', relief: '이불 속은 안전해. 아무도 못 찾아.', grow: '방에서 나오니까 더 크게 기다리고 있었어.' },
  { id: 'sleep', icon: '😴', label: '자 버리기', relief: '자면 아무 생각도 안 나지.', grow: '자고 일어나도 그대로야. 오히려 더 커졌어.' },
  { id: 'pretend', icon: '🙃', label: '괜찮은 척', relief: '아무렇지 않은 척 성공!', grow: '꾹 눌러 둔 만큼 더 부풀어 올랐어.' },
];

const BLOB_AVOIDED = ['어디 가? 나 아직 여기 있어!', '또 숨는 거야?', '안 보여도 나 안 없어져~'];
const BLOB_GROWN = ['무시하면 더 크게 말할 거야!!', '왜 자꾸 나를 피해?!', '나 점점 커지고 있다고!'];
const BLOB_HOLD = ['어… 나한테 오는 거야?', '가까이 오니까 나도 좀 긴장돼.', '도망 안 가네?'];
const BLOB_HEARD = ['…들어줘서 고마워.', '나 사실 그렇게 무서운 애 아니야.', '이제 좀 편해졌어.'];
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
  /** 학생이 앞에서 적은 행동 (있으면 피하기 카드로도 나온다) */
  actionHint?: string;
  onReady: (ready: boolean) => void;
}) {
  const [size, setSize] = useState(1);
  const [mood, setMood] = useState<Mood>('calm');
  const [msg, setMsg] = useState('피하는 방법을 하나 골라 보거나, 아래 버튼을 꾹 눌러서 다가가 봐.');
  const [speech, setSpeech] = useState(`안녕, 난 너의 "${emotion}"이야.`);
  const [busy, setBusy] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [holdP, setHoldP] = useState(0);
  const [avoidN, setAvoidN] = useState(0);
  const [approachN, setApproachN] = useState(0);
  const [history, setHistory] = useState<Move[]>([]);
  const [lastCard, setLastCard] = useState<string | null>(null);

  const timer = useRef<number>();
  const raf = useRef<number>();
  const holding = useRef(false);
  const holdStart = useRef(0);
  const holdBase = useRef(1);
  const approachRef = useRef(0);
  approachRef.current = approachN;

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      if (raf.current) cancelAnimationFrame(raf.current);
    },
    [],
  );
  const ready = avoidN >= NEED && approachN >= NEED;
  useEffect(() => onReady(ready), [ready, onReady]);

  const cards: AvoidCard[] = actionHint
    ? [
        ...AVOID_CARDS,
        {
          id: 'mine',
          icon: '✏️',
          label: actionHint.length > 10 ? `${actionHint.slice(0, 10)}…` : actionHint,
          relief: `"${actionHint}" 하는 동안은 괜찮았어.`,
          grow: '그런데 끝나고 나니까… 더 커져서 돌아왔어. 네가 적은 이 행동도 피하는 행동이었을지 몰라.',
        },
      ]
    : AVOID_CARDS;

  // ── 피하기 ──
  const avoid = (card: AvoidCard) => {
    if (busy || holding.current) return;
    setBusy(true);
    setLastCard(card.id);
    const n = avoidN;
    setAvoidN(n + 1);
    const prev = size;
    setSize(Math.max(0.25, prev * 0.4));
    setMood('relief');
    setMsg(`${card.icon} ${card.relief}`);
    setSpeech(pick(BLOB_AVOIDED, n));
    timer.current = window.setTimeout(() => {
      const next = Math.min(MAX, prev * 1.3 + 0.08);
      setSize(next);
      setMood('worried');
      setMsg(next >= MAX ? `${card.grow} 이제 너무 커져서 피하기도 버거워…` : card.grow);
      setSpeech(pick(BLOB_GROWN, n));
      setHistory((h) => [...h, { kind: 'avoid' as const, size: next }].slice(-12));
      setBusy(false);
      setLastCard(null);
    }, 1500);
  };

  // ── 다가가기 (꾹 누르고 버티기) ──
  const finishHold = useCallback(() => {
    holding.current = false;
    const prev = holdBase.current;
    const n = approachRef.current;
    const next = Math.max(MIN, prev * 0.72);
    setShaking(false);
    setHoldP(0);
    setSize(next);
    setMood(next <= 0.7 ? 'proud' : 'calm');
    setApproachN(n + 1);
    setMsg(next <= MIN ? '이제 손바닥만 해졌어. 감정은 그대로 있지만, 다룰 만해!' : `끝까지 버텼어! ${pick(APPROACH_SHRINK, n)}`);
    setSpeech(pick(BLOB_HEARD, n));
    setHistory((h) => [...h, { kind: 'approach' as const, size: next }].slice(-12));
  }, []);

  const tick = useCallback(() => {
    if (!holding.current) return;
    const p = Math.min(1, (performance.now() - holdStart.current) / HOLD_MS);
    setHoldP(p);
    if (p >= 1) finishHold();
    else raf.current = requestAnimationFrame(tick);
  }, [finishHold]);

  const startHold = () => {
    if (busy || holding.current) return;
    holding.current = true;
    holdStart.current = performance.now();
    holdBase.current = size;
    setShaking(true);
    setMood('nervous');
    setSize(Math.min(MAX + 0.1, size * 1.1));
    setMsg('으… 가까이 가니까 떨린다. 손 떼지 말고 버텨 봐.');
    setSpeech(pick(BLOB_HOLD, approachN));
    raf.current = requestAnimationFrame(tick);
  };

  const stopHold = () => {
    if (!holding.current) return;
    holding.current = false;
    if (raf.current) cancelAnimationFrame(raf.current);
    setShaking(false);
    setHoldP(0);
    setSize(holdBase.current);
    setMood('calm');
    setMsg('조금 일찍 손을 뗐어. 괜찮아, 다시 꾹 눌러 봐.');
    setSpeech('천천히 와도 돼.');
  };

  const restart = () => {
    window.clearTimeout(timer.current);
    if (raf.current) cancelAnimationFrame(raf.current);
    holding.current = false;
    setSize(1);
    setMood('calm');
    setShaking(false);
    setHoldP(0);
    setBusy(false);
    setLastCard(null);
    setHistory([]);
    setMsg('다시 처음 크기로! 이번엔 어떻게 해 볼래?');
    setSpeech('또 왔네?');
  };

  const pct = Math.round(size * 100);
  const holdingNow = holdP > 0;
  const holdLeft = Math.ceil((1 - holdP) * (HOLD_MS / 1000));

  return (
    <div className="space-y-5">
      {/* 무대 */}
      {/* 휴대폰에서는 버튼이 무대 아래로 멀리 쌓이므로, 무대를 위쪽 바 밑에 붙여 늘 캐릭터가 보이게 한다 */}
      <div className="sticky top-[3.6rem] z-20 overflow-hidden rounded-3xl border border-night-line bg-gradient-to-b from-night-card to-night-bg md:relative md:top-auto md:z-auto">
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

        {/* 말풍선 */}
        <div className="pointer-events-none absolute inset-x-0 top-12 z-10 flex justify-center px-4 md:top-16" aria-hidden="true">
          <div
            key={speech}
            className="relative max-w-[70%] rounded-2xl bg-[#FFF6E8] px-4 py-2 text-center text-base font-medium text-[#2A1B3D] shadow-lg motion-safe:animate-[fadein_0.35s_ease-out]"
          >
            {speech}
            <span className="absolute left-1/2 top-full -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-[#FFF6E8]" />
          </div>
        </div>

        <div className="flex h-[260px] items-center justify-center pt-14 md:h-[420px] md:pt-24" role="img" aria-label={`감정 "${emotion}" 크기 ${pct}%`}>
          <div
            className="flex flex-col items-center motion-safe:transition-transform motion-safe:duration-700"
            style={{ transform: `scale(${size})`, transitionTimingFunction: 'cubic-bezier(.34,1.56,.64,1)' }}
          >
            <div className={`h-[4.5rem] w-[4.5rem] md:h-28 md:w-28 ${shaking ? 'blob-wobble' : 'blob-idle'}`}>
              <EmotionBlob mood={mood} color={blobColor(size)} />
            </div>
          </div>
        </div>
        <p className="absolute inset-x-0 bottom-3 text-center font-display text-lg text-night-text">{emotion}</p>
      </div>

      <p aria-live="polite" className="min-h-[3.5rem] text-lg leading-relaxed text-night-text">
        {msg}
        <span className="sr-only"> 감정이 말해: {speech}</span>
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 피하기 카드 */}
        <fieldset className="rounded-3xl border border-[#FF8E72]/40 bg-[#FF8E72]/5 p-4">
          <legend className="px-1 text-sm text-night-text">
            <span className="font-medium text-[#FF8E72]">피하기</span> · 어떻게 피해 볼래? <span className="tabular-nums text-night-sub">({avoidN}번)</span>
          </legend>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {cards.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => avoid(c)}
                disabled={busy || holdingNow}
                className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-sm text-night-text transition motion-safe:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
                  lastCard === c.id ? 'border-[#FF8E72] bg-[#FF8E72]/20' : 'border-night-line bg-night-card hover:border-[#FF8E72]/70'
                } ${c.id === 'mine' ? 'col-span-2' : ''}`}
                style={{ ['--focus-color' as string]: '#FF8E72' }}
              >
                <span aria-hidden="true" className="text-xl">
                  {c.icon}
                </span>
                <span className="min-w-0">
                  {c.label}
                  {c.id === 'mine' && <span className="block text-xs text-night-sub">내가 적은 행동</span>}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        {/* 다가가기: 꾹 누르고 버티기 */}
        <div className="flex flex-col rounded-3xl border border-[#7FD6C2]/40 bg-[#7FD6C2]/5 p-4">
          <p className="px-1 text-sm text-night-text">
            <span className="font-medium text-[#7FD6C2]">다가가기</span> · 꾹 누르고 {HOLD_MS / 1000}초 버티기{' '}
            <span className="tabular-nums text-night-sub">({approachN}번)</span>
          </p>
          <button
            type="button"
            disabled={busy}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              startHold();
            }}
            onPointerUp={stopHold}
            onPointerCancel={stopHold}
            onLostPointerCapture={stopHold}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                if (!e.repeat) startHold();
              }
            }}
            onKeyUp={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                stopHold();
              }
            }}
            onBlur={stopHold}
            onContextMenu={(e) => e.preventDefault()}
            aria-describedby="hold-help"
            className={`relative mt-2 flex flex-1 select-none items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-[#7FD6C2] px-6 py-5 text-lg text-night-text transition disabled:cursor-not-allowed disabled:opacity-50 ${
              holdingNow ? 'scale-[0.98]' : 'hover:bg-[#7FD6C2]/10'
            }`}
            style={{ ['--focus-color' as string]: '#7FD6C2', touchAction: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
          >
            {/* 버티기 게이지 */}
            <span aria-hidden="true" className="absolute inset-y-0 left-0 bg-[#7FD6C2]/30" style={{ width: `${holdP * 100}%` }} />
            <Footprints aria-hidden="true" className="relative h-5 w-5 text-[#7FD6C2]" />
            <span className="relative">{holdingNow ? `버티는 중… ${holdLeft}초` : '꾹 눌러서 다가가기'}</span>
          </button>
          <p id="hold-help" className="mt-2 px-1 text-xs text-night-sub">
            누르고 있는 동안 감정 곁에 머무는 거야. 중간에 떼도 괜찮아. 키보드는 스페이스바를 누르고 있으면 돼.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!ready && (
          <p className="text-sm text-night-sub">
            피하기와 다가가기를 각각 {NEED}번 이상 해 봐. (피하기 {Math.min(avoidN, NEED)}/{NEED} · 다가가기 {Math.min(approachN, NEED)}/{NEED})
          </p>
        )}
        <button type="button" onClick={restart} className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-night-sub hover:text-night-text">
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          처음 크기로
        </button>
      </div>
    </div>
  );
}
