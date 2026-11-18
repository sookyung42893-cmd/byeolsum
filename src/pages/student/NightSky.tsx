import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Pencil, Plus, Radio, Telescope, Trash2, X } from 'lucide-react';
import { deleteCheckInConfirm, removeCheckIn } from '../../lib/mutations';
import { askConfirm } from '../../lib/confirm';
import { useApp, useCurrentStudent } from '../../context/AppContext';
import { QUADRANTS, QUADRANT_ORDER, colorOf, emotionLabel } from '../../data/emotions';
import { planetById, stationOfSession } from '../../data/planets';
import { activeChallenge, courageStars, progressOf, requiredMissions } from '../../lib/voyage';
import { checkInsInWeek } from '../../lib/selectors';
import { formatDate, formatDateTime } from '../../lib/dates';
import {
  LENS_TINT,
  TINTABLE_ARMS,
  displayIntensity,
  isLens,
  lensUsesOf,
  noteAnswers,
  spreadPoints,
  starOpacity,
  starRadius,
} from '../../lib/sky';
import type { Challenge, CheckIn, StrategyUse } from '../../types';
import { SparkleStar, type ArmTint } from '../../components/Sparkle';

/** viewBox 크기 (그리기 단위. 실제 화면 크기와는 무관하게 늘고 줄어든다) */
const W = 760;
const H = 540;
const PAD = 40;
const toX = (v: number) => PAD + ((v + 1) / 2) * (W - 2 * PAD);
const toY = (a: number) => PAD + ((1 - a) / 2) * (H - 2 * PAD);

/** 캔버스 장식용 희미한 별 (고정 배치) */
const DUST = (() => {
  let s = 42;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: 90 }, () => ({ x: rand() * W, y: rand() * H, r: 0.4 + rand() * 0.9, o: 0.1 + rand() * 0.3 }));
})();

/** 관측 직후 연출 시간 (ms): 잠깐 기다림 → 갈래에 렌즈 색이 중심에서 바깥으로 스며듦 */
const ANIM_WAIT = 400;
const ANIM_DRAW = 1000;
const ANIM_TOTAL = ANIM_WAIT + ANIM_DRAW;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

interface StarView {
  c: CheckIn;
  x: number;
  y: number;
  uses: StrategyUse[];
}

interface Constellation {
  word: string;
  list: StarView[];
  color: string;
}

function usePrefersReducedMotion() {
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  return reduced;
}

/**
 * 망원경 관측을 별빛 갈래 색으로: 관측 1번당 십자 갈래 하나(위 → 오른쪽 → 아래 → 왼쪽)에 렌즈 색이 스며든다.
 * 4번을 넘으면 더 바꾸지 않는다 (전체 기록은 별 카드에서).
 * animUseId: 지금 막 관측한 기록이면 그 갈래는 drawT만큼만 스며든 상태
 */
function armTints(uses: StrategyUse[], animUseId: string | null, drawT: number): (ArmTint | null)[] {
  return Array.from({ length: TINTABLE_ARMS }, (_, k) => {
    const u = uses[k];
    if (!u || !isLens(u.strategy)) return null;
    return { color: LENS_TINT[u.strategy], t: u.id === animUseId ? drawT : 1 };
  });
}

/** 별을 누르면 뜨는 작은 기록 카드 */
function StarCard({ star, onClose }: { star: StarView; onClose: () => void }) {
  const { db, updateDb } = useApp();
  const { c, uses, x, y } = star;
  const left = Math.min(Math.max((x / W) * 100, 22), 78);
  const below = y / H < 0.42;

  return (
    <div
      role="dialog"
      aria-label={`${emotionLabel(c)} 별의 기록`}
      className="absolute z-10 w-[min(20rem,44%)] rounded-2xl border border-night-line bg-night-card/95 p-4 text-sm shadow-xl backdrop-blur"
      style={{
        left: `${left}%`,
        top: `${(y / H) * 100}%`,
        transform: below ? 'translate(-50%, 26px)' : 'translate(-50%, calc(-100% - 26px))',
      }}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium" style={{ color: colorOf(c) }}>
            {emotionLabel(c)}
          </p>
          <p className="mt-0.5 text-xs text-night-sub">
            {formatDateTime(c.timestamp)} · 강도 {c.intensity}
            {c.bodyLocation && ` · ${c.bodyLocation}`}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="카드 닫기" className="-mr-1 -mt-1 rounded-lg p-1 text-night-sub hover:text-night-text">
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-2 text-night-text">{c.situation || '(상황 메모 없음)'}</p>

      {uses.length > 0 && (
        <div className="mt-3 max-h-40 space-y-2 overflow-y-auto border-t border-night-line pt-3">
          <p className="text-xs text-night-sub">
            관측 기록 {uses.length}번{uses.length > TINTABLE_ARMS && ` · 별빛에는 처음 ${TINTABLE_ARMS}번까지 색이 스며들어`}
          </p>
          {uses.map((u) => (
            <div key={u.id}>
              <p className="flex items-center gap-2 text-night-text">
                <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: isLens(u.strategy) ? LENS_TINT[u.strategy] : '#EEF0FF' }} />
                {u.strategy}
                <span className="ml-auto tabular-nums text-night-sub">
                  강도 {c.intensity} → {u.actualAfter}
                </span>
              </p>
              {noteAnswers(u.note).map((a, i) => (
                <p key={i} className="mt-0.5 line-clamp-2 pl-4 text-xs text-night-sub">
                  {a}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-night-line pt-3 text-xs">
        <Link to={`/student/telescope?checkIn=${c.id}`} className="inline-flex items-center gap-1 text-night-star underline-offset-4 hover:underline">
          <Telescope aria-hidden="true" className="h-3.5 w-3.5" />
          망원경으로 관측
        </Link>
        <Link to={`/student/checkin?edit=${c.id}`} className="inline-flex items-center gap-1 text-night-text underline-offset-4 hover:underline">
          <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
          고치기
        </Link>
        <button
          type="button"
          onClick={() => {
            void askConfirm(deleteCheckInConfirm(db, c.id), '지우기').then((ok) => {
              if (!ok) return;
              updateDb((d) => removeCheckIn(d, c.id));
              onClose();
            });
          }}
          className="inline-flex items-center gap-1 text-emo-hot underline-offset-4 hover:underline"
        >
          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          지우기
        </button>
      </div>
    </div>
  );
}

interface CourageView {
  c: Challenge;
  x: number;
  y: number;
}

/** 다섯 갈래 별 path (용기의 별) */
function courageStarPath(cx: number, cy: number, r: number): string {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    return `${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`;
  });
  return `M ${pts.join(' L ')} Z`;
}

/** 용기의 별 자리: 시도한 순서대로 밤하늘 위쪽 띠에 고르게, 가운데 축과 이름표는 피해서 */
function courageStarPositions(list: Challenge[]): CourageView[] {
  const sorted = [...list].sort((a, b) => (a.completedAt ?? a.createdAt).localeCompare(b.completedAt ?? b.createdAt));
  const n = sorted.length;
  return sorted.map((c, i) => {
    let x = 70 + ((i + 0.5) * (W - 140)) / Math.max(n, 1);
    if (Math.abs(x - W / 2) < 44) x += x < W / 2 ? -44 : 44;
    const h = [...c.id].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) % 997, 7);
    return { c, x, y: 38 + (h % 28) };
  });
}

/** 용기의 별을 누르면 뜨는 작은 카드 */
function CourageCard({ star, onClose }: { star: CourageView; onClose: () => void }) {
  const { c, x, y } = star;
  return (
    <div
      role="dialog"
      aria-label={`용기의 별: ${c.title}`}
      className="absolute z-10 w-[min(19rem,42%)] rounded-2xl border border-night-star/60 bg-night-card/95 p-4 text-sm shadow-xl backdrop-blur"
      style={{ left: `${Math.min(Math.max((x / W) * 100, 22), 78)}%`, top: `${(y / H) * 100}%`, transform: 'translate(-50%, 26px)' }}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-night-star">용기의 별</p>
          <p className="mt-0.5 text-xs text-night-sub">
            {c.session}회기 · {c.step}단계 · {formatDate(c.completedAt ?? c.createdAt)}에 시도
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="카드 닫기" className="-mr-1 -mt-1 rounded-lg p-1 text-night-sub hover:text-night-text">
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 text-night-text">{c.title}</p>
      {c.predicted !== undefined && c.actual !== undefined && (
        <p className="mt-1 text-xs text-night-sub">
          마음 점수 예상 {c.predicted} → 실제 {c.actual}
        </p>
      )}
      {c.reflection && <p className="mt-2 rounded-xl bg-night-bg/70 px-3 py-2 text-night-text">{c.reflection}</p>}
    </div>
  );
}

/** 오른쪽 칸: 이번 주 별자리 목록. 마우스를 올리거나 누르면 그 별자리만 밝아진다 */
function ConstellationList({
  items,
  focusWord,
  selectedWord,
  onHover,
  onSelect,
}: {
  items: Constellation[];
  focusWord: string | null;
  selectedWord: string | null;
  onHover: (word: string | null) => void;
  onSelect: (word: string) => void;
}) {
  return (
    <section aria-labelledby="constellations-title" className="rounded-2xl border border-night-line bg-night-card p-5">
      <h2 id="constellations-title" className="font-sans text-base font-medium text-night-text">
        이번 주 별자리
      </h2>
      {items.length > 0 ? (
        <>
          <p className="mt-1 text-xs text-night-sub">같은 마음이 두 번 이상 뜨면 별자리가 돼. 누르면 하늘에서 찾아줄게.</p>
          <ul className="mt-3 space-y-1" onMouseLeave={() => onHover(null)}>
            {items.map(({ word, list, color }) => {
              const lit = focusWord === word;
              return (
                <li key={word}>
                  <button
                    type="button"
                    aria-pressed={selectedWord === word}
                    onClick={() => onSelect(word)}
                    onMouseEnter={() => onHover(word)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition ${
                      lit ? 'bg-night-line text-night-text' : 'text-night-text hover:bg-night-line/50'
                    }`}
                  >
                    <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <span className="min-w-0 flex-1 truncate">{word}자리</span>
                    <span className="tabular-nums text-night-sub">· {list.length}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="mt-1 text-sm text-night-sub">같은 마음이 두 번 이상 뜨면 여기에 별자리가 생겨.</p>
      )}
    </section>
  );
}

/** 오른쪽 칸 맨 위: 상담사가 보낸 도전 미션 (5단계에서 화면 완성) */
function ChallengeSignal() {
  const { db } = useApp();
  const student = useCurrentStudent()!;
  const ch = activeChallenge(db, student.id);
  if (!ch) return null;
  return (
    <section
      aria-labelledby="signal-title"
      className="rounded-2xl border border-night-star/60 bg-night-card p-5 shadow-[0_0_24px_rgba(244,201,121,0.12)]"
    >
      <h2 id="signal-title" className="flex items-center gap-2 font-sans text-base font-medium text-night-star">
        <Radio aria-hidden="true" className="h-4 w-4" />
        관측소에서 신호가 왔어
      </h2>
      <p className="mt-2 font-medium leading-snug text-night-text">{ch.title}</p>
      <p className="mt-1 text-xs text-night-sub">
        {ch.step}단계 · {formatDate(ch.dueDate + 'T00:00:00')}까지
      </p>
      <Link
        to="/student/challenge"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-night-star underline-offset-4 hover:underline"
      >
        도전 미션 보기
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </section>
  );
}

/** 지금 회기 정거장의 진행: 행성이면 미션 진행률, 용기 구간이면 도전 미션과 용기의 별 */
function PlanetProgress() {
  const { db } = useApp();
  const student = useCurrentStudent()!;
  const station = stationOfSession(student.currentSession);
  if (station.kind === 'courage') {
    const tried = courageStars(db, student.id, true);
    return (
      <section aria-labelledby="progress-title" className="rounded-2xl border border-night-line bg-night-card p-5">
        <h2 id="progress-title" className="font-sans text-base font-medium text-night-text">
          용기 구간
        </h2>
        <p className="mt-1 text-sm text-night-sub">
          {student.currentSession}회기 · 회기에서 함께 정한 도전 미션에 다가가 보는 시기야.
        </p>
        <p className="mt-3 text-sm text-night-text">
          이 구간에서 띄운 용기의 별 <span className="font-medium text-night-star">{tried}개</span>
        </p>
        <Link
          to="/student/courage"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-night-star underline-offset-4 hover:underline"
        >
          용기 구간 보러 가기
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </section>
    );
  }
  const planet = planetById(station.planetId!);
  const list = requiredMissions(db, student.id, planet.id);
  const doneCount = list.filter((m) => progressOf(db, student.id, m.id)?.status === '완료').length;
  return (
    <section aria-labelledby="progress-title" className="rounded-2xl border border-night-line bg-night-card p-5">
      <h2 id="progress-title" className="font-sans text-base font-medium text-night-text">
        이번 항해 미션
      </h2>
      <p className="mt-1 text-sm text-night-sub">
        {planet.name} · {planet.theme}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={list.length}
          aria-valuenow={doneCount}
          aria-label={`${planet.name} 미션 진행`}
          className="h-2 flex-1 overflow-hidden rounded-full bg-night-line"
        >
          <div className="h-full rounded-full bg-night-star" style={{ width: `${(doneCount / list.length) * 100}%` }} />
        </div>
        <span className="text-sm tabular-nums text-night-text">
          {doneCount} / {list.length}
        </span>
      </div>
      <Link
        to={`/student/planet/${planet.id}`}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-night-star underline-offset-4 hover:underline"
      >
        행성 미션 보러 가기
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </section>
  );
}

export default function NightSkyPage() {
  const { db } = useApp();
  const student = useCurrentStudent()!;
  const location = useLocation();
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();

  // 망원경 관측을 마치고 돌아왔으면 그 관측의 프리즘 연출을 한 번 보여준다
  const [anim] = useState(() => {
    const useId = (location.state as { observedUseId?: string } | null)?.observedUseId;
    const use = useId ? db.strategyUses.find((u) => u.id === useId) : undefined;
    return use && !reduced ? { use, start: performance.now() } : null;
  });
  useEffect(() => {
    // 새로고침해도 다시 재생되지 않게 기록을 지운다
    if (location.state) navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [now, setNow] = useState(() => performance.now());
  const raf = useRef(0);
  useEffect(() => {
    if (!anim) return;
    const loop = () => {
      const t = performance.now();
      setNow(t);
      if (t - anim.start < ANIM_TOTAL) raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [anim]);
  const elapsed = anim ? now - anim.start : ANIM_TOTAL;
  const drawT = easeInOut(clamp01((elapsed - ANIM_WAIT) / ANIM_DRAW));
  const animating = anim !== null && elapsed < ANIM_TOTAL;

  // 이번 주 별 (+ 방금 관측한 별이 일주일보다 오래됐어도 연출을 위해 함께)
  const checkIns = useMemo(() => {
    const week = checkInsInWeek(db, student.id, 0);
    const observed = anim && db.checkIns.find((c) => c.id === anim.use.checkInId);
    return observed && !week.some((c) => c.id === observed.id) ? [...week, observed] : week;
  }, [db, student.id, anim]);

  const stars: StarView[] = useMemo(() => {
    const spread = spreadPoints(checkIns.map((c) => ({ x: toX(c.valence), y: toY(c.arousal) })));
    return checkIns.map((c, i) => ({ c, x: spread[i].x, y: spread[i].y, uses: lensUsesOf(db, c.id) }));
  }, [checkIns, db]);

  // 같은 세부 감정끼리 시간순으로 이어 별자리를 만든다
  const constellations: Constellation[] = useMemo(() => {
    const groups = new Map<string, StarView[]>();
    for (const s of stars) groups.set(s.c.emotionWord, [...(groups.get(s.c.emotionWord) ?? []), s]);
    return [...groups.entries()]
      .filter(([, list]) => list.length >= 2)
      .map(([word, list]) => ({ word, list, color: colorOf(list[list.length - 1].c) }))
      .sort((a, b) => b.list.length - a.list.length);
  }, [stars]);

  const [hoverWord, setHoverWord] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [hoverStarId, setHoverStarId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const pinned = stars.find((s) => s.c.id === pinnedId);
  const hoverStar = stars.find((s) => s.c.id === hoverStarId);
  const focusWord = hoverWord ?? selectedWord ?? hoverStar?.c.emotionWord ?? pinned?.c.emotionWord ?? null;
  const dimmed = (word: string) => focusWord !== null && word !== focusWord;

  // 용기의 별: 시도한 도전 미션마다 하나. 감정 좌표가 아니라 밤하늘 위쪽 띠에 뜬다
  const courage = useMemo(() => courageStarPositions(db.challenges.filter((c) => c.studentId === student.id && c.status === '완료')), [db.challenges, student.id]);
  const [pinnedCourageId, setPinnedCourageId] = useState<string | null>(null);
  const pinnedCourage = courage.find((s) => s.c.id === pinnedCourageId);

  const togglePin = (id: string) => {
    setSelectedWord(null);
    setPinnedCourageId(null);
    setPinnedId(pinnedId === id ? null : id);
  };
  const toggleCourage = (id: string) => {
    setPinnedId(null);
    setPinnedCourageId(pinnedCourageId === id ? null : id);
  };
  const onStarKey = (e: KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      togglePin(id);
    } else if (e.key === 'Escape') setPinnedId(null);
  };

  return (
    <div className="flex gap-[3%]">
      <div className="min-w-0 flex-1">
        <header className="mb-6">
          <h1 className="text-3xl text-night-text">나의 밤하늘</h1>
          <p className="mt-2 text-night-sub">최근 7일 동안 띄운 마음들이야. 별을 누르면 그 별의 기록을 볼 수 있어.</p>
        </header>

        <div className="relative overflow-hidden rounded-3xl border border-night-line bg-[radial-gradient(ellipse_at_top,#18204A_0%,#0B1026_70%)]">
          <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="group" aria-label={`이번 주 밤하늘, 별 ${stars.length}개`}>
            <defs>
              <filter id="ring-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" />
              </filter>
            </defs>

            {DUST.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#EEF0FF" opacity={d.o} aria-hidden="true" />
            ))}

            <g aria-hidden="true" stroke="#222A55" strokeDasharray="2 6">
              <line x1={W / 2} y1={PAD / 2} x2={W / 2} y2={H - PAD / 2} />
              <line x1={PAD / 2} y1={H / 2} x2={W - PAD / 2} y2={H / 2} />
            </g>
            <g aria-hidden="true" fill="#A9B0D6" fontSize="12">
              <text x={W / 2} y={18} textAnchor="middle">에너지 높음</text>
              <text x={W / 2} y={H - 8} textAnchor="middle">에너지 낮음</text>
              <text x={10} y={H / 2 - 8}>불쾌</text>
              <text x={W - 10} y={H / 2 - 8} textAnchor="end">유쾌</text>
            </g>

            <g aria-hidden="true">
              {constellations.map(({ word, list, color }) => (
                <polyline
                  key={word}
                  points={list.map((s) => `${s.x},${s.y}`).join(' ')}
                  fill="none"
                  stroke={color}
                  strokeWidth={focusWord === word ? 1.8 : 1}
                  strokeOpacity={dimmed(word) ? 0.06 : focusWord === word ? 0.85 : 0.32}
                />
              ))}
            </g>

            {stars.map((s) => {
              const { c, x, y, uses } = s;
              const isAnim = animating && anim!.use.checkInId === c.id && uses[uses.length - 1]?.id === anim!.use.id;
              const before = displayIntensity(c, isAnim ? uses.slice(0, -1) : uses);
              const after = displayIntensity(c, uses);
              const intensity = isAnim ? before + (after - before) * drawT : after;
              const r = starRadius(intensity);
              const dim = dimmed(c.emotionWord);
              const color = colorOf(c);
              const selected = pinnedId === c.id;
              // 포커스·선택 테두리: 별 모양에 맞춘 둥근 금빛 원
              const outer = r * 1.5 + 6;
              return (
                <g
                  key={c.id}
                  tabIndex={0}
                  role="button"
                  aria-pressed={selected}
                  aria-label={`${emotionLabel(c)}, 강도 ${c.intensity}${uses.length ? `, 망원경 관측 ${uses.length}번` : ''}, ${formatDateTime(c.timestamp)}`}
                  className="sky-star cursor-pointer"
                  style={{ '--focus-color': color } as CSSProperties}
                  onMouseEnter={() => setHoverStarId(c.id)}
                  onMouseLeave={() => setHoverStarId(null)}
                  onClick={() => togglePin(c.id)}
                  onKeyDown={(e) => onStarKey(e, c.id)}
                  opacity={dim ? 0.18 : 1}
                >
                  <circle cx={x} cy={y} r={Math.max(r * 1.4, 12)} fill="transparent" />
                  {/* 고른 별: 테두리 대신 별 색으로 은은하게 번지는 빛 (키보드 포커스 빛은 CSS :focus-visible) */}
                  {selected && <circle cx={x} cy={y} r={outer} fill={color} opacity={0.28} filter="url(#ring-glow)" />}
                  <SparkleStar
                    cx={x}
                    cy={y}
                    r={r * 3.4}
                    color={color}
                    opacity={starOpacity(intensity)}
                    glow={intensity >= 5 ? 1 : 0.6}
                    twinkle={intensity >= 7}
                    delay={((x + y) % 320) / 100}
                    arms={armTints(uses, isAnim ? anim!.use.id : null, drawT)}
                  />
                </g>
              );
            })}

            {/* 용기의 별 (일반 별과 다른 다섯 갈래 금빛 별) */}
            {courage.map(({ c, x, y }) => {
              const selected = pinnedCourageId === c.id;
              return (
                <g
                  key={c.id}
                  tabIndex={0}
                  role="button"
                  aria-pressed={selected}
                  aria-label={`용기의 별: ${c.title}, ${formatDate(c.completedAt ?? c.createdAt)}에 시도함`}
                  className="sky-star cursor-pointer"
                  style={{ '--focus-color': '#F4C979' } as CSSProperties}
                  onClick={() => toggleCourage(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleCourage(c.id);
                    } else if (e.key === 'Escape') setPinnedCourageId(null);
                  }}
                  opacity={focusWord ? 0.35 : 1}
                >
                  <circle cx={x} cy={y} r={16} fill="transparent" />
                  <circle cx={x} cy={y} r={selected ? 18 : 13} fill="#F4C979" opacity={selected ? 0.36 : 0.18} filter="url(#ring-glow)" />
                  <path d={courageStarPath(x, y, 9)} fill="#F4C979" stroke="#FFE7B0" strokeWidth={1} strokeLinejoin="round" />
                </g>
              );
            })}
          </svg>

          {pinned && <StarCard star={pinned} onClose={() => setPinnedId(null)} />}
          {pinnedCourage && <CourageCard star={pinnedCourage} onClose={() => setPinnedCourageId(null)} />}

          {stars.length === 0 && courage.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
              <p className="font-display text-xl text-night-text">이번 주 밤하늘은 아직 고요해.</p>
              <p className="text-night-sub">마음이 떠오를 때 하나씩 띄워보면 돼.</p>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
          <ul aria-label="별 색깔 안내" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-night-sub">
            {QUADRANT_ORDER.map((q) => (
              <li key={q} className="flex items-center gap-2">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: QUADRANTS[q].color }} />
                {QUADRANTS[q].label}
              </li>
            ))}
          </ul>
          <p className="text-xs text-night-sub">클수록, 밝을수록 강한 마음이야</p>
        </div>
        {courage.length > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-night-sub">
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
              <path d={courageStarPath(10, 10, 8)} fill="#F4C979" />
            </svg>
            하늘 위쪽의 금빛 별은 용기의 별이야. 도전 미션을 해 볼 때마다 하나씩 떠.
          </p>
        )}
        <ul aria-label="망원경 관측 색 안내" className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-night-sub">
          <li>망원경으로 관측하면 별빛에 색이 스며들어:</li>
          {(Object.keys(LENS_TINT) as (keyof typeof LENS_TINT)[]).map((l) => (
            <li key={l} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-0.5 w-4 rounded-full" style={{ backgroundColor: LENS_TINT[l] }} />
              {l}
            </li>
          ))}
        </ul>
      </div>

      <aside className="w-[30%] min-w-[15rem] max-w-sm shrink-0 space-y-6 pt-2">
        <ChallengeSignal />

        <Link
          to="/student/checkin"
          className="flex items-center justify-center gap-2 rounded-2xl bg-night-star px-5 py-4 text-lg font-medium text-night-bg transition hover:brightness-105"
        >
          <Plus aria-hidden="true" className="h-5 w-5" />
          지금 마음 별로 띄우기
        </Link>

        <Link
          to="/student/telescope"
          className="-mt-3 flex items-center justify-center gap-2 rounded-2xl border border-night-line px-5 py-3 text-night-text transition hover:bg-night-line/50"
        >
          <Telescope aria-hidden="true" className="h-5 w-5 text-night-star" />
          망원경으로 다르게 보기
        </Link>

        <ConstellationList
          items={constellations}
          focusWord={focusWord}
          selectedWord={selectedWord}
          onHover={setHoverWord}
          onSelect={(word) => {
            setPinnedId(null);
            setSelectedWord(selectedWord === word ? null : word);
          }}
        />

        <PlanetProgress />
      </aside>
    </div>
  );
}
