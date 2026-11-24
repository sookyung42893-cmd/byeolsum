import { useId, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Moon, Pencil, RotateCcw, Sparkles, Telescope, Trash2 } from 'lucide-react';
import BodyMap from '../../components/BodyMap';
import { VisibleToCounselor } from './PlanetMissions';
import { askConfirm } from '../../lib/confirm';
import { ArrivedLetter, LETTER_ARRIVAL_INTENSITY, letterFor } from './Letters';
import { useApp, useCurrentStudent } from '../../context/AppContext';
import { QUADRANTS, describePoint, emotionLabel, findBroad, quadrantOf, type Quadrant } from '../../data/emotions';
import { newId } from '../../lib/auth';
import { formatDateTime } from '../../lib/dates';
import { deleteCheckInConfirm, removeCheckIn, replaceCheckIn } from '../../lib/mutations';
import Chip from '../../components/Chip';
import IntensitySlider from '../../components/IntensitySlider';
import type { BodyPart, CheckIn } from '../../types';
import { BODY_MAP_PLANET } from '../../data/planets';
import { isPlanetOpen } from '../../lib/voyage';

/** 평면의 viewBox 크기 (그리기 단위일 뿐, 실제 화면 크기와는 무관) */
const SIZE = 520;
const clamp = (n: number) => Math.max(-1, Math.min(1, Math.round(n * 100) / 100));
const toX = (v: number) => ((v + 1) / 2) * SIZE;
const toY = (a: number) => ((1 - a) / 2) * SIZE;

/** 사분면 배경 위치 (좌상단 기준) */
const QUAD_RECT: Record<Quadrant, { x: number; y: number }> = {
  hot: { x: 0, y: 0 },
  joy: { x: SIZE / 2, y: 0 },
  low: { x: 0, y: SIZE / 2 },
  calm: { x: SIZE / 2, y: SIZE / 2 },
};

function EmotionPlane({
  point,
  intensity,
  onChange,
}: {
  point: { v: number; a: number } | null;
  intensity: number;
  onChange: (v: number, a: number) => void;
}) {
  const helpId = useId();
  const handleClick = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onChange(((e.clientX - rect.left) / rect.width) * 2 - 1, 1 - ((e.clientY - rect.top) / rect.height) * 2);
  };
  const handleKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const step = e.shiftKey ? 0.25 : 0.1;
    const cur = point ?? { v: 0, a: 0 };
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    onChange(cur.v + m[0], cur.a + m[1]);
  };

  const q = point ? quadrantOf(point.v, point.a) : null;
  const color = q ? QUADRANTS[q].color : '#F4C979';
  const r = 7 + intensity * 0.9;

  return (
    <div className="grid grid-cols-[auto_1fr_auto] grid-rows-[auto_1fr_auto] items-center gap-2 text-sm text-night-sub">
      <span className="col-start-2 text-center">에너지 높음</span>
      <span className="row-start-2">불쾌</span>
      {/* 사분면 이름은 SVG가 줄어들어도 글자가 작아지지 않게 HTML로 얹는다 (최소 11px) */}
      <div className="relative row-start-2">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="block w-full cursor-crosshair rounded-2xl border border-night-line bg-night-card"
        role="application"
        aria-label="감정 좌표 평면"
        aria-describedby={helpId}
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKey}
      >
        <defs>
          <filter id="plane-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>
        {(Object.keys(QUAD_RECT) as Quadrant[]).map((k) => (
          <g key={k}>
            <rect
              x={QUAD_RECT[k].x}
              y={QUAD_RECT[k].y}
              width={SIZE / 2}
              height={SIZE / 2}
              fill={QUADRANTS[k].color}
              opacity={q === k ? 0.14 : 0.06}
            />
          </g>
        ))}
        <line x1={SIZE / 2} y1={0} x2={SIZE / 2} y2={SIZE} stroke="#222A55" strokeWidth="1.5" />
        <line x1={0} y1={SIZE / 2} x2={SIZE} y2={SIZE / 2} stroke="#222A55" strokeWidth="1.5" />
        {point && (
          <g pointerEvents="none">
            <circle cx={toX(point.v)} cy={toY(point.a)} r={r * 2} fill={color} opacity={0.35} filter="url(#plane-glow)" />
            <circle cx={toX(point.v)} cy={toY(point.a)} r={r} fill={color} />
            <circle cx={toX(point.v)} cy={toY(point.a)} r={r * 0.35} fill="#FFFFFF" opacity={0.8} />
          </g>
        )}
      </svg>
      {(Object.keys(QUAD_RECT) as Quadrant[]).map((k) => (
        <span
          key={k}
          aria-hidden="true"
          className={`pointer-events-none absolute text-[11px] font-medium leading-tight sm:text-[13px] ${k === 'hot' || k === 'joy' ? 'top-2' : 'bottom-2'} ${k === 'hot' || k === 'low' ? 'left-2.5' : 'right-2.5 text-right'}`}
          style={{ color: QUADRANTS[k].color }}
        >
          {QUADRANTS[k].label}
        </span>
      ))}
      </div>
      <span className="row-start-2">유쾌</span>
      <span className="col-start-2 text-center">에너지 낮음</span>
      <p id={helpId} className="col-span-3 mt-2 text-center text-xs" aria-live="polite">
        {point
          ? `지금 찍은 곳: ${describePoint(point.v, point.a)}`
          : '마음이 있는 곳을 눌러서 점을 찍어봐. 방향키로도 옮길 수 있어 (Shift를 누르면 크게).'}
      </p>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`step-${n}`}>
      <h2 id={`step-${n}`} className="mb-3 font-sans text-base font-medium text-night-text">
        <span className="mr-2 text-night-star">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** ?edit=<체크인 id>로 들어오면 그 기록을 고치는 화면이 된다 */
export default function CheckInPage() {
  const { db } = useApp();
  const student = useCurrentStudent()!;
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const target = db.checkIns.find((c) => c.id === editId && c.studentId === student.id);
  // 새로 찍기 ↔ 고치기 사이를 오가면 폼 상태를 새로 시작한다
  return <CheckInForm key={target?.id ?? 'new'} editTarget={target} />;
}

/** 세부 감정이 목록에 없는 말(직접 적은 말)인지 */
function isCustomWord(c: CheckIn): boolean {
  if (c.emotionWord === c.broadEmotion) return false;
  return !findBroad(c.broadEmotion)?.broad.fine.includes(c.emotionWord);
}

function CheckInForm({ editTarget }: { editTarget?: CheckIn }) {
  const { db, updateDb } = useApp();
  const student = useCurrentStudent()!;
  const navigate = useNavigate();
  const [point, setPoint] = useState<{ v: number; a: number } | null>(
    editTarget ? { v: editTarget.valence, a: editTarget.arousal } : null,
  );
  const [broad, setBroad] = useState<string | null>(editTarget?.broadEmotion ?? null);
  const [fine, setFine] = useState<string | null>(
    editTarget && editTarget.emotionWord !== editTarget.broadEmotion ? editTarget.emotionWord : null,
  );
  const [intensity, setIntensity] = useState(editTarget?.intensity ?? 5);
  const [situation, setSituation] = useState(editTarget?.situation ?? '');
  const [body, setBody] = useState<BodyPart | null>(editTarget?.bodyLocation ?? null);
  /** 몸 지도는 두근 행성이 열리면 쓸 수 있다 */
  const bodyOpen = isPlanetOpen(student, BODY_MAP_PLANET);
  const [saved, setSaved] = useState<CheckIn | null>(null);
  /** 고치는 중인 기록 (밤하늘에서 들어왔거나, 저장 직후 '고치기'를 눌렀을 때) */
  const [editing, setEditing] = useState<CheckIn | null>(editTarget ?? null);
  const [justEdited, setJustEdited] = useState(false);
  /** 강도 8 이상으로 띄우면, 괜찮을 때 써 둔 별빛편지 하나가 도착한다 */
  const arrived = saved ? letterFor(db, student.id, saved.id) : undefined;
  /** '직접 적기'로 목록에 없는 세부 감정을 쓰는 중인지 */
  const [customOpen, setCustomOpen] = useState(() => (editTarget ? isCustomWord(editTarget) : false));
  const [customText, setCustomText] = useState(() => (editTarget && isCustomWord(editTarget) ? editTarget.emotionWord : ''));

  const loadFrom = (c: CheckIn) => {
    setPoint({ v: c.valence, a: c.arousal });
    setBroad(c.broadEmotion);
    setFine(c.emotionWord !== c.broadEmotion ? c.emotionWord : null);
    setCustomOpen(isCustomWord(c));
    setCustomText(isCustomWord(c) ? c.emotionWord : '');
    setIntensity(c.intensity);
    setSituation(c.situation);
    setBody(c.bodyLocation ?? null);
  };

  const quadrant = point ? quadrantOf(point.v, point.a) : null;
  const info = quadrant ? QUADRANTS[quadrant] : null;
  const broadInfo = info?.broads.find((b) => b.name === broad);

  const placePoint = (v: number, a: number) => {
    if (saved) return;
    const next = { v: clamp(v), a: clamp(a) };
    // 다른 사분면으로 옮기면 고른 감정은 맞지 않으니 비운다
    if (!quadrant || quadrantOf(next.v, next.a) !== quadrant) {
      setBroad(null);
      setFine(null);
      setCustomOpen(false);
      setCustomText('');
    }
    setPoint(next);
  };

  const save = () => {
    if (!point || !broad) return;
    const fields = {
      valence: point.v,
      arousal: point.a,
      broadEmotion: broad,
      emotionWord: fine ?? broad,
      bodyLocation: bodyOpen ? (body ?? undefined) : editing?.bodyLocation,
      intensity,
      situation: situation.trim(),
    };
    if (editing) {
      const next: CheckIn = { ...editing, ...fields };
      updateDb((db) => replaceCheckIn(db, next));
      setSaved(next);
      setEditing(null);
      setJustEdited(true);
      return;
    }
    const checkIn: CheckIn = { id: newId('ci'), studentId: student.id, timestamp: new Date().toISOString(), ...fields };
    updateDb((db) => ({ ...db, checkIns: [...db.checkIns, checkIn] }));
    setSaved(checkIn);
    setJustEdited(false);
  };

  const reset = () => {
    setPoint(null);
    setBroad(null);
    setFine(null);
    setIntensity(5);
    setSituation('');
    setBody(null);
    setSaved(null);
    setEditing(null);
    setJustEdited(false);
    if (editTarget) navigate('/student/checkin');
  };

  const startEdit = (c: CheckIn) => {
    loadFrom(c);
    setEditing(c);
    setSaved(null);
  };

  const cancelEdit = () => {
    if (!editing) return;
    // 밤하늘에서 고치러 와서 아직 저장 전이면 밤하늘로, 그 밖에는 저장 결과 화면으로 돌아간다
    if (editing.id === editTarget?.id && !justEdited) {
      navigate('/student/sky');
      return;
    }
    loadFrom(editing);
    setSaved(editing);
    setEditing(null);
  };

  const remove = (c: CheckIn) => {
    void askConfirm(deleteCheckInConfirm(db, c.id), '지우기').then((ok) => {
      if (!ok) return;
      updateDb((d) => removeCheckIn(d, c.id));
      navigate('/student/sky');
    });
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl text-night-text">{editing ? '감정 좌표 고치기' : '감정 좌표 찍기'}</h1>
        <p className="mt-2 text-night-sub">
          {editing
            ? `${formatDateTime(editing.timestamp)}에 띄운 별이야. 점을 다시 찍거나 마음을 바꿔도 돼.`
            : '지금 마음이 밤하늘 어디쯤 있는지 찍어봐. 정답은 없어.'}
        </p>
      </header>

      <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-[4%]">
        <div className="w-full max-w-xl shrink-0 md:w-[46%]">
          <EmotionPlane point={point} intensity={intensity} onChange={placePoint} />
        </div>
        <div className="min-w-0 flex-1">

        {saved ? (
          <section aria-live="polite" className="self-start rounded-3xl border border-night-line bg-night-card p-8">
            <p className="text-sm text-night-sub">{justEdited ? '별을 고쳤어' : '밤하늘에 별이 하나 떴어'}</p>
            <h2 className="mt-2 text-2xl" style={{ color: QUADRANTS[quadrantOf(saved.valence, saved.arousal)].color }}>
              {emotionLabel(saved)}
            </h2>
            <p className="mt-1 text-night-sub">
              강도 {saved.intensity}
              {saved.bodyLocation && ` · ${saved.bodyLocation}에서 느낌`}
            </p>
            {saved.intensity >= LETTER_ARRIVAL_INTENSITY && !justEdited && arrived && (
              <div className="mt-6">
                <ArrivedLetter letter={arrived} />
              </div>
            )}
            {saved.intensity >= 7 && (
              <p className="mt-6 rounded-xl bg-night-bg px-4 py-3 text-sm leading-relaxed text-night-text">
                마음이 꽤 세게 느껴진다면, 별똥별 궤적을 같이 그려봐도 좋아. 1분마다 강도를 적다 보면 조금씩 옅어지는 걸
                볼 수 있어.
              </p>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/student/sky"
                className="inline-flex items-center gap-2 rounded-xl bg-night-star px-5 py-3 font-medium text-night-bg hover:brightness-105"
              >
                <Moon aria-hidden="true" className="h-4 w-4" />
                나의 밤하늘 보기
              </Link>
              {saved.intensity >= 7 ? (
                <Link
                  to={`/student/meteor?checkIn=${saved.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-emo-hot/60 px-5 py-3 text-night-text hover:bg-emo-hot/10"
                >
                  <Sparkles aria-hidden="true" className="h-4 w-4 text-emo-hot" />
                  별똥별 궤적
                </Link>
              ) : (
                <Link
                  to={`/student/telescope?checkIn=${saved.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-night-line px-5 py-3 text-night-text hover:bg-night-line/50"
                >
                  <Telescope aria-hidden="true" className="h-4 w-4 text-night-star" />
                  망원경으로 들여다보기
                </Link>
              )}
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-night-sub hover:text-night-text"
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                하나 더 찍기
              </button>
            </div>
            <div className="mt-6 flex gap-4 border-t border-night-line pt-5 text-sm">
              <span className="text-night-sub">잘못 찍었다면</span>
              <button
                type="button"
                onClick={() => startEdit(saved)}
                className="inline-flex items-center gap-1.5 text-night-text underline-offset-4 hover:underline"
              >
                <Pencil aria-hidden="true" className="h-4 w-4" />
                고치기
              </button>
              <button
                type="button"
                onClick={() => remove(saved)}
                className="inline-flex items-center gap-1.5 text-emo-hot underline-offset-4 hover:underline"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                지우기
              </button>
            </div>
          </section>
        ) : (
          <div className="space-y-8">
            <Step n={1} title="어떤 마음에 가까워?">
              {info ? (
                <div className="flex flex-wrap gap-2">
                  {info.broads.map((b) => (
                    <Chip
                      key={b.name}
                      selected={broad === b.name}
                      color={info.color}
                      onClick={() => {
                        setBroad(b.name);
                        setFine(null);
                        setCustomOpen(false);
                        setCustomText('');
                      }}
                    >
                      {b.name}
                    </Chip>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-night-sub">감정 평면에 먼저 점을 찍으면 어울리는 마음들이 떠올라.</p>
              )}
            </Step>

            {info && broadInfo && (
              <Step n={2} title={`${broadInfo.name} 안에서, 더 가까운 이름이 있을까?`}>
                <div className="flex flex-wrap gap-2">
                  {broadInfo.fine.map((f) => (
                    <Chip
                      key={f}
                      selected={!customOpen && fine === f}
                      color={info.color}
                      onClick={() => {
                        setCustomOpen(false);
                        setFine(fine === f && !customOpen ? null : f);
                      }}
                    >
                      {f}
                    </Chip>
                  ))}
                  <Chip
                    selected={customOpen}
                    color={info.color}
                    onClick={() => {
                      const open = !customOpen;
                      setCustomOpen(open);
                      setFine(open ? customText.trim() || null : null);
                    }}
                  >
                    직접 적기
                  </Chip>
                </div>
                {customOpen && (
                  <div className="mt-3">
                    <label htmlFor="custom-fine" className="mb-1.5 block text-sm text-night-text">
                      내 마음에 딱 맞는 말
                    </label>
                    <input
                      id="custom-fine"
                      autoFocus
                      maxLength={15}
                      value={customText}
                      onChange={(e) => {
                        setCustomText(e.target.value);
                        setFine(e.target.value.trim() || null);
                      }}
                      className="w-full max-w-xs rounded-xl border border-night-line bg-night-bg px-4 py-2.5 text-night-text outline-none focus:border-night-star"
                    />
                  </div>
                )}
                <p className="mt-2 text-xs text-night-sub">딱 맞는 게 없으면 직접 적거나, 고르지 않아도 괜찮아.</p>
              </Step>
            )}

            <Step n={broadInfo ? 3 : 2} title="몸 어디에서 느껴져?">
              {bodyOpen ? (
                <>
                  <BodyMap value={body} onChange={setBody} color={info?.color ?? '#F4C979'} />
                  <p className="mt-2 text-xs text-night-sub">잘 모르겠으면 고르지 않아도 괜찮아. 다시 누르면 선택이 풀려.</p>
                </>
              ) : (
                <p className="flex items-center gap-2 rounded-xl border border-dashed border-night-line px-4 py-3 text-sm text-night-sub">
                  <Lock aria-hidden="true" className="h-4 w-4 shrink-0" />
                  몸 지도는 두근 행성({BODY_MAP_PLANET}회기)에 도착하면 열려.
                </p>
              )}
            </Step>

            <Step n={broadInfo ? 4 : 3} title="얼마나 세게 느껴져?">
              <IntensitySlider
                label="감정 강도 (0~10)"
                hideLabel
                value={intensity}
                onChange={setIntensity}
                color={info?.color}
              />
            </Step>

            <Step n={broadInfo ? 5 : 4} title="어떤 일이 있었어?">
              <label htmlFor="situation" className="sr-only">
                상황 메모
              </label>
              <textarea
                id="situation"
                rows={3}
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                className="w-full resize-none rounded-xl border border-night-line bg-night-bg px-4 py-3 text-night-text outline-none focus:border-night-star"
              />
              <p className="mt-1 text-xs text-night-sub">꼭 적어 줘. 짧게 적어도 돼. 나중에 망원경으로 다시 볼 수 있어.</p>
              <div className="mt-1">
                <VisibleToCounselor />
              </div>
            </Step>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={save}
                  disabled={!point || !broad || !situation.trim()}
                  className="rounded-xl bg-night-star px-6 py-3 font-medium text-night-bg transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-night-line disabled:text-night-sub"
                >
                  {editing ? '고친 대로 저장' : '밤하늘에 띄우기'}
                </button>
                {editing && (
                  <>
                    <button type="button" onClick={cancelEdit} className="rounded-xl px-5 py-3 text-night-sub hover:text-night-text">
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(editing)}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-4 py-3 text-sm text-emo-hot hover:bg-emo-hot/10"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                      이 별 지우기
                    </button>
                  </>
                )}
              </div>
              {(!point || !broad) && (
                <p className="mt-2 text-xs text-night-sub">점을 찍고 마음 하나를 고르면 띄울 수 있어.</p>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
