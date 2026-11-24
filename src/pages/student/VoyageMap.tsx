import { createContext, useContext, useEffect, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useApp, useCurrentStudent } from '../../context/AppContext';
import { STATIONS, planetById, planetIntro, stationOfSession, type Station } from '../../data/planets';
import { completedCount, courageChallenges, courageStars, requiredMissions, stationStatus } from '../../lib/voyage';
import { SparkleStar, mixColor, sparklePath } from '../../components/Sparkle';
import type { PlanetStatus } from '../../types';

const R = 30;
const NIGHT = '#0B1026';
const NEBULA_FOCUS = '#C9A7FF';

/**
 * 지도 배치. viewBox 크기는 그리기 단위일 뿐, 화면 크기에 맞춰 늘고 준다.
 * - 가로(노트북): 정거장 7곳을 왼쪽→오른쪽, 위아래로 번갈아
 * - 세로(휴대폰, 768px 미만): 1회기가 맨 위, 8회기가 맨 아래로 내려가며 좌우로 번갈아
 */
interface MapLayout {
  vertical: boolean;
  W: number;
  H: number;
  pos: { key: string; x: number; y: number }[];
  dust: { x: number; y: number; r: number; o: number }[];
}

function makeDust(W: number, H: number, n: number) {
  let s = 11;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: n }, () => ({ x: rand() * W, y: rand() * H, r: 0.4 + rand() * 0.9, o: 0.1 + rand() * 0.3 }));
}

const HORIZONTAL: MapLayout = (() => {
  const W = 1000;
  const H = 460;
  const step = (W - 180) / (STATIONS.length - 1);
  return { vertical: false, W, H, pos: STATIONS.map((s, i) => ({ key: s.key, x: 90 + i * step, y: i % 2 === 0 ? 300 : 150 })), dust: makeDust(W, H, 90) };
})();

const VERTICAL: MapLayout = (() => {
  const W = 400;
  const step = 150;
  const H = 100 + step * (STATIONS.length - 1) + 100;
  return { vertical: true, W, H, pos: STATIONS.map((s, i) => ({ key: s.key, x: i % 2 === 0 ? 105 : 295, y: 100 + i * step })), dust: makeDust(W, H, 110) };
})();

const LayoutContext = createContext<MapLayout>(HORIZONTAL);
const useLayout = () => useContext(LayoutContext);
const usePos = (key: string) => useLayout().pos.find((p) => p.key === key)!;

/** 768px 이상이면 가로 지도 */
function useWide() {
  const query = '(min-width: 768px)';
  const [wide, setWide] = useState(() => (typeof window === 'undefined' ? true : window.matchMedia(query).matches));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

const STATUS_TEXT: Record<PlanetStatus, string> = {
  완료: '완료',
  탐사중: '탐사 중',
  열림: '열림',
  잠김: '잠김',
};

const courageStatusText = (s: PlanetStatus) => (s === '완료' ? '지나온 구간' : s === '탐사중' ? '머무는 중' : '잠김');

/** 행성마다 표면 질감(feTurbulence) 세기 */
const TEXTURE: Record<number, { freq: number; opacity: number }> = {
  1: { freq: 0.09, opacity: 0.28 },
  2: { freq: 0.05, opacity: 0.2 },
  3: { freq: 0.07, opacity: 0.22 },
  4: { freq: 0.03, opacity: 0.08 },
  5: { freq: 0.04, opacity: 0.18 },
  6: { freq: 0.06, opacity: 0.12 },
};

/** 행성별 표면 개성 (행성 원 안에 잘려서 그려진다) */
function Surface({ pid, x, y, k, color }: { pid: number; x: number; y: number; k: string; color: string }) {
  switch (pid) {
    case 1: // 첫불: 불씨 같은 따뜻한 얼룩
      return (
        <g filter={`url(#${k}-blur)`}>
          <ellipse cx={x - 10} cy={y - 8} rx={10} ry={6} fill="#FFE0A8" opacity={0.55} />
          <ellipse cx={x + 9} cy={y + 6} rx={12} ry={7} fill="#D9481C" opacity={0.45} />
          <ellipse cx={x - 4} cy={y + 13} rx={8} ry={4} fill="#FFC27A" opacity={0.45} />
          <ellipse cx={x + 12} cy={y - 12} rx={6} ry={4} fill="#FFF1CF" opacity={0.5} />
          <ellipse cx={x - 16} cy={y + 4} rx={5} ry={7} fill="#C9461A" opacity={0.35} />
        </g>
      );
    case 2: // 이름: 광석처럼 각진 결정 면이 은은하게 반짝임
      return (
        <g fill="#FFF6D6">
          {[
            ['-20,-8 -6,-21 1,-7 -11,2', 0],
            ['4,-19 19,-7 11,5 2,-6', 1.6],
            ['-15,9 -1,4 -3,19', 3.1],
            ['6,9 18,6 13,19', 2.2],
          ].map(([pts, delay]) => (
            <polygon
              key={pts as string}
              points={(pts as string)
                .split(' ')
                .map((p) => {
                  const [dx, dy] = p.split(',').map(Number);
                  return `${x + dx},${y + dy}`;
                })
                .join(' ')}
              className="facet-shimmer"
              style={{ animationDelay: `${-(delay as number)}s` }}
              opacity={0.3}
            />
          ))}
          <g fill="none" stroke="#FFF6D6" strokeOpacity={0.22} strokeWidth={0.8}>
            <path d={`M ${x - 6} ${y - 21} L ${x + 1} ${y - 7} L ${x + 11} ${y + 5} M ${x + 1} ${y - 7} L ${x - 11} ${y + 2} L ${x - 1} ${y + 4}`} />
          </g>
        </g>
      );
    case 3: // 두근: 부드러운 분홍 얼룩
      return (
        <g filter={`url(#${k}-blur)`}>
          <ellipse cx={x - 8} cy={y - 6} rx={11} ry={7} fill="#FFD6DF" opacity={0.4} />
          <ellipse cx={x + 8} cy={y + 9} rx={12} ry={6} fill="#D9566F" opacity={0.35} />
        </g>
      );
    case 4: // 거울: 매끈한 표면 위 사선 반사 띠
      return (
        <g transform={`rotate(-38 ${x} ${y})`} filter={`url(#${k}-blur-s)`}>
          {/* 반사 띠가 표면을 천천히 미끄러진다 */}
          <g className="mirror-sheen">
            <rect x={x - 40} y={y - 9} width={80} height={6} fill="#FFFFFF" opacity={0.34} />
            <rect x={x - 40} y={y + 1} width={80} height={2} fill="#FFFFFF" opacity={0.22} />
          </g>
        </g>
      );
    case 5: {
      // 너울: 물결 가로 줄무늬가 아주 천천히 흐름 (주기 40만큼 옮기면 이어진다)
      const wave = (dy: number, amp: number) => {
        let d = `M ${x - R - 40} ${y + dy} q 10 -${amp} 20 0`;
        for (let i = 0; i < 7; i++) d += ' t 20 0';
        return d;
      };
      // 줄마다 출렁이는 박자를 다르게: 옆으로 흐르면서 위아래로도 일렁인다
      return (
        <g fill="none" stroke="#DCEEFF" strokeLinecap="round">
          {[
            [-17, 5, 2.2, 0.42, 0],
            [-6, 7, 3, 0.5, 1.1],
            [5, 6, 2.6, 0.45, 2.2],
            [15, 5, 2.2, 0.38, 0.6],
          ].map(([dy, amp, w, o, delay]) => (
            <g key={dy} className="wave-swell" style={{ animationDelay: `${-delay}s` }}>
              <path d={wave(dy, amp)} strokeWidth={w} strokeOpacity={o} className="wave-drift" style={{ animationDelay: `${-delay * 2}s` }} />
            </g>
          ))}
        </g>
      );
    }
    case 6: // 별빛: 반투명하고 중심에서 빛이 새어 나옴
      return (
        <g>
          <circle cx={x} cy={y} r={R * 0.95} fill={`url(#${k}-core)`} className="pearl-glow" />
          {/* 유리병 속 별빛처럼 작은 반짝임 */}
          <g fill="#FFF6D6">
            {[
              [-9, -6, 3.2, 0],
              [8, 4, 2.6, 1.3],
              [-2, 10, 2.2, 2.4],
              [10, -10, 2, 0.7],
            ].map(([dx, dy, r, delay]) => (
              <path key={`${dx}${dy}`} d={sparklePath(x + dx, y + dy, r, 0.16)} className="twinkle-soft" style={{ animationDelay: `${-delay}s` }} />
            ))}
          </g>
        </g>
      );
    default:
      return <circle cx={x} cy={y} r={1} fill={color} opacity={0} />;
  }
}

/** 거울 행성의 고리: 뒤쪽 절반은 행성 뒤로, 앞쪽 절반은 행성 앞으로 */
function MirrorRing({ x, y, color, half, dim }: { x: number; y: number; color: string; half: 'back' | 'front'; dim: boolean }) {
  const rx = R * 1.75;
  const ry = R * 0.42;
  // 위쪽(뒤) 호: 왼쪽 끝 → 위 → 오른쪽 끝 / 아래쪽(앞) 호: 오른쪽 끝 → 아래 → 왼쪽 끝
  const d = half === 'back' ? `M ${x - rx} ${y} A ${rx} ${ry} 0 0 1 ${x + rx} ${y}` : `M ${x + rx} ${y} A ${rx} ${ry} 0 0 1 ${x - rx} ${y}`;
  const o = dim ? 0.18 : half === 'back' ? 0.5 : 0.9;
  return (
    <g transform={`rotate(-16 ${x} ${y})`} fill="none" strokeLinecap="round" opacity={o}>
      <path d={d} stroke={mixColor(color, '#FFFFFF', 0.45)} strokeWidth={3.2} />
      <path d={d} stroke={mixColor(color, NIGHT, 0.35)} strokeWidth={1} transform={`translate(0 ${half === 'back' ? -2.2 : 2.2})`} />
    </g>
  );
}

/** 행성: 왼쪽 위에서 빛을 받는 구, 대기 빛, 표면 질감, 행성별 무늬 */
function PlanetSphere({ station, status, selected }: { station: Station; status: PlanetStatus; selected: boolean }) {
  const { x, y } = usePos(station.key);
  const pid = station.planetId!;
  const c = station.color;
  const k = `pl${pid}`;
  const locked = status === '잠김';
  const tex = TEXTURE[pid];
  const glow = locked ? 0 : status === '탐사중' ? 0.55 : selected ? 0.45 : 0.24;
  const rim = mixColor(c, '#FFFFFF', 0.55);

  return (
    <g className={status === '탐사중' ? 'planet-float' : undefined}>
      <defs>
        {pid === 6 ? (
          // 별빛: 진주색이 너무 옅어 속빛이 안 보이므로, 가장자리를 짙은 보랏빛으로 눌러 중심 빛과 대비를 만든다
          <radialGradient id={`${k}-shade`} cx="40%" cy="38%" r="72%">
            <stop offset="0" stopColor={c} />
            <stop offset="0.5" stopColor={mixColor(c, '#7A63C2', 0.45)} />
            <stop offset="0.82" stopColor="#4A3C86" />
            <stop offset="1" stopColor="#241D4A" />
          </radialGradient>
        ) : (
          <radialGradient id={`${k}-shade`} cx="34%" cy="30%" r="80%">
            <stop offset="0" stopColor={mixColor(c, '#FFFFFF', 0.6)} />
            <stop offset="0.3" stopColor={c} />
            <stop offset="0.68" stopColor={mixColor(c, NIGHT, 0.35)} />
            <stop offset="1" stopColor={mixColor(c, NIGHT, 0.86)} />
          </radialGradient>
        )}
        {/* 밤 쪽 그림자: 오른쪽 아래로 갈수록 무늬까지 어둡게 덮는다 */}
        <radialGradient id={`${k}-night`} cx="32%" cy="28%" r="85%">
          <stop offset="0.45" stopColor={NIGHT} stopOpacity="0" />
          <stop offset="1" stopColor={NIGHT} stopOpacity="0.7" />
        </radialGradient>
        <radialGradient id={`${k}-halo`}>
          <stop offset="0.45" stopColor={c} stopOpacity="0.55" />
          <stop offset="1" stopColor={c} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${k}-core`}>
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="0.3" stopColor="#FFF0FA" stopOpacity="0.85" />
          <stop offset="0.65" stopColor="#F2D9FF" stopOpacity="0.35" />
          <stop offset="1" stopColor="#E3D3FF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${k}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={rim} stopOpacity="0.95" />
          <stop offset="0.55" stopColor={rim} stopOpacity="0.35" />
          <stop offset="1" stopColor={rim} stopOpacity="0.08" />
        </linearGradient>
        <clipPath id={`${k}-clip`}>
          <circle cx={x} cy={y} r={R} />
        </clipPath>
        <filter id={`${k}-tex`} filterUnits="userSpaceOnUse" x={x - R} y={y - R} width={R * 2} height={R * 2}>
          <feTurbulence type="fractalNoise" baseFrequency={tex.freq} numOctaves={3} seed={pid * 7} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <filter id={`${k}-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id={`${k}-blur-s`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
        <filter id={`${k}-rimblur`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.7" />
        </filter>
      </defs>

      {/* 행성 바깥 은은한 빛 번짐 (첫불은 천천히 일렁임) */}
      <circle
        cx={x}
        cy={y}
        r={R * 1.9}
        fill={`url(#${k}-halo)`}
        opacity={glow}
        className={locked ? undefined : pid === 1 ? 'ember-glow' : pid === 6 ? 'pearl-aura' : undefined}
      />

      {pid === 4 && <MirrorRing x={x} y={y} color={c} half="back" dim={locked} />}
      {/* 두근: 심장 박동처럼 바깥으로 퍼지는 얇은 빛 고리 */}
      {pid === 3 && !locked && <circle cx={x} cy={y} r={R} fill="none" stroke={c} strokeWidth={1.5} opacity={0} className="heart-ring" />}

      {/* 본체 */}
      <circle cx={x} cy={y} r={R} fill={locked ? '#10142F' : `url(#${k}-shade)`} opacity={pid === 6 && !locked ? 0.82 : 1} />
      <g clipPath={`url(#${k}-clip)`} opacity={locked ? 0.14 : 1}>
        <rect x={x - R} y={y - R} width={R * 2} height={R * 2} filter={`url(#${k}-tex)`} opacity={tex.opacity} style={{ mixBlendMode: 'overlay' }} />
        <Surface pid={pid} x={x} y={y} k={k} color={c} />
        <circle cx={x} cy={y} r={R} fill={`url(#${k}-night)`} />
      </g>

      {locked ? (
        <circle cx={x} cy={y} r={R} fill="none" stroke={c} strokeOpacity={0.35} strokeWidth={1.2} strokeDasharray="2 5" />
      ) : (
        // 가장자리 대기 빛 (왼쪽 위가 더 밝다)
        <circle cx={x} cy={y} r={R - 0.6} fill="none" stroke={`url(#${k}-rim)`} strokeWidth={1.6} filter={`url(#${k}-rimblur)`} />
      )}

      {pid === 4 && <MirrorRing x={x} y={y} color={c} half="front" dim={locked} />}
      {status === '완료' && <SparkleStar cx={x + R * 0.8} cy={y - R * 0.8} r={15} color={c} glow={0.6} twinkle delay={pid * 0.7} />}
    </g>
  );
}

/** 용기 구간: 테두리 없이 보라·분홍 빛 구름이 부드럽게 퍼지는 성운 */
function Nebula({ status, selected }: { status: PlanetStatus; selected: boolean }) {
  const { x, y } = usePos('courage');
  const locked = status === '잠김';
  // 잠김일 땐 채도를 낮춘 색으로 그린다 (필터로 채도를 낮추면 번진 구름이 네모로 잘려 보여서)
  const tone = (col: string) => (locked ? mixColor(col, '#6E7196', 0.75) : col);
  const clouds: [number, number, number, string, number][] = [
    [-20, 4, 34, '#A98BFF', 0.7],
    [16, -10, 30, '#FF9AC8', 0.6],
    [6, 14, 26, '#D9B8FF', 0.65],
    [-6, -14, 22, '#FFB3D9', 0.5],
    [26, 10, 18, '#B79CFF', 0.55],
    [-30, -6, 16, '#FFC98A', 0.35],
  ];
  return (
    <g className={status === '탐사중' ? 'planet-float' : undefined} opacity={locked ? 0.45 : selected ? 1 : 0.9}>
      <defs>
        {/* 필터 범위를 넉넉하게 잡아야 번진 가장자리가 네모로 잘리지 않는다 */}
        <filter id="nebula-blur" filterUnits="userSpaceOnUse" x={x - 140} y={y - 120} width={280} height={240}>
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <filter id="nebula-blur-in" filterUnits="userSpaceOnUse" x={x - 80} y={y - 70} width={160} height={140}>
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <g>
        <g className={locked ? undefined : 'nebula-breathe'}>
          {/* 바깥 큰 구름 + 안쪽 밝은 구름을 여러 겹 겹친다 */}
          <g filter="url(#nebula-blur)">
            {clouds.map(([dx, dy, r, col, o]) => (
              <circle key={`${dx}${dy}`} cx={x + dx} cy={y + dy} r={r} fill={tone(col)} opacity={o * (status === '탐사중' || selected ? 1 : 0.8)} />
            ))}
          </g>
          <g filter="url(#nebula-blur-in)">
            <circle cx={x - 4} cy={y} r={14} fill={tone('#F3E6FF')} opacity={0.55} />
            <circle cx={x + 12} cy={y - 6} r={9} fill={tone('#FFE1F0')} opacity={0.45} />
          </g>
        </g>
        {/* 구름 속 작은 별들 */}
        <g fill={locked ? '#B9BCD6' : '#FFF3DC'} opacity={locked ? 0.5 : 1}>
          {[
            [-22, -6, 3.5, 0],
            [10, -16, 2.6, 1.2],
            [24, 8, 3, 2.3],
            [-6, 14, 2.3, 0.7],
            [0, -2, 4.2, 1.8],
            [-30, 10, 2, 2.9],
          ].map(([dx, dy, r, delay]) => (
            <path
              key={`${dx}${dy}`}
              d={sparklePath(x + dx, y + dy, r, 0.14)}
              className={locked ? undefined : 'twinkle-soft'}
              style={{ animationDelay: `${-delay}s` }}
              opacity={0.9}
            />
          ))}
        </g>
      </g>
    </g>
  );
}

function StationMark({
  station,
  status,
  progress,
  focused,
  onSelect,
}: {
  station: Station;
  status: PlanetStatus;
  progress: string;
  focused: boolean;
  onSelect: () => void;
}) {
  const { x, y } = usePos(station.key);
  const layout = useLayout();
  const courage = station.kind === 'courage';
  const locked = status === '잠김';
  const below = y > layout.H / 2;
  const sessionText = courage ? `${station.sessions[0]}~${station.sessions[station.sessions.length - 1]}회기` : `${station.sessions[0]}회기`;
  const statusText = courage ? courageStatusText(status) : STATUS_TEXT[status];
  const reach = courage ? 52 : R;

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  const body: ReactNode = courage ? (
    <Nebula status={status} selected={focused} />
  ) : (
    <PlanetSphere station={station} status={status} selected={focused} />
  );

  return (
    <g
      role="button"
      tabIndex={0}
      aria-pressed={focused}
      aria-label={`${sessionText} ${station.name}, ${station.theme}, ${statusText}${locked || !progress ? '' : `, ${progress}`}`}
      onClick={onSelect}
      onKeyDown={onKey}
      className="map-station cursor-pointer"
      style={{ '--focus-color': courage ? NEBULA_FOCUS : station.color } as CSSProperties}
    >
      {/* 누르기 쉬운 넓은 영역 */}
      <circle cx={x} cy={y} r={reach + 10} fill="transparent" />
      <g className="station-body">{body}</g>
      {layout.vertical ? (
        // 세로 지도: 이름표를 행성 옆(지도 가운데 쪽)에. 휴대폰에서도 읽히게 크게
        <g textAnchor={x < layout.W / 2 ? 'start' : 'end'}>
          {(() => {
            const tx = x < layout.W / 2 ? x + reach + 16 : x - reach - 16;
            return (
              <>
                <text x={tx} y={y - 16} fill="#B8BEE0" fontSize="14">
                  {sessionText}
                </text>
                <text x={tx} y={y + 6} fill={locked ? '#B8BEE0' : '#EEF0FF'} fontSize="19" fontWeight={focused ? 600 : 500}>
                  {station.name}
                </text>
                <text x={tx} y={y + 27} fill={status === '탐사중' ? '#F4C979' : '#B8BEE0'} fontSize="14">
                  {locked || !progress ? statusText : `${statusText} · ${progress}`}
                </text>
              </>
            );
          })()}
        </g>
      ) : (
        <g textAnchor="middle">
          <text x={x} y={below ? y + reach + 22 : y - reach - 50} fill="#A9B0D6" fontSize="11">
            {sessionText}
          </text>
          <text x={x} y={below ? y + reach + 40 : y - reach - 32} fill={locked ? '#A9B0D6' : '#EEF0FF'} fontSize="14" fontWeight={focused ? 600 : 400}>
            {station.name}
          </text>
          <text x={x} y={below ? y + reach + 58 : y - reach - 14} fill={status === '탐사중' ? '#F4C979' : '#A9B0D6'} fontSize="11">
            {locked || !progress ? statusText : `${statusText} · ${progress}`}
          </text>
        </g>
      )}
    </g>
  );
}

/** 두 정거장을 잇는 부드러운 곡선 (세로 지도면 위아래로 휘어진다) */
function routePath(a: { x: number; y: number }, b: { x: number; y: number }, vertical = false) {
  if (vertical) {
    const dy = (b.y - a.y) / 2;
    return `M ${a.x} ${a.y} C ${a.x} ${a.y + dy} ${b.x} ${b.y - dy} ${b.x} ${b.y}`;
  }
  const dx = (b.x - a.x) / 2;
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y} ${b.x - dx} ${b.y} ${b.x} ${b.y}`;
}

export default function VoyageMapPage() {
  const { db } = useApp();
  const student = useCurrentStudent()!;
  const navigate = useNavigate();
  const here = stationOfSession(student.currentSession);
  const [focusKey, setFocusKey] = useState<string>(here.key);
  const layout = useWide() ? HORIZONTAL : VERTICAL;
  const { W, H } = layout;

  const statusOf = (s: Station) => stationStatus(db, student, s);
  const progressText = (s: Station) => {
    if (s.kind === 'courage') {
      const n = courageStars(db, student.id, true);
      return n > 0 ? `용기의 별 ${n}` : '';
    }
    return `${completedCount(db, student.id, s.planetId!)}/${requiredMissions(db, student.id, s.planetId!).length}`;
  };
  const focus = STATIONS.find((s) => s.key === focusKey)!;
  const focusStatus = statusOf(focus);
  const found = STATIONS.filter((s) => s.kind === 'planet' && statusOf(s) === '완료').length;
  const focusTo = focus.kind === 'courage' ? '/student/courage' : `/student/planet/${focus.planetId}`;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl text-night-text">항해 지도</h1>
        <p className="mt-2 text-night-sub">여덟 번의 회기 동안 정거장 일곱 곳을 지나가. 행성 여섯 개와, 6~7회기에 머무는 용기 구간이야.</p>
        <p className="mt-1 text-sm text-night-sub">
          지금 {student.currentSession}회기 · 발견물을 찾은 행성 {found} / 6 · 정거장을 누르면 아래에 자세히 보여줘
        </p>
      </header>

      <LayoutContext.Provider value={layout}>
      <div className="overflow-hidden rounded-3xl border border-night-line bg-[radial-gradient(ellipse_at_center,#18204A_0%,#0B1026_75%)]">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="group" aria-label="항해 지도, 정거장 일곱 곳">
          {layout.dust.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#EEF0FF" opacity={d.o} aria-hidden="true" />
          ))}

          {/* 항로: 부드러운 곡선 점선. 지나온 길은 금색, 앞으로 갈 길은 흐린 남색 */}
          <g aria-hidden="true" fill="none" strokeLinecap="round">
            {layout.pos.slice(1).map((b, i) => {
              const passed = STATIONS[i + 1].sessions[0] <= student.currentSession;
              return (
                <path
                  key={b.key}
                  d={routePath(layout.pos[i], b, layout.vertical)}
                  stroke={passed ? '#F4C979' : '#3A4478'}
                  strokeOpacity={passed ? 0.75 : 0.9}
                  strokeWidth={2.6}
                  strokeDasharray="0.1 9"
                />
              );
            })}
          </g>

          {STATIONS.map((s) => (
            <StationMark
              key={s.key}
              station={s}
              status={statusOf(s)}
              progress={progressText(s)}
              focused={focusKey === s.key}
              onSelect={() => setFocusKey(s.key)}
            />
          ))}
        </svg>
      </div>
      </LayoutContext.Provider>

      <section aria-live="polite" className="flex flex-col items-start gap-4 rounded-2xl border border-night-line bg-night-card px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
        <div>
          <p className="flex items-center gap-2 text-sm text-night-sub">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: focus.color }} />
            {focus.kind === 'courage' ? '6~7회기' : `${focus.sessions[0]}회기`} · UP-A {focus.upaModule} ·{' '}
            {focus.kind === 'courage' ? courageStatusText(focusStatus) : STATUS_TEXT[focusStatus]}
            {focus.sessions.includes(student.currentSession) && ' · 지금 여기'}
          </p>
          <p className="mt-1 text-xl text-night-text">
            {focus.name} <span className="text-base text-night-sub">· {focus.theme}</span>
          </p>
          {focus.kind === 'planet' && focus.planetId === 5 && <p className="mt-1 text-sm text-night-text">{planetIntro(5)}</p>}
          <p className="mt-1 text-sm text-night-sub">
            {focus.kind === 'courage'
              ? `발견물 대신 용기의 별이 모여 · 이 구간 도전 ${courageChallenges(db, student.id).length}개 · 용기의 별 ${courageStars(db, student.id, true)}개`
              : `발견물: ${
                  focusStatus === '완료'
                    ? planetById(focus.planetId!).discoveryName
                    : focusStatus === '잠김'
                      ? '?'
                      : `${planetById(focus.planetId!).discoveryName} (미션 ${progressText(focus)})`
                }`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(focusTo)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-night-star px-5 py-2.5 font-medium text-night-bg hover:brightness-105"
        >
          {focusStatus === '잠김' ? '미리 보기' : focus.kind === 'courage' ? '용기 구간 보기' : '행성 미션 보기'}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </section>
    </div>
  );
}
