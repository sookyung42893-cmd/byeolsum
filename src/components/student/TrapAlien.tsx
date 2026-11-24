/**
 * 생각 함정 외계인 5종. 거울 행성에 사는 장난꾸러기 외계인들이 몰래 생각을 비틀어 놓는다.
 * 머리 모양과 큰 눈은 같고, 종족마다 색과 소품(안테나·폭풍·접시 안테나·흑백·이름표)이 다르다.
 */
export type TrapName = '결론 건너뛰기' | '최악 상상하기' | '마음 읽기' | '전부 아니면 전무' | '꼬리표 붙이기';

export interface TrapInfo {
  name: TrapName;
  /** 외계인 이름 */
  alien: string;
  /** 종족 */
  tribe: string;
  color: string;
  desc: string;
  /** 붙잡혔을 때 하는 말 */
  caught: string;
  /** 소개 화면에 보여줄 예시 생각 (붙잡기 문제와 겹치지 않게) */
  example: string;
}

export const TRAP_INFO: TrapInfo[] = [
  {
    name: '결론 건너뛰기',
    alien: '워피',
    tribe: '워프족',
    color: '#8FE3A0',
    desc: '확인도 하기 전에 결론으로 순간이동해 버려.',
    caught: '삐빅! 들켰다. 난 확인 단계를 건너뛰고 결론으로 워프하지.',
    example: '선생님이 날 불렀어. 분명 혼나는 거야.',
  },
  {
    name: '최악 상상하기',
    alien: '우르릉',
    tribe: '폭풍족',
    color: '#A9B2D9',
    desc: '일어날 수 있는 가장 나쁜 일만 폭풍처럼 불러와.',
    caught: '우르릉 쾅! 난 제일 나쁜 일만 골라서 폭풍처럼 몰고 와.',
    example: '이번 시험 망치면 내 인생은 끝이야.',
  },
  {
    name: '마음 읽기',
    alien: '쫑긋이',
    tribe: '안테나족',
    color: '#C9A7FF',
    desc: '다른 사람 속마음을 다 안다고 믿어 버려.',
    caught: '지지직… 내 안테나로 남의 속마음을 다 들을 수 있다고 우기지.',
    example: '다들 속으로 내가 이상하다고 생각할 거야.',
  },
  {
    name: '전부 아니면 전무',
    alien: '반반이',
    tribe: '흑백족',
    color: '#E8E8F2',
    desc: '완벽하지 않으면 다 실패라고 봐.',
    caught: '삐-삐-! 100 아니면 0! 중간은 없어! …사실 우주엔 중간이 훨씬 많지만.',
    example: '한 번 지각했으니 이번 학기는 완전 망했어.',
  },
  {
    name: '꼬리표 붙이기',
    alien: '찰싹이',
    tribe: '라벨족',
    color: '#FFD56B',
    desc: '한 번의 일로 나를 "원래 그런 사람"이라고 정해.',
    caught: '찰싹! 한 번 일어난 일로 이름표 붙이는 게 내 특기야.',
    example: '체육 시간에 공을 놓쳤어. 난 원래 운동 못하는 애야.',
  },
];

export const trapInfo = (name: TrapName) => TRAP_INFO.find((t) => t.name === name)!;

const INK = '#1E1533';
const HEAD = 'M50 20 C74 20 88 36 88 54 C88 74 70 90 50 90 C30 90 12 74 12 54 C12 36 26 20 50 20 Z';

/** 외계인의 큰 아몬드 눈 */
function Eyes({ fillL = INK, fillR = INK, glintL = '#fff', glintR = '#fff' }: { fillL?: string; fillR?: string; glintL?: string; glintR?: string }) {
  return (
    <g>
      <ellipse cx="35" cy="55" rx="9" ry="12.5" transform="rotate(-24 35 55)" fill={fillL} />
      <ellipse cx="65" cy="55" rx="9" ry="12.5" transform="rotate(24 65 55)" fill={fillR} />
      <ellipse cx="32" cy="50" rx="2.6" ry="3.6" fill={glintL} opacity="0.9" />
      <ellipse cx="62" cy="50" rx="2.6" ry="3.6" fill={glintR} opacity="0.9" />
    </g>
  );
}

function Mouth({ happy, color = INK }: { happy: boolean; color?: string }) {
  return happy ? (
    <path d="M42 74 Q50 81 58 74" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
  ) : (
    // 장난스러운 한쪽 입꼬리
    <path d="M43 75 Q51 78 58 71" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
  );
}

function Antenna({ x1, y1, x2, y2, ball, stroke }: { x1: number; y1: number; x2: number; y2: number; ball: string; stroke: string }) {
  return (
    <g>
      <path d={`M${x1} ${y1} L${x2} ${y2}`} stroke={stroke} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx={x2} cy={y2} r="4.5" fill={ball} />
    </g>
  );
}

/** 함정 외계인 그림. silhouette이면 아직 못 붙잡은 그림자 */
export default function TrapAlien({ name, silhouette = false, happy = false }: { name: TrapName; silhouette?: boolean; happy?: boolean }) {
  const t = trapInfo(name);
  const sil = '#2A3366';
  const c = silhouette ? sil : t.color;
  const deep = silhouette ? sil : shade(t.color);

  return (
    <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible" aria-hidden="true">
      {/* 종족별 머리 위 · 옆 소품 */}
      {name === '결론 건너뛰기' && (
        <g>
          <Antenna x1={40} y1={24} x2={30} y2={6} ball={c} stroke={deep} />
          <Antenna x1={60} y1={24} x2={70} y2={6} ball={c} stroke={deep} />
          {!silhouette && (
            <g stroke={t.color} strokeWidth="2.4" strokeLinecap="round" opacity="0.7">
              <path d="M2 48 L9 48" />
              <path d="M0 58 L8 58" />
              <path d="M3 68 L9 68" />
            </g>
          )}
          <ellipse cx="50" cy="94" rx="30" ry="4.5" fill="none" stroke={deep} strokeWidth="2" opacity={silhouette ? 1 : 0.8} />
        </g>
      )}
      {name === '최악 상상하기' && (
        <g>
          <Antenna x1={50} y1={20} x2={50} y2={8} ball={c} stroke={deep} />
          <g fill={silhouette ? sil : '#6E77A3'}>
            <circle cx="74" cy="12" r="7" />
            <circle cx="84" cy="9" r="8" />
            <circle cx="93" cy="13" r="6" />
            <rect x="70" y="11" width="26" height="8" rx="4" />
          </g>
          {!silhouette && <path d="M84 19 L79 28 L85 28 L81 36" fill="none" stroke="#FFE27A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />}
        </g>
      )}
      {name === '마음 읽기' && (
        <g>
          {/* 양옆 접시 안테나 */}
          <path d="M14 46 L4 34" stroke={deep} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M86 46 L96 34" stroke={deep} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M-4 30 Q4 22 12 34 Z" fill={c} stroke={deep} strokeWidth="1.5" />
          <path d="M104 30 Q96 22 88 34 Z" fill={c} stroke={deep} strokeWidth="1.5" />
          {!silhouette && (
            <g fill="none" stroke={t.color} strokeWidth="1.8" strokeLinecap="round" opacity="0.75">
              <path d="M-2 20 Q-8 26 -6 34" />
              <path d="M102 20 Q108 26 106 34" />
            </g>
          )}
        </g>
      )}
      {name === '전부 아니면 전무' && (
        <g>
          <Antenna x1={40} y1={24} x2={36} y2={7} ball={silhouette ? sil : '#2E2E3A'} stroke={silhouette ? sil : '#2E2E3A'} />
          <Antenna x1={60} y1={24} x2={64} y2={7} ball={silhouette ? sil : '#F4F4FA'} stroke={silhouette ? sil : '#C8CAE0'} />
        </g>
      )}
      {name === '꼬리표 붙이기' && (
        <g>
          <path d="M50 20 Q52 10 60 6" fill="none" stroke={deep} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M60 6 L62 18" stroke={deep} strokeWidth="1.4" />
          <rect x="56" y="17" width="16" height="10" rx="2" fill={silhouette ? sil : '#FFF6DF'} stroke={deep} strokeWidth="1.4" transform="rotate(12 64 22)" />
          {!silhouette && <path d="M59 22 L68 24" stroke="#C99A2E" strokeWidth="1.6" strokeLinecap="round" transform="rotate(12 64 22)" />}
        </g>
      )}

      {/* 머리 */}
      {name === '전부 아니면 전무' && !silhouette ? (
        <g>
          <clipPath id="alien-half-left">
            <rect x="0" y="0" width="50" height="100" />
          </clipPath>
          <path d={HEAD} fill="#2E2E3A" />
          <path d={HEAD} fill="#F4F4FA" clipPath="url(#alien-half-left)" />
          <path d={HEAD} fill="none" stroke="#9EA3C0" strokeWidth="1.5" />
        </g>
      ) : (
        <path d={HEAD} fill={c} />
      )}

      {!silhouette && (
        <>
          {/* 볼 하이라이트 */}
          {name !== '전부 아니면 전무' && <ellipse cx="34" cy="34" rx="10" ry="5" fill="#fff" opacity="0.25" transform="rotate(-20 34 34)" />}
          {name === '전부 아니면 전무' ? (
            <>
              <Eyes fillL="#2E2E3A" fillR="#F4F4FA" glintL="#fff" glintR="#2E2E3A" />
              <path d="M42 75 L58 75" stroke="#9EA3C0" strokeWidth="2.6" strokeLinecap="round" />
            </>
          ) : (
            <>
              <Eyes />
              {name === '꼬리표 붙이기' && (
                // 이마의 셋째 눈
                <g>
                  <ellipse cx="50" cy="36" rx="4.5" ry="5.5" fill={INK} />
                  <circle cx="48.8" cy="34.4" r="1.4" fill="#fff" />
                </g>
              )}
              <Mouth happy={happy} />
            </>
          )}
        </>
      )}
      {silhouette && (
        <text x="50" y="66" textAnchor="middle" fontSize="24" fill="#5A6390">
          ?
        </text>
      )}
    </svg>
  );
}

/** 안테나 줄기 등에 쓰는 조금 진한 색 */
function shade(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(v * 0.72);
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
