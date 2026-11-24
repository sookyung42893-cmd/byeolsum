/**
 * 생각 함정 몬스터 5종. 함정마다 생김새와 색이 다르다.
 * 몸은 같은 말랑한 모양을 쓰고, 소품(개구리 다리·먹구름·수정구슬·반반 색·딱지)으로 구분한다.
 */
export type TrapName = '결론 건너뛰기' | '최악 상상하기' | '마음 읽기' | '전부 아니면 전무' | '꼬리표 붙이기';

export interface TrapInfo {
  name: TrapName;
  monster: string;
  color: string;
  desc: string;
  /** 잡혔을 때 하는 말 */
  caught: string;
}

export const TRAP_INFO: TrapInfo[] = [
  { name: '결론 건너뛰기', monster: '폴짝이', color: '#8FE3A0', desc: '확인도 하기 전에 결론으로 폴짝 뛰어 버려.', caught: '들켰다! 난 확인도 안 하고 결론으로 폴짝 뛰어 버려.' },
  { name: '최악 상상하기', monster: '먹구름이', color: '#A9B2D9', desc: '일어날 수 있는 가장 나쁜 일만 떠올려.', caught: '우르릉… 난 제일 나쁜 일만 비처럼 쏟아 내지.' },
  { name: '마음 읽기', monster: '독심냥', color: '#C9A7FF', desc: '다른 사람 속마음을 안다고 믿어 버려.', caught: '냐옹, 난 남의 속마음을 다 안다고 우기지.' },
  { name: '전부 아니면 전무', monster: '반반이', color: '#E8E8F2', desc: '완벽하지 않으면 다 실패라고 봐.', caught: '100 아니면 0! 중간은 없어! …사실 중간이 훨씬 많지만.' },
  { name: '꼬리표 붙이기', monster: '딱지', color: '#FFD56B', desc: '한 번의 일로 나를 "원래 그런 사람"이라고 정해.', caught: '찰싹! 한 번 일어난 일로 꼬리표 붙이는 게 내 특기야.' },
];

export const trapInfo = (name: TrapName) => TRAP_INFO.find((t) => t.name === name)!;

const INK = '#2A1B3D';
const BODY = 'M50 14 C72 14 86 30 86 52 C86 74 72 88 50 88 C28 88 14 74 14 52 C14 30 28 14 50 14 Z';

function Face({ y = 52, happy = false }: { y?: number; happy?: boolean }) {
  return (
    <g>
      <circle cx="40" cy={y - 4} r="4" fill={INK} />
      <circle cx="60" cy={y - 4} r="4" fill={INK} />
      <circle cx="41.3" cy={y - 5.5} r="1.3" fill="#fff" />
      <circle cx="61.3" cy={y - 5.5} r="1.3" fill="#fff" />
      <ellipse cx="33" cy={y + 4} rx="5" ry="3" fill="#FF7A9A" opacity="0.4" />
      <ellipse cx="67" cy={y + 4} rx="5" ry="3" fill="#FF7A9A" opacity="0.4" />
      {happy ? (
        <path d={`M43 ${y + 4} Q50 ${y + 11} 57 ${y + 4}`} fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      ) : (
        <path d={`M44 ${y + 6} Q50 ${y + 2} 56 ${y + 6}`} fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      )}
    </g>
  );
}

/** 함정 몬스터 그림. silhouette이면 아직 못 잡은 실루엣 */
export default function TrapMonster({ name, silhouette = false, happy = false }: { name: TrapName; silhouette?: boolean; happy?: boolean }) {
  const t = trapInfo(name);
  const c = silhouette ? '#2A3366' : t.color;
  const show = !silhouette;
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible" aria-hidden="true">
      {name === '결론 건너뛰기' && (
        <g fill={c}>
          {/* 개구리 다리 + 눈 툭 */}
          <ellipse cx="22" cy="84" rx="14" ry="6" />
          <ellipse cx="78" cy="84" rx="14" ry="6" />
          <circle cx="36" cy="22" r="11" />
          <circle cx="64" cy="22" r="11" />
        </g>
      )}
      {name === '최악 상상하기' && (
        <g>
          {/* 머리 위 먹구름 + 번개 */}
          <g fill={silhouette ? c : '#6E77A3'}>
            <circle cx="34" cy="14" r="10" />
            <circle cx="50" cy="8" r="12" />
            <circle cx="66" cy="14" r="10" />
            <rect x="26" y="12" width="48" height="12" rx="6" />
          </g>
          {show && <path d="M52 22 L45 34 L52 34 L47 44" fill="none" stroke="#FFE27A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
        </g>
      )}
      {name === '마음 읽기' && (
        <g fill={c}>
          {/* 고양이 귀 */}
          <path d="M22 30 L26 6 L42 20 Z" />
          <path d="M78 30 L74 6 L58 20 Z" />
        </g>
      )}
      {name === '꼬리표 붙이기' && (
        <g>
          {/* 머리 위 고리 */}
          <circle cx="50" cy="12" r="5" fill="none" stroke={silhouette ? c : '#C99A2E'} strokeWidth="3" />
        </g>
      )}

      {/* 몸 */}
      {name === '전부 아니면 전무' && show ? (
        <g>
          <clipPath id="half-left">
            <rect x="0" y="0" width="50" height="100" />
          </clipPath>
          <path d={BODY} fill="#2E2E3A" />
          <path d={BODY} fill="#F4F4FA" clipPath="url(#half-left)" />
          <path d={BODY} fill="none" stroke="#9EA3C0" strokeWidth="1.5" />
        </g>
      ) : name === '꼬리표 붙이기' ? (
        <path d="M30 18 L70 18 L86 40 L86 80 C86 86 82 88 76 88 L24 88 C18 88 14 86 14 80 L14 40 Z" fill={c} />
      ) : (
        <path d={BODY} fill={c} />
      )}

      {show && (
        <>
          {name === '전부 아니면 전무' ? (
            <g>
              <circle cx="40" cy="48" r="4" fill={INK} />
              <circle cx="60" cy="48" r="4" fill="#F4F4FA" />
              <path d="M44 58 L56 58" stroke="#9EA3C0" strokeWidth="2.6" strokeLinecap="round" />
            </g>
          ) : (
            <Face y={name === '꼬리표 붙이기' ? 58 : 56} happy={happy} />
          )}
          {name === '마음 읽기' && (
            <g>
              {/* 수정구슬 */}
              <circle cx="50" cy="80" r="11" fill="#E9DDFF" stroke="#9A7BE0" strokeWidth="2" />
              <circle cx="46" cy="76" r="3" fill="#fff" opacity="0.8" />
            </g>
          )}
          {name === '꼬리표 붙이기' && (
            <g>
              <rect x="30" y="68" width="40" height="10" rx="3" fill="#FFF6DF" />
              <path d="M35 73 L60 73" stroke="#C99A2E" strokeWidth="2" strokeLinecap="round" />
            </g>
          )}
        </>
      )}
      {silhouette && (
        <text x="50" y="62" textAnchor="middle" fontSize="26" fill="#5A6390">
          ?
        </text>
      )}
    </svg>
  );
}
