import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import TrustedContactsEditor from '../../components/student/TrustedContacts';
import { AssessmentForm } from './Onboarding';
import { ArrowLeft, ArrowRight, Check, CornerDownRight, Eye, HeartPulse, Lock, RotateCcw } from 'lucide-react';
import { useApp, useCurrentStudent } from '../../context/AppContext';
import { HEART_EXPERIMENT_ID, PLANETS, missionsOfPlanet, planetById, planetIntro, sessionOfPlanet } from '../../data/planets';
import {
  completeMission,
  completedCount,
  hasDiscovery,
  isMissionOff,
  isPlanetOpen,
  planetStatus,
  progressOf,
  requiredMissions,
  setProgress,
} from '../../lib/voyage';
import { formatDate } from '../../lib/dates';
import DiscoveryArt from '../../components/codex/DiscoveryArt';
import IntensitySlider from '../../components/IntensitySlider';
import type { Mission, MissionProgress, PlanetStatus } from '../../types';

const REFLECTION_MAX = 100;
const MOOD_COLOR = '#7FD6C2';

type Mood = Pick<MissionProgress, 'moodBefore' | 'moodAfter'>;

const STATUS_LABEL: Record<PlanetStatus, string> = {
  완료: '발견물을 찾은 행성',
  탐사중: '지금 탐사 중',
  열림: '열려 있는 행성',
  잠김: '아직 잠긴 행성',
};

/** 앱 기록으로 저절로 완료되는 연습 미션의 안내 */
const AUTO_HINT: Record<string, string> = {
  'p1-practice': '별을 하나 띄우고 별똥별도 한 번 띄워 보면 저절로 완료돼.',
  'p5-practice': '너울 행성에 온 뒤로 별똥별을 띄우고 강도를 세 번 이상 적으면 저절로 완료돼.',
};

/** 학생 화면 곳곳에 작게: 상담 선생님이 볼 수 있는 기록이라는 안내 */
export function VisibleToCounselor({ id }: { id?: string }) {
  return (
    <p id={id} className="flex items-center gap-1.5 text-xs text-night-sub">
      <Eye aria-hidden="true" className="h-3.5 w-3.5" />
      선생님이 볼 수 있는 기록이야
    </p>
  );
}

function MissionCard({
  mission,
  progress,
  open,
  off,
  compact = false,
  onUpdate,
}: {
  mission: Mission;
  progress?: MissionProgress;
  open: boolean;
  off: boolean;
  /** 미션이 3개라 칸이 좁을 때: 여백과 제목을 조금 줄인다 */
  compact?: boolean;
  onUpdate: (patch: 'complete' | 'later' | 'resume', reflection?: string, mood?: Mood) => void;
}) {
  const [repeating, setRepeating] = useState(false);
  const status = progress?.status ?? '대기';
  const isHeart = mission.id === HEART_EXPERIMENT_ID;
  const repeats = progress?.repeats ?? [];

  return (
    <li className={`flex min-w-0 flex-col rounded-3xl border border-night-line bg-night-card ${compact ? 'p-5' : 'p-6'}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
        <span
          className={`rounded-full px-2.5 py-0.5 font-medium ${
            mission.kind === '연습' ? 'bg-night-star/15 text-night-star' : 'bg-emo-calm/15 text-emo-calm'
          }`}
        >
          {mission.kind} 미션
        </span>
        <span className="text-night-sub">{mission.kind === '연습' ? '앱에서 기술 연습' : '생활에서 해보기'}</span>
      </div>
      <h3 className={`mt-3 font-display text-night-text ${compact ? 'text-lg' : 'text-xl'}`}>{mission.title}</h3>
      <p className="mt-1 leading-relaxed text-night-sub">{mission.description}</p>

      {isHeart && !off && (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-emo-hot/40 bg-emo-hot/10 px-3 py-2 text-sm text-night-text">
          <HeartPulse aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emo-hot" />
          몸이 불편하면 하지 않아도 돼. 숨이 너무 차거나 어지러우면 바로 멈춰.
        </p>
      )}

      <div className="mt-auto pt-5">
        {!open ? (
          <p className="flex items-center gap-2 text-sm text-night-sub">
            <Lock aria-hidden="true" className="h-4 w-4" />
            {sessionOfPlanet(mission.planetId)}회기에 이 행성이 열리면 할 수 있어.
          </p>
        ) : off ? (
          <p className="rounded-xl bg-night-bg/70 px-4 py-3 text-sm text-night-sub">
            상담 선생님이 이 미션을 꺼 뒀어. 하지 않아도 발견물을 얻을 수 있어.
          </p>
        ) : status === '완료' ? (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm text-night-text">
              <Check aria-hidden="true" className="h-4 w-4 text-emo-calm" />
              {progress?.completedAt ? `${formatDate(progress.completedAt)} 완료` : '완료'}
            </p>
            {progress?.moodBefore !== undefined && progress.moodAfter !== undefined && (
              <p className="text-sm text-night-sub">
                기분 <span className="tabular-nums text-night-text">{progress.moodBefore}</span> →{' '}
                <span className="tabular-nums text-night-text">{progress.moodAfter}</span>
                <span className="sr-only"> (하기 전 → 한 후)</span>
              </p>
            )}
            {progress?.reflection && (
              <p className="whitespace-pre-line rounded-xl bg-night-bg/70 px-4 py-3 text-sm text-night-text">
                <span className="sr-only">{mission.kind === '현실' ? '한 줄 소감: ' : '연습 기록: '}</span>
                {progress.reflection}
              </p>
            )}
            {repeats.length > 0 && (
              <details className="rounded-xl border border-night-line px-4 py-2 text-sm">
                <summary className="cursor-pointer text-night-text">한 번 더 해본 기록 {repeats.length}번</summary>
                <ol className="mt-2 space-y-2 pb-1">
                  {[...repeats].reverse().map((r) => (
                    <li key={r.at} className="text-night-sub">
                      <span className="text-xs">{formatDate(r.at)}</span>
                      {r.moodBefore !== undefined && r.moodAfter !== undefined && (
                        <span className="ml-2 text-xs">
                          기분 {r.moodBefore} → {r.moodAfter}
                        </span>
                      )}
                      {r.reflection && <p className="mt-0.5 whitespace-pre-line text-night-text">{r.reflection}</p>}
                    </li>
                  ))}
                </ol>
              </details>
            )}
            {mission.kind === '연습' && mission.to && (
              <Link to={mission.to} className="inline-flex items-center gap-1.5 text-sm text-night-star underline-offset-4 hover:underline">
                한 번 더 해보기
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            )}
            {mission.kind === '현실' &&
              (repeating ? (
                <div className="border-t border-night-line pt-3">
                  <p className="mb-2 text-sm text-night-text">한 번 더 해본 기록</p>
                  <RealForm
                    mission={mission}
                    submitLabel="한 번 더 기록하기"
                    onSubmit={(t, mood) => {
                      onUpdate('complete', t, mood);
                      setRepeating(false);
                    }}
                    onCancel={() => setRepeating(false)}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setRepeating(true)}
                  className="inline-flex items-center gap-1.5 text-sm text-night-star underline-offset-4 hover:underline"
                >
                  <RotateCcw aria-hidden="true" className="h-4 w-4" />
                  한 번 더 해보기
                </button>
              ))}
          </div>
        ) : status === '다음 항해로' ? (
          <div className="space-y-3">
            <p className="flex items-center gap-1.5 text-sm text-night-sub">
              <CornerDownRight aria-hidden="true" className="h-4 w-4" />
              다음 항해 때 이어서 하기로 했어. 괜찮아.
            </p>
            <button
              type="button"
              onClick={() => onUpdate('resume')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-night-line px-4 py-2 text-sm text-night-text hover:bg-night-line/50"
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              지금 이어서 하기
            </button>
          </div>
        ) : mission.kind === '연습' ? (
          <div className="space-y-3">
            {AUTO_HINT[mission.id] && <p className="text-xs text-night-sub">{AUTO_HINT[mission.id]}</p>}
            <div className="flex flex-wrap gap-2">
              {mission.to && (
                <Link
                  to={mission.to}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-night-star px-5 py-2.5 font-medium text-night-bg hover:brightness-105"
                >
                  바로 하러 가기
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              )}
              <LaterButton onClick={() => onUpdate('later')} />
            </div>
          </div>
        ) : (
          <RealForm
            mission={mission}
            submitLabel="해봤어"
            onSubmit={(t, mood) => onUpdate('complete', t, mood)}
            onLater={() => onUpdate('later')}
          />
        )}
      </div>
    </li>
  );
}

/** 현실 미션 기록 칸: (기분 기록 미션이면 하기 전·한 후 기분) + 한 줄 소감(필수) */
function RealForm({
  mission,
  submitLabel,
  onSubmit,
  onLater,
  onCancel,
}: {
  mission: Mission;
  submitLabel: string;
  onSubmit: (reflection: string, mood?: Mood) => void;
  onLater?: () => void;
  onCancel?: () => void;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [moodBefore, setMoodBefore] = useState(3);
  const [moodAfter, setMoodAfter] = useState(5);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fieldId = `reflection-${mission.id}-${onCancel ? 'again' : 'first'}`;

  const submit = () => {
    const t = text.trim();
    if (!t) {
      setError('한 줄 소감을 남겨야 완료로 기록돼.');
      inputRef.current?.focus();
      return;
    }
    onSubmit(t, mission.recordMood ? { moodBefore, moodAfter } : undefined);
    setText('');
    setError('');
  };

  return (
          <form
            noValidate
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            {mission.recordMood && (
              <div className="mb-3 space-y-3 rounded-2xl bg-night-bg/60 p-4">
                <IntensitySlider
                  label="하기 전 기분"
                  value={moodBefore}
                  onChange={setMoodBefore}
                  color={MOOD_COLOR}
                  minLabel="0 아주 안 좋음"
                  maxLabel="10 아주 좋음"
                />
                <IntensitySlider
                  label="한 후 기분"
                  value={moodAfter}
                  onChange={setMoodAfter}
                  color={MOOD_COLOR}
                  minLabel="0 아주 안 좋음"
                  maxLabel="10 아주 좋음"
                />
                <p className="text-xs text-night-sub">기분이 그대로였어도 괜찮아. 해본 것 자체가 기록이야.</p>
              </div>
            )}
            <label htmlFor={fieldId} className="block text-sm text-night-text">
              해보고 나서 한 줄 소감 <span className="text-night-star">(꼭 적어 줘)</span>
            </label>
            <textarea
              id={fieldId}
              ref={inputRef}
              rows={2}
              value={text}
              maxLength={REFLECTION_MAX}
              required
              aria-required="true"
              aria-invalid={Boolean(error)}
              aria-describedby={`${fieldId}-help`}
              onChange={(e) => {
                setText(e.target.value.slice(0, REFLECTION_MAX));
                if (error) setError('');
              }}
              className={`w-full resize-none rounded-xl border bg-night-bg px-3 py-2 text-sm text-night-text outline-none focus:border-night-star ${
                error ? 'border-emo-hot' : 'border-night-line'
              }`}
            />
            <div id={`${fieldId}-help`} className="flex items-start justify-between gap-3">
              {error ? (
                <p role="alert" className="text-xs text-emo-hot">
                  {error}
                </p>
              ) : (
                <VisibleToCounselor />
              )}
              <span className="shrink-0 text-xs tabular-nums text-night-sub">
                {text.length} / {REFLECTION_MAX}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={!text.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-night-star px-5 py-2.5 font-medium text-night-bg hover:brightness-105 disabled:cursor-not-allowed disabled:bg-night-line disabled:text-night-sub"
              >
                <Check aria-hidden="true" className="h-4 w-4" />
                {submitLabel}
              </button>
              {onLater && <LaterButton onClick={onLater} />}
              {onCancel && (
                <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2.5 text-sm text-night-sub hover:text-night-text">
                  취소
                </button>
              )}
            </div>
          </form>
  );
}

function LaterButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl border border-night-line px-4 py-2.5 text-sm text-night-text hover:bg-night-line/50"
    >
      <CornerDownRight aria-hidden="true" className="h-4 w-4" />
      다음 항해로
    </button>
  );
}

/** 별빛 행성: 처음에 했던 척도를 한 번 더 (사후) */
function PostAssessment() {
  const { db } = useApp();
  const student = useCurrentStudent()!;
  const done = db.assessments.find((a) => a.studentId === student.id && a.timing === '사후');
  const [open, setOpen] = useState(false);
  return (
    <section aria-labelledby="post-heading" className="rounded-3xl border border-night-line bg-night-card p-6">
      <h2 id="post-heading" className="font-sans text-lg font-medium text-night-text">
        도착 마음 점검
      </h2>
      {done ? (
        <p className="mt-1 text-sm text-night-sub">{formatDate(done.takenAt)}에 마쳤어. 출발할 때와 비교한 결과는 상담 선생님과 함께 볼 수 있어.</p>
      ) : open ? (
        <div className="mt-4">
          <AssessmentForm timing="사후" onDone={() => setOpen(false)} />
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-night-sub">출발할 때 했던 마음 점검을 한 번 더 해 보자. 그동안의 항해를 돌아보는 데 쓰여.</p>
          <button type="button" onClick={() => setOpen(true)} className="mt-4 rounded-xl bg-night-star px-5 py-2.5 font-medium text-night-bg hover:brightness-105">
            도착 마음 점검 시작
          </button>
        </>
      )}
    </section>
  );
}

export default function PlanetMissionsPage() {
  const { db, updateDb } = useApp();
  const student = useCurrentStudent()!;
  const id = Number(useParams().planetId);
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);
  if (!PLANETS.some((p) => p.id === id)) return <Navigate to="/student/map" replace />;

  const planet = planetById(id);
  const status = planetStatus(db, student, id);
  const open = isPlanetOpen(student, id);
  const found = hasDiscovery(db, student.id, id);
  const required = requiredMissions(db, student.id, id).length;
  const done = completedCount(db, student.id, id);
  const missions = missionsOfPlanet(id);

  const update = (missionId: string, action: 'complete' | 'later' | 'resume', reflection?: string, mood?: Mood) =>
    updateDb((d) => {
      if (action === 'complete') return completeMission(d, student.id, missionId, reflection, mood);
      return setProgress(d, student.id, missionId, { status: action === 'later' ? '다음 항해로' : '대기' });
    });

  return (
    <div className="space-y-8">
      <Link to="/student/map" className="inline-flex items-center gap-1.5 text-sm text-night-sub hover:text-night-text">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        항해 지도
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="flex items-center gap-2 text-sm text-night-sub">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: planet.color }} />
            {sessionOfPlanet(planet.id)}회기 · UP-A {planet.upaModule} · {STATUS_LABEL[status]}
          </p>
          <h1 className="mt-1 text-3xl text-night-text">{planet.name}</h1>
          <p className="mt-2 max-w-2xl leading-relaxed text-night-sub">{planetIntro(planet.id)}</p>
        </div>
      </header>

      <section
        aria-labelledby="discovery-title"
        className="flex items-center gap-[4%] rounded-3xl border p-6"
        style={{
          borderColor: found ? planet.color : '#222A55',
          background: found ? `radial-gradient(circle at 12% 50%, ${planet.color}33 0%, #151B3A 55%)` : '#151B3A',
        }}
      >
        <div className={`aspect-square w-[18%] min-w-[5rem] max-w-[8rem] shrink-0 ${found ? '' : 'opacity-30 grayscale'}`}>
          {open ? (
            <DiscoveryArt planetId={planet.id} sparkle={found} />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-dashed border-night-line font-display text-4xl text-night-line">
              ?
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1" aria-live="polite">
          <h2 id="discovery-title" className="font-sans text-sm text-night-sub">
            이 행성의 발견물
          </h2>
          <p className="mt-1 font-display text-2xl text-night-text">{found ? planet.discoveryName : open ? `${planet.discoveryName}를 찾는 중` : '???'}</p>
          {open && (
            <>
              <div className="mt-3 flex items-center gap-3">
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={required}
                  aria-valuenow={done}
                  aria-label="발견물 진행"
                  className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-night-line"
                >
                  <div className="h-full rounded-full" style={{ width: `${(done / required) * 100}%`, backgroundColor: planet.color }} />
                </div>
                <span className="text-sm tabular-nums text-night-text">
                  {done} / {required}
                </span>
              </div>
              <p className="mt-2 text-sm text-night-sub">
                {found ? (
                  <>
                    발견했어!{' '}
                    <Link to="/student/codex" className="text-night-star underline underline-offset-4">
                      탐사 도감
                    </Link>
                    에 카드가 담겼어.
                  </>
                ) : (
                  '아래 미션을 모두 하면 발견물 카드가 도감에 담겨.'
                )}
              </p>
            </>
          )}
        </div>
      </section>

      <section aria-labelledby="missions-title">
        <h2 id="missions-title" className="sr-only">
          행성 미션
        </h2>
        {/* 미션 수(2개 또는 3개)만큼 같은 너비로 나란히 */}
        <ul className="grid items-stretch gap-[2.5%]" style={{ gridTemplateColumns: `repeat(${missions.length}, minmax(0, 1fr))` }}>
          {missions.map((m) => (
            <MissionCard
              key={m.id}
              mission={m}
              progress={progressOf(db, student.id, m.id)}
              open={open}
              off={isMissionOff(student, m.id)}
              compact={missions.length > 2}
              onUpdate={(action, reflection, mood) => update(m.id, action, reflection, mood)}
            />
          ))}
        </ul>
        <p className="mt-4 text-sm text-night-sub">못 한 미션은 "다음 항해로" 넘겨도 괜찮아. 감점은 없어.</p>
      </section>

      {/* 첫불 행성: 힘들 때 연락할 사람 1~3명 등록 */}
      {id === 1 && open && (
        <section id="contacts" aria-labelledby="contacts-heading" className="scroll-mt-8 rounded-3xl border border-night-line bg-night-card p-6">
          <h2 id="contacts-heading" className="font-sans text-lg font-medium text-night-text">
            힘들 때 연락할 사람
          </h2>
          <p className="mt-1 text-sm text-night-sub">
            마음이 많이 셀 때 떠올릴 사람을 1~3명 적어 둬. 위험해 보이는 신호가 있을 때 도움 안내와 함께 보여줄게.
          </p>
          <div className="mt-4">
            <TrustedContactsEditor />
          </div>
          <div className="mt-3">
            <VisibleToCounselor />
          </div>
        </section>
      )}

      {/* 별빛 행성(8회기): 마무리 정서조절 척도 (사후) */}
      {id === 6 && open && <PostAssessment />}
    </div>
  );
}
