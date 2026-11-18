import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, CornerDownRight, Lock } from 'lucide-react';
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

/** 도감 카드 한 장 (실제 버튼: 누르면 아래에 자세히) */
function DiscoveryCard({
  planet,
  state,
  progress,
  selected,
  onSelect,
}: {
  planet: Planet;
  state: CardState;
  progress: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const found = state === 'found';
  const locked = state === 'locked';
  const label = found ? planet.discoveryName : locked ? '잠긴 카드' : `${planet.discoveryName} 찾는 중`;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${planet.id}번 카드, ${planet.name}, ${label}${locked ? '' : `, 미션 ${progress}`}`}
      className={`group relative flex flex-col overflow-hidden rounded-3xl border-2 p-[6%] text-left transition motion-safe:hover:-translate-y-1 ${
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
        {locked ? (
          <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-dashed border-night-line">
            <span className="font-display text-6xl text-night-line" aria-hidden="true">
              ?
            </span>
          </div>
        ) : (
          <div
            className={found ? 'h-full w-full motion-safe:transition-transform motion-safe:group-hover:scale-105' : 'h-full w-full opacity-30 grayscale'}
          >
            <DiscoveryArt planetId={planet.id} sparkle={found} />
          </div>
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

  const states = PLANETS.map((p) => ({ planet: p, state: cardState(db, student, p.id) }));
  const foundCount = states.filter((s) => s.state === 'found').length;
  const courage = courageStars(db, student.id);
  const selected = selectedId ? planetById(selectedId) : null;
  const selectedState = selected ? cardState(db, student, selected.id) : null;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl text-night-text">탐사 도감</h1>
        <p className="mt-2 text-night-sub">행성마다 미션 두 개를 마치면 그 행성의 발견물 카드가 생겨. 카드를 누르면 자세히 볼 수 있어.</p>
        <p className="mt-1 text-sm text-night-sub">
          발견한 카드 {foundCount} / {PLANETS.length}
        </p>
      </header>

      <ul className="grid grid-cols-3 gap-[3%]">
        {states.map(({ planet, state }) => (
          <li key={planet.id}>
            <DiscoveryCard
              planet={planet}
              state={state}
              progress={`${completedCount(db, student.id, planet.id)}/${requiredMissions(db, student.id, planet.id).length}`}
              selected={selectedId === planet.id}
              onSelect={() => setSelectedId(selectedId === planet.id ? null : planet.id)}
            />
          </li>
        ))}
      </ul>

      {selected && selectedState && (
        <section aria-live="polite" aria-labelledby="card-detail" className="rounded-3xl border border-night-line bg-night-card p-6">
          <p className="text-sm text-night-sub">
            No.{selected.id} · {selected.name} · UP-A {selected.upaModule}
          </p>
          <h2 id="card-detail" className="mt-1 text-2xl text-night-text">
            {selectedState === 'found' ? selected.discoveryName : '아직 찾지 못한 발견물'}
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
              {selectedState === 'found' && (
                <p className="mt-3 text-sm text-night-sub">{formatDate(foundAt(db, student.id, selected.id) ?? '')}에 발견했어.</p>
              )}
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
