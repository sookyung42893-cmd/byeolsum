import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, CornerDownRight, Lock, Sparkles, X } from 'lucide-react';
import { REVIEW_NOTES } from '../../data/reviewNotes';
import { useApp, useCurrentStudent } from '../../context/AppContext';
import { PLANETS, missionsOfPlanet, planetById, planetIntro, sessionOfPlanet } from '../../data/planets';
import { completedCount, courageStars, hasDiscovery, isPlanetOpen, progressOf, requiredMissions } from '../../lib/voyage';
import { formatDate } from '../../lib/dates';
import DiscoveryArt from '../../components/codex/DiscoveryArt';
import CourageStarIcon from '../../components/codex/CourageStarIcon';
import type { DB, Planet, Student } from '../../types';

type CardState = 'found' | 'exploring' | 'locked';

function cardState(db: DB, student: Student, planetId: number): CardState {
  if (hasDiscovery(db, student.id, planetId)) return 'found';
  return isPlanetOpen(student, planetId) ? 'exploring' : 'locked';
}

/** 발견물을 얻은 날 = 그 행성 미션 중 마지막으로 완료한 날 */
function foundAt(db: DB, studentId: string, planetId: number): string | undefined {
  return missionsOfPlanet(planetId)
    .map((m) => progressOf(db, studentId, m.id)?.completedAt)
    .filter((d): d is string => Boolean(d))
    .sort()
    .pop();
}

/**
 * 아직 다 풀지 못한 카드의 그림 자리. 발견물 모양은 숨기고,
 * 행성 색 성운 속에 물음표(탐사 중) 또는 자물쇠(잠김)만 보여준다.
 * 탐사 중이면 바깥 고리가 미션 진행만큼 채워진다.
 */
function MysteryArt({ planet, locked, ratio }: { planet: Planet; locked: boolean; ratio: number }) {
  const gid = `mystery-${planet.id}`;
  const color = locked ? '#5A6390' : planet.color;
  const ring = 2 * Math.PI * 42;
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <defs>
        <radialGradient id={gid} cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity={locked ? 0.28 : 0.5} />
          <stop offset="55%" stopColor={color} stopOpacity={locked ? 0.1 : 0.18} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* 성운 */}
      <circle cx="50" cy="50" r="40" fill={`url(#${gid})`} className={locked ? undefined : 'nebula-breathe'} />
      {/* 궤도 고리 + 진행 */}
      <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeOpacity="0.35" strokeWidth="1.2" strokeDasharray="2 4" />
      {!locked && ratio > 0 && (
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray={`${ring * ratio} ${ring}`}
          transform="rotate(-90 50 50)"
        />
      )}
      {/* 반짝이 */}
      {[
        [24, 26, 1.6],
        [78, 30, 1.2],
        [72, 76, 1.5],
        [28, 72, 1],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={locked ? '#7B84AD' : '#FFF6DF'} className={locked ? undefined : i % 2 ? 'twinkle-slow' : 'twinkle'} />
      ))}
      {locked ? (
        <g fill="none" stroke="#7B84AD" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <rect x="39" y="47" width="22" height="17" rx="3.5" />
          <path d="M43.5 47v-5a6.5 6.5 0 0 1 13 0v5" />
        </g>
      ) : (
        <text x="50" y="61" textAnchor="middle" fontSize="32" fill={color} className="font-display">
          ?
        </text>
      )}
    </svg>
  );
}

/** 발견물 복습노트 (완성한 카드를 누르면 열린다) */
function ReviewNoteDialog({ planet, onClose }: { planet: Planet; onClose: () => void }) {
  const { db } = useApp();
  const student = useCurrentStudent()!;
  const note = REVIEW_NOTES[planet.id];
  const ref = useRef<HTMLDivElement>(null);
  const when = foundAt(db, student.id, planet.id);
  const myRecords = missionsOfPlanet(planet.id)
    .map((m) => ({ m, pr: progressOf(db, student.id, m.id) }))
    .filter(({ pr }) => pr?.status === '완료');

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05081A]/80 p-4" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border-2 bg-night-card p-6 text-night-text shadow-2xl outline-none"
        style={{ borderColor: `${planet.color}99` }}
      >
        <div className="flex items-start gap-4">
          <div className="h-20 w-20 shrink-0 sm:h-24 sm:w-24">
            <DiscoveryArt planetId={planet.id} sparkle />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-night-sub">
              복습노트 · No.{planet.id} {planet.name}
            </p>
            <h2 id="note-title" className="mt-0.5 text-2xl text-night-text">
              {planet.discoveryName}
            </h2>
            <p className="mt-0.5 text-sm text-night-sub">{planet.theme}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded-lg p-1 text-night-sub hover:text-night-text">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        {note && (
          <>
            <p className="mt-5 rounded-2xl px-4 py-3 text-lg leading-relaxed" style={{ backgroundColor: `${planet.color}1F` }}>
              {note.keyIdea}
            </p>

            <section aria-labelledby="note-points" className="mt-6">
              <h3 id="note-points" className="font-sans text-sm font-medium" style={{ color: planet.color }}>
                이 행성에서 배운 것
              </h3>
              <ol className="mt-2 space-y-3">
                {note.points.map((p, i) => (
                  <li key={p.title} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-night-bg"
                      style={{ backgroundColor: planet.color }}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium text-night-text">{p.title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-night-sub">{p.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <blockquote className="mt-6 border-l-4 pl-4 font-display text-xl text-night-text" style={{ borderColor: planet.color }}>
              “{note.quote}”
            </blockquote>

            <section aria-labelledby="note-try" className="mt-6">
              <h3 id="note-try" className="font-sans text-sm font-medium" style={{ color: planet.color }}>
                이렇게 써먹어 봐
              </h3>
              <ul className="mt-2 space-y-1.5">
                {note.tryIt.map((t) => (
                  <li key={t} className="flex gap-2 text-sm leading-relaxed text-night-text">
                    <Sparkles aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" style={{ color: planet.color }} />
                    {t}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        <section aria-labelledby="note-mine" className="mt-6 rounded-2xl bg-night-bg/60 p-4">
          <h3 id="note-mine" className="font-sans text-sm font-medium text-night-text">
            내가 남긴 기록
          </h3>
          <ul className="mt-2 space-y-2.5">
            {myRecords.map(({ m, pr }) => (
              <li key={m.id} className="text-sm">
                <p className="flex items-center gap-1.5 text-night-text">
                  <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-emo-calm" />
                  {m.kind} · {m.title}
                  {pr?.moodBefore !== undefined && pr?.moodAfter !== undefined && (
                    <span className="text-night-sub">
                      · 기분 {pr.moodBefore} → {pr.moodAfter}
                    </span>
                  )}
                </p>
                {pr?.reflection && <p className="ml-5 mt-0.5 leading-relaxed text-night-sub">“{pr.reflection}”</p>}
              </li>
            ))}
          </ul>
          {when && <p className="mt-3 text-xs text-night-sub">{formatDate(when)}에 발견했어.</p>}
        </section>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            to={`/student/planet/${planet.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-night-star underline-offset-4 hover:underline"
          >
            {planet.name} 다시 가보기
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <button type="button" onClick={onClose} className="ml-auto rounded-xl px-4 py-2 text-sm text-night-sub hover:text-night-text">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

/** 도감 카드 한 장 (실제 버튼: 완성 카드는 복습노트, 나머지는 아래에 자세히) */
function DiscoveryCard({
  planet,
  state,
  progress,
  ratio,
  selected,
  onSelect,
}: {
  planet: Planet;
  state: CardState;
  progress: string;
  /** 미션 진행 비율 (0~1) */
  ratio: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const found = state === 'found';
  const locked = state === 'locked';
  const label = found ? `${planet.discoveryName}, 복습노트 열기` : locked ? '잠긴 카드' : '아직 모르는 발견물 찾는 중';

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${planet.id}번 카드, ${planet.name}, ${label}${locked ? '' : `, 미션 ${progress}`}`}
      className={`group relative flex h-full w-full flex-col overflow-hidden rounded-3xl border-2 p-[6%] text-left transition motion-safe:hover:-translate-y-1 ${
        found ? '' : locked ? 'border-night-line bg-night-card' : 'border-dashed border-night-line bg-night-card'
      }`}
      style={
        {
          // 키보드 포커스 빛도 카드의 행성 색으로
          '--focus-color': planet.color,
          // 고른 카드: 흰 테두리 대신 행성 색 빛 번짐
          ...(found
            ? {
                borderColor: planet.color,
                background: `radial-gradient(circle at 50% 38%, ${planet.color}40 0%, #151B3A 68%)`,
                boxShadow: selected ? `0 0 34px ${planet.color}66` : `0 0 28px ${planet.color}22`,
              }
            : selected
              ? { boxShadow: `0 0 26px ${planet.color}40`, borderColor: `${planet.color}99` }
              : {}),
        } as unknown as CSSProperties
      }
    >
      <div className="flex items-center justify-between text-xs">
        <span className="rounded-full bg-night-bg/70 px-2 py-0.5 tabular-nums text-night-sub">No.{planet.id}</span>
        <span
          className={`rounded-full px-2 py-0.5 ${
            found ? 'bg-night-bg/70 text-night-text' : locked ? 'text-night-sub' : 'bg-night-line text-night-text'
          }`}
        >
          {found ? '발견!' : locked ? '잠김' : `탐사 중 ${progress}`}
        </span>
      </div>

      <div className="relative mx-auto my-[6%] aspect-square w-[78%]">
        {found ? (
          <div className="h-full w-full motion-safe:transition-transform motion-safe:group-hover:scale-105">
            <DiscoveryArt planetId={planet.id} sparkle />
          </div>
        ) : (
          <MysteryArt planet={planet} locked={locked} ratio={ratio} />
        )}
      </div>

      <p className={`text-center font-display text-lg ${found ? 'text-night-text' : 'text-night-sub'}`}>
        {found ? planet.discoveryName : '???'}
      </p>
      <p className="mt-0.5 text-center text-xs text-night-sub">{planet.name}</p>
    </button>
  );
}

export default function CodexPage() {
  const { db } = useApp();
  const student = useCurrentStudent()!;
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [noteId, setNoteId] = useState<number | null>(null);

  const states = PLANETS.map((p) => ({ planet: p, state: cardState(db, student, p.id) }));
  const foundCount = states.filter((s) => s.state === 'found').length;
  const courage = courageStars(db, student.id);
  const selected = selectedId ? planetById(selectedId) : null;
  const selectedState = selected ? cardState(db, student, selected.id) : null;
  const notePlanet = noteId ? planetById(noteId) : null;
  const closeNote = useCallback(() => setNoteId(null), []);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl text-night-text">탐사 도감</h1>
        <p className="mt-2 text-night-sub">행성마다 미션 두 개를 마치면 그 행성의 발견물 카드가 생겨. 완성한 카드를 누르면 복습노트를 볼 수 있어.</p>
        <p className="mt-1 text-sm text-night-sub">
          발견한 카드 {foundCount} / {PLANETS.length}
        </p>
      </header>

      <ul className="grid grid-cols-3 gap-[3%]">
        {states.map(({ planet, state }) => {
          const done = completedCount(db, student.id, planet.id);
          const total = requiredMissions(db, student.id, planet.id).length;
          return (
            <li key={planet.id}>
              <DiscoveryCard
                planet={planet}
                state={state}
                progress={`${done}/${total}`}
                ratio={total ? done / total : 0}
                selected={selectedId === planet.id || noteId === planet.id}
                onSelect={() => {
                  if (state === 'found') {
                    setSelectedId(null);
                    setNoteId(planet.id);
                  } else setSelectedId(selectedId === planet.id ? null : planet.id);
                }}
              />
            </li>
          );
        })}
      </ul>

      {notePlanet && <ReviewNoteDialog planet={notePlanet} onClose={closeNote} />}

      {selected && selectedState && selectedState !== 'found' && (
        <section aria-live="polite" aria-labelledby="card-detail" className="rounded-3xl border border-night-line bg-night-card p-6">
          <p className="text-sm text-night-sub">
            No.{selected.id} · {selected.name} · UP-A {selected.upaModule}
          </p>
          <h2 id="card-detail" className="mt-1 text-2xl text-night-text">
            아직 찾지 못한 발견물
          </h2>
          <p className="mt-1 text-night-sub">{planetIntro(selected.id)}</p>

          {selectedState === 'locked' ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-night-sub">
              <Lock aria-hidden="true" className="h-4 w-4" />
              {sessionOfPlanet(selected.id)}회기가 되면 이 행성을 탐사할 수 있어.
            </p>
          ) : (
            <>
              <ul className="mt-4 space-y-2">
                {missionsOfPlanet(selected.id).map((m) => {
                  const pr = progressOf(db, student.id, m.id);
                  return (
                    <li key={m.id} className="flex items-center gap-3 rounded-xl bg-night-bg/60 px-4 py-2.5 text-sm">
                      {pr?.status === '완료' ? (
                        <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-emo-calm" />
                      ) : pr?.status === '다음 항해로' ? (
                        <CornerDownRight aria-hidden="true" className="h-4 w-4 shrink-0 text-night-sub" />
                      ) : (
                        <span aria-hidden="true" className="h-4 w-4 shrink-0 rounded-full border border-night-sub" />
                      )}
                      <span className="text-night-text">
                        {m.kind} · {m.title}
                      </span>
                      <span className="ml-auto text-night-sub">{pr?.status ?? '대기'}</span>
                    </li>
                  );
                })}
              </ul>
              <Link
                to={`/student/planet/${selected.id}`}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-night-star underline-offset-4 hover:underline"
              >
                {selected.name} 미션 보러 가기
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </>
          )}
        </section>
      )}

      <section aria-labelledby="courage-title" className="rounded-3xl border border-night-line bg-night-card p-6">
        <h2 id="courage-title" className="font-sans text-base font-medium text-night-text">
          용기의 별 <span className="text-night-star">{courage}개</span>
        </h2>
        <p className="mt-1 text-sm text-night-sub">
          도전 미션을 시도할 때마다 하나씩 떠. 결과가 어땠는지는 상관없어.
          {courageStars(db, student.id, true) > 0 && ` 그중 ${courageStars(db, student.id, true)}개는 용기 구간에서 띄웠어.`}
        </p>
        {courage > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label={`용기의 별 ${courage}개`}>
            {Array.from({ length: courage }, (_, i) => (
              <li key={i}>
                <CourageStarIcon />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-night-sub">
            아직 없어. 관측소에서 도전 미션이 오면{' '}
            <Link to="/student/challenge" className="text-night-star underline underline-offset-4">
              도전 미션
            </Link>
            에서 시도해볼 수 있어.
          </p>
        )}
      </section>
    </div>
  );
}
