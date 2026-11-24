import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Square, Timer, Volume2, VolumeX } from 'lucide-react';
import { createAmbient, loadMusicPref, saveMusicPref } from '../../lib/ambient';
import { useApp, useCurrentStudent } from '../../context/AppContext';
import { emotionLabel } from '../../data/emotions';
import { checkInsOf } from '../../lib/selectors';
import { HOUR, MINUTE } from '../../lib/dates';
import { newId } from '../../lib/auth';
import IntensitySlider from '../../components/IntensitySlider';
import { SparkleStar, sparklePath } from '../../components/Sparkle';
import type { MeteorReading, MeteorSession, StrategyUse } from '../../types';

const W = 760;
const H = 340;
const PAD = 36;

const DUST = (() => {
  let s = 99;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: 60 }, () => ({ x: rand() * W, y: rand() * H, r: 0.4 + rand() * 0.8, o: 0.1 + rand() * 0.25 }));
})();

/** 정점과, 정점 이후 처음으로 절반 이하가 된 기록 */
function halfLife(readings: MeteorReading[]) {
  if (readings.length === 0) return null;
  let peakIdx = 0;
  readings.forEach((r, i) => {
    if (r.intensity > readings[peakIdx].intensity) peakIdx = i;
  });
  const peak = readings[peakIdx];
  const half = readings.slice(peakIdx + 1).find((r) => r.intensity <= peak.intensity / 2);
  return { peak, minutes: half ? half.minute - peak.minute : null };
}

interface Particle {
  id: number;
  /** 생긴 자리 (분, 강도) — 머리가 앞으로 날아가면 뒤에 남아 꼬리 가루가 된다 */
  m: number;
  i: number;
  /** 처음 속도 (px/초). vy가 양수면 아래로 */
  vx: number;
  vy: number;
  r: number;
  born: number;
  white: boolean;
  /** true면 작은 반짝이 별, false면 동그란 가루 */
  sparkle: boolean;
}

const PARTICLE_LIFE = 2800;
/** 별가루가 아래로 내려앉는 가속도 (px/초²) — 눈처럼 아주 천천히 */
const GRAVITY = 6;

/**
 * 별똥별 궤적. 진행 중(live)에는 머리가 시간에 맞춰 계속 오른쪽으로 날아가고,
 * 강도를 기록하면 그 높이로 부드럽게 옮겨간다. 지나온 꼬리와 반짝이 가루는 점점 흐려진다.
 */
function MeteorTrail({ readings, startedAt, live }: { readings: MeteorReading[]; startedAt: number; live: boolean }) {
  const last = readings[readings.length - 1];
  const lastMinute = last?.minute ?? 0;
  const lastIntensity = last?.intensity ?? 0;

  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [, setTick] = useState(0);
  const target = useRef(lastIntensity);
  target.current = lastIntensity;
  const frame = useRef({ headI: lastIntensity, particles: [] as Particle[], lastSpawn: 0, nextId: 0 });

  useEffect(() => {
    if (!live) return;
    let raf = 0;
    const loop = () => {
      const now = Date.now();
      const f = frame.current;
      f.headI = reduced ? target.current : f.headI + (target.current - f.headI) * 0.08;
      f.particles = f.particles.filter((p) => now - p.born < PARTICLE_LIFE);
      if (!reduced && now - f.lastSpawn > 70) {
        f.lastSpawn = now;
        const sparkle = Math.random() < 0.35;
        f.particles.push({
          id: f.nextId++,
          m: (now - startedAt) / MINUTE,
          i: f.headI + (Math.random() - 0.5) * 0.3,
          vx: -(2 + Math.random() * 6),
          vy: 2 + Math.random() * 5,
          r: sparkle ? 3 + Math.random() * 3 : 0.6 + Math.random() * 0.9,
          born: now,
          white: true,
          sparkle,
        });
      }
      setTick(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [live, startedAt, reduced]);

  const now = Date.now();
  const headM = live ? Math.max(lastMinute, (now - startedAt) / MINUTE) : lastMinute;
  const headI = live ? frame.current.headI : lastIntensity;
  // 머리가 오른쪽 끝에 닿기 전에 화면이 천천히 넓어진다
  const span = Math.max(10, lastMinute + 1, headM * 1.15);
  const toX = (m: number) => PAD + (m / span) * (W - 2 * PAD);
  const toY = (v: number) => PAD + (1 - v / 10) * (H - 2 * PAD);
  const hl = halfLife(readings);

  const pts = readings.map((r) => ({ m: r.minute, i: r.intensity }));
  if (live) pts.push({ m: headM, i: headI });
  const hx = toX(headM);
  const hy = toY(headI);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block w-full rounded-3xl border border-night-line bg-[radial-gradient(ellipse_at_top_right,#18204A_0%,#0B1026_70%)]"
      role="img"
      aria-label={`별똥별 궤적: ${readings.map((r) => `${r.minute}분 ${r.intensity}`).join(', ')}`}
    >
      <defs>
        <filter id="meteor-glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id="meteor-dust-glow" x="-300%" y="-300%" width="700%" height="700%">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>
      {DUST.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#EEF0FF" opacity={d.o} />
      ))}
      <g fill="#A9B0D6" fontSize="11">
        {[10, 5, 0].map((v) => (
          <text key={v} x={10} y={toY(v) + 4}>
            {v}
          </text>
        ))}
        <text x={W - PAD} y={H - 10} textAnchor="end">
          {Math.round(span)}분
        </text>
        <text x={PAD} y={H - 10}>
          시작
        </text>
      </g>
      {hl && hl.peak.intensity >= 2 && (
        <g>
          <line
            x1={PAD}
            x2={W - PAD}
            y1={toY(hl.peak.intensity / 2)}
            y2={toY(hl.peak.intensity / 2)}
            stroke="#222A55"
            strokeDasharray="3 6"
          />
          <text x={W - PAD} y={toY(hl.peak.intensity / 2) - 6} textAnchor="end" fill="#A9B0D6" fontSize="11">
            정점의 절반
          </text>
        </g>
      )}

      {/* 꼬리 전체에 은은한 빛 */}
      <polyline
        points={pts.map((p) => `${toX(p.m)},${toY(p.i)}`).join(' ')}
        fill="none"
        stroke="#F4C979"
        strokeWidth={4}
        strokeOpacity={0.05}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#meteor-glow)"
      />
      {pts.slice(1).map((p, i) => {
        const prev = pts[i];
        const age = pts.length - 2 - i; // 0 = 머리와 가장 가까운 구간
        return (
          <line
            key={i}
            x1={toX(prev.m)}
            y1={toY(prev.i)}
            x2={toX(p.m)}
            y2={toY(p.i)}
            stroke={age === 0 ? '#FFFFFF' : '#F4C979'}
            strokeWidth={Math.max(0.6, 1.8 - age * 0.3)}
            strokeOpacity={Math.max(0.06, 0.4 - age * 0.08)}
            strokeLinecap="round"
          />
        );
      })}

      {/* 기록한 자리마다 작은 반짝이 */}
      {readings.slice(0, live ? undefined : -1).map((r, i, arr) => (
        <SparkleStar
          key={r.minute}
          cx={toX(r.minute)}
          cy={toY(r.intensity)}
          r={22}
          color={i % 2 ? '#F4C979' : '#FFFFFF'}
          glow={0.6}
          opacity={Math.max(0.2, 0.9 - (arr.length - 1 - i) * 0.1)}
        />
      ))}

      {/* 머리에서 흩어져 아래로 떨어지는 별가루 */}
      {live &&
        frame.current.particles.map((p) => {
          const age = (now - p.born) / PARTICLE_LIFE;
          const t = (now - p.born) / 1000;
          // 좌우로 살랑이며 천천히 내려앉는다
          const x = toX(p.m) + p.vx * t + Math.sin(t * 2.2 + p.id) * 2;
          const y = toY(p.i) + p.vy * t + 0.5 * GRAVITY * t * t;
          const fill = p.white ? '#FFFFFF' : '#F4C979';
          // 처음엔 살짝 밝아졌다가 부드럽게 사라진다
          const fade = Math.min(1, age * 6) * (1 - age);
          // 가루마다 다른 박자로 깜빡깜빡 반짝인다
          const flicker = 0.35 + 0.65 * Math.abs(Math.sin(t * 7 + p.id * 1.7));
          const o = fade * flicker;
          return p.sparkle ? (
            <g key={p.id} opacity={o}>
              <circle cx={x} cy={y} r={p.r * 0.6} fill={fill} opacity={0.35} filter="url(#meteor-dust-glow)" />
              <path d={sparklePath(x, y, p.r * (0.7 + 0.3 * flicker), 0.06)} fill={fill} />
            </g>
          ) : (
            <g key={p.id} opacity={o}>
              <circle cx={x} cy={y} r={p.r * 2.2} fill={fill} opacity={0.3} filter="url(#meteor-dust-glow)" />
              <circle cx={x} cy={y} r={p.r} fill={fill} />
            </g>
          );
        })}

      {/* 머리: 네 갈래로 반짝이는 별 */}
      {last && (
        <g>
          <circle cx={hx} cy={hy} r={24} fill="#F4C979" opacity={0.3} filter="url(#meteor-glow)" />
          <SparkleStar cx={hx} cy={hy} r={44} color="#FFE7B0" twinkle />
        </g>
      )}
    </svg>
  );
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const mmss = (ms: number) => `${Math.floor(ms / MINUTE)}:${pad2(Math.floor((ms % MINUTE) / 1000))}`;

export default function MeteorPage() {
  const { db, updateDb } = useApp();
  const student = useCurrentStudent()!;
  const [params] = useSearchParams();

  // 연결할 체크인: 링크로 넘어온 기록, 없으면 최근 1시간 안의 기록 (화면에 들어올 때 한 번만 정한다)
  const [linked] = useState(() => {
    const list = checkInsOf(db, student.id);
    const byParam = list.find((c) => c.id === params.get('checkIn'));
    if (byParam) return byParam;
    const last = list[list.length - 1];
    return last && Date.now() - new Date(last.timestamp).getTime() <= HOUR ? last : undefined;
  });

  const [phase, setPhase] = useState<'ready' | 'running' | 'done'>('ready');
  const [startIntensity, setStartIntensity] = useState(linked?.intensity ?? 8);
  const [withForecast, setWithForecast] = useState(false);
  const [forecast, setForecast] = useState(Math.max(0, (linked?.intensity ?? 8) - 3));
  const [session, setSession] = useState<MeteorSession | null>(null);
  const [now, setNow] = useState(Date.now());

  // 배경 음악: 관측 중에만, 켜 두었을 때만 흐른다. 화면을 떠나면 멈춘다.
  const [musicOn, setMusicOn] = useState(loadMusicPref);
  const ambient = useRef<ReturnType<typeof createAmbient> | null>(null);
  if (!ambient.current) ambient.current = createAmbient();
  useEffect(() => () => ambient.current?.stop(), []);
  const toggleMusic = () => {
    const next = !musicOn;
    setMusicOn(next);
    saveMusicPref(next);
    if (next && phase === 'running') ambient.current!.start();
    if (!next) ambient.current!.stop();
  };

  useEffect(() => {
    if (phase !== 'running') return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [phase]);

  // 기록할 때마다 바로 저장해서, 중간에 화면을 떠나도 남는다
  const writeSession = (next: MeteorSession) => {
    setSession(next);
    updateDb((d) => ({
      ...d,
      meteorSessions: d.meteorSessions.some((s) => s.id === next.id)
        ? d.meteorSessions.map((s) => (s.id === next.id ? next : s))
        : [...d.meteorSessions, next],
    }));
  };

  const start = () => {
    const t = Date.now();
    setNow(t);
    writeSession({
      id: newId('ms'),
      studentId: student.id,
      startedAt: new Date(t).toISOString(),
      readings: [{ minute: 0, intensity: startIntensity }],
    });
    setPhase('running');
    if (musicOn) ambient.current!.start();
  };

  const elapsed = session ? Math.max(0, now - new Date(session.startedAt).getTime()) : 0;
  const currentMinute = Math.floor(elapsed / MINUTE);
  const readings = session?.readings ?? [];
  const last = readings[readings.length - 1];
  const due = phase === 'running' && last !== undefined && currentMinute > last.minute;
  const hl = halfLife(readings);

  const record = (intensity: number) => {
    if (!session || !due) return;
    writeSession({ ...session, readings: [...session.readings, { minute: currentMinute, intensity }] });
    ambient.current!.chime();
  };

  const finish = () => {
    if (session && linked && withForecast) {
      const use: StrategyUse = {
        id: newId('su'),
        checkInId: linked.id,
        strategy: '별똥별',
        predictedAfter: forecast,
        actualAfter: session.readings[session.readings.length - 1].intensity,
        createdAt: new Date().toISOString(),
      };
      updateDb((d) => ({ ...d, strategyUses: [...d.strategyUses, use] }));
    }
    ambient.current!.stop();
    setPhase('done');
  };

  const restart = () => {
    setSession(null);
    setPhase('ready');
  };

  const guide = (() => {
    if (!last || !hl) return '';
    if (last.intensity <= 3 && readings.length > 1) return '많이 옅어졌어. 원하면 여기서 끝내도 괜찮아.';
    if (hl.minutes !== null && hl.peak.intensity >= 4) return '정점에서 절반 아래로 내려왔어. 별똥별이 옅어지고 있어.';
    return '아무것도 바꾸려 하지 않아도 돼. 숨을 천천히 쉬면서 그냥 지켜보면 돼.';
  })();

  return (
    <div className="max-w-4xl">
      <header className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-3xl text-night-text">별똥별 궤적</h1>
          <p className="mt-2 font-display text-xl text-night-star">모든 별똥별은 결국 사라져</p>
        </div>
        <button
          type="button"
          onClick={toggleMusic}
          aria-pressed={musicOn}
          className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-night-line px-4 py-2 text-sm text-night-text hover:bg-night-line/50"
        >
          {musicOn ? <Volume2 aria-hidden="true" className="h-4 w-4" /> : <VolumeX aria-hidden="true" className="h-4 w-4" />}
          배경 음악 {musicOn ? '켜짐' : '꺼짐'}
        </button>
      </header>

      {phase === 'ready' && (
        <section className="space-y-6">
          <p className="max-w-2xl leading-relaxed text-night-sub">
            마음이 아주 셀 때 쓰는 곳이야. 1분마다 지금 강도를 적어보자. 적을 때마다 별똥별이 지나간 자리가 그려지고,
            지나온 꼬리는 점점 흐려져.
          </p>
          {linked && (
            <p className="text-sm text-night-sub">
              연결된 별: <span className="text-night-text">{emotionLabel(linked)}</span> (강도 {linked.intensity})
            </p>
          )}
          <div className="max-w-md rounded-2xl border border-night-line bg-night-card p-6">
            <IntensitySlider label="지금 강도는?" value={startIntensity} onChange={setStartIntensity} color="#FF8E72" />
          </div>
          {linked && (
            <div className="max-w-md">
              <label className="flex items-center gap-3 text-sm text-night-text">
                <input
                  type="checkbox"
                  checked={withForecast}
                  onChange={(e) => setWithForecast(e.target.checked)}
                  className="h-4 w-4 accent-[#F4C979]"
                />
                끝나면 몇 점쯤 될지 예보도 남길래 (선택)
              </label>
              {withForecast && (
                <div className="mt-4 rounded-2xl border border-night-line bg-night-card p-6">
                  <IntensitySlider label="끝날 때 예상 강도" value={forecast} onChange={setForecast} />
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={start}
            className="rounded-xl bg-night-star px-6 py-3 font-medium text-night-bg transition hover:brightness-105"
          >
            관측 시작
          </button>
        </section>
      )}

      {phase !== 'ready' && session && (
        <section className="space-y-6">
          <MeteorTrail readings={readings} startedAt={new Date(session.startedAt).getTime()} live={phase === 'running'} />

          {phase === 'running' && (
            <>
              <div className="flex items-center justify-between rounded-2xl border border-night-line bg-night-card px-6 py-4">
                <p className="flex items-center gap-3 text-night-text">
                  <Timer aria-hidden="true" className="h-5 w-5 text-night-star" />
                  <span className="font-display text-2xl tabular-nums" aria-label={`지난 시간 ${mmss(elapsed)}`}>
                    {mmss(elapsed)}
                  </span>
                </p>
                <p className="text-sm text-night-sub" aria-hidden={due}>
                  {due ? '' : `다음 기록까지 ${mmss(MINUTE - (elapsed % MINUTE))}`}
                </p>
              </div>

              <div aria-live="polite">
                {due ? (
                  <fieldset className="rounded-2xl border border-night-star/60 bg-night-card p-6">
                    <legend className="px-2 text-night-text">{currentMinute}분이 지났어. 지금 강도는?</legend>
                    <div className="mt-2 grid grid-cols-6 gap-2 sm:grid-cols-11">
                      {Array.from({ length: 11 }, (_, n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => record(n)}
                          aria-label={`강도 ${n}`}
                          className="rounded-xl border border-night-line bg-night-bg py-3 font-display text-lg text-night-text transition hover:border-night-star hover:bg-night-star/10"
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ) : (
                  <p className="px-1 text-night-text">{guide}</p>
                )}
              </div>

              <button
                type="button"
                onClick={finish}
                className="inline-flex items-center gap-2 rounded-xl border border-night-line px-5 py-3 text-night-text hover:bg-night-line/50"
              >
                <Square aria-hidden="true" className="h-4 w-4" />
                관측 끝내기
              </button>
            </>
          )}

          {phase === 'done' && hl && last && (
            <div className="space-y-6">
              <p className="text-lg leading-relaxed text-night-text">
                정점 {hl.peak.intensity}에서 {last.intensity}까지, {last.minute}분 동안 지켜봤어.
                {hl.minutes !== null && ` 절반까지 내려오는 데 ${hl.minutes}분이 걸렸어.`}
              </p>
              <p className="text-night-sub">
                {last.intensity < hl.peak.intensity
                  ? '이번 별똥별도 조금씩 옅어졌어. 다음에 마음이 셀 때, 이 궤적을 떠올려봐.'
                  : '이번엔 아직 옅어지지 않았어. 그래도 지켜본 것 자체로 충분해. 필요하면 다시 시작해도 돼.'}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/student/sky" className="rounded-xl bg-night-star px-5 py-3 font-medium text-night-bg hover:brightness-105">
                  나의 밤하늘 보기
                </Link>
                <button type="button" onClick={restart} className="rounded-xl border border-night-line px-5 py-3 text-night-text hover:bg-night-line/50">
                  다시 시작하기
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <p className="mt-10 text-sm text-night-sub">
        혼자 버티기 너무 힘들면 지금 바로 전화해도 돼. 청소년상담 1388 · 자살예방상담 109 (24시간)
      </p>
    </div>
  );
}
