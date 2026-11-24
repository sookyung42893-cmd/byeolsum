import type { Mission, Planet } from '../types';

/**
 * 행성 6개 = UP-A(청소년용 단일화된 범진단적 치료 프로토콜) 모듈.
 * 상담사가 회기를 마치며 순서대로 열어준다 (행성마다 정해진 회기에 열림).
 */
export const PLANETS: Planet[] = [
  { id: 1, name: '첫불 행성', upaModule: '모듈 1', theme: '항해를 시작할 마음 다지기', discoveryName: '불씨 결정', color: '#FFB36B' },
  { id: 2, name: '이름 행성', upaModule: '모듈 2·3', theme: '정서와 행동 알기', discoveryName: '이름 광석', color: '#F4C979' },
  { id: 3, name: '두근 행성', upaModule: '모듈 4', theme: '몸의 감각 알아차리기', discoveryName: '두근이', color: '#FF9AAE' },
  { id: 4, name: '거울 행성', upaModule: '모듈 5', theme: '유연하게 생각하기', discoveryName: '렌즈', color: '#B9C2FF' },
  { id: 5, name: '너울 행성', upaModule: '모듈 6', theme: '감정을 밀어내지 않고 알아차리기', discoveryName: '파도 진주', color: '#7FB8FF' },
  { id: 6, name: '별빛 행성', upaModule: '모듈 8', theme: '돌아보고 앞으로를 대비하기', discoveryName: '별빛 유리병', color: '#E3D3FF' },
];

/**
 * 8회기 · 정거장 7곳 = 행성 6개 + 용기 구간.
 * 행성 하나 = 회기 하나, 용기 구간만 6~7회기 두 번에 걸쳐 머문다. 별빛 행성(6번)은 8회기.
 */
export const TOTAL_SESSIONS = 8;
export const COURAGE_SESSIONS = [6, 7];

/** 행성 번호 → 그 행성이 열리는 회기 */
const PLANET_SESSION: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 8 };
export const sessionOfPlanet = (planetId: number) => PLANET_SESSION[planetId] ?? planetId;

export type StationKey = `planet-${number}` | 'courage';

export interface Station {
  key: StationKey;
  kind: 'planet' | 'courage';
  /** kind가 planet일 때 행성 번호 */
  planetId?: number;
  name: string;
  /** 이 정거장에 머무는 회기 */
  sessions: number[];
  upaModule: string;
  theme: string;
  color: string;
}

/** 용기 구간 (UP-A 모듈 7, 정서 노출). 미리 정해진 미션 없이 회기에서 함께 정한 도전 미션이 중심 */
export const COURAGE_STATION: Station = {
  key: 'courage',
  kind: 'courage',
  name: '용기 구간',
  sessions: COURAGE_SESSIONS,
  upaModule: '모듈 7',
  theme: '피하던 것에 한 걸음씩 다가가기',
  color: '#FFC98A',
};

/** 항로 순서대로 정거장 7곳 */
export const STATIONS: Station[] = [
  ...[1, 2, 3, 4, 5].map((id) => planetStation(id)),
  COURAGE_STATION,
  planetStation(6),
];

function planetStation(id: number): Station {
  const p = PLANETS.find((x) => x.id === id)!;
  return {
    key: `planet-${id}`,
    kind: 'planet',
    planetId: id,
    name: p.name,
    sessions: [sessionOfPlanet(id)],
    upaModule: p.upaModule,
    theme: p.theme,
    color: p.color,
  };
}

/** 회기 번호 → 그 회기의 정거장 */
export function stationOfSession(session: number): Station {
  return STATIONS.find((s) => s.sessions.includes(session)) ?? STATIONS[0];
}

/** "4회기 · 거울 행성 탐사 중" / "6회기 · 용기 구간" */
export function sessionLabel(session: number): string {
  const st = stationOfSession(session);
  return st.kind === 'courage' ? `${session}회기 · 용기 구간` : `${session}회기 · ${st.name} 탐사 중`;
}

/**
 * 행성 소개 문구. 없으면 "이곳에서는 {theme}를 연습해."로 보여준다.
 * 별똥별 도구(사이드바 "별똥별 띄우기")는 행성과 상관없이 1회기부터 늘 쓸 수 있고,
 * 너울 행성은 5회기에 열려 그 별똥별을 끝까지 지켜보는 법을 배우는 곳이다.
 */
const PLANET_INTRO: Record<number, string> = {
  5: '그동안 위급할 때마다 띄워 온 별똥별, 이제 끝까지 지켜보는 법을 배워 보자. 감정을 밀어내지 않아도 결국 지나간다는 걸 확인하는 곳이야.',
};

export function planetIntro(planetId: number): string {
  return PLANET_INTRO[planetId] ?? `이곳에서는 ${planetById(planetId).theme}를 연습해.`;
}
/** 몸 지도가 열리는 행성 (두근) */
export const BODY_MAP_PLANET = 3;
export const HEART_EXPERIMENT_ID = 'p3-real';

export const PLANET_COUNT = PLANETS.length;

export function planetById(id: number): Planet {
  return PLANETS.find((p) => p.id === id) ?? PLANETS[0];
}

/** 각 행성: 연습 1 + 현실 1 (이름 행성만 현실 2개) */
export const MISSIONS: Mission[] = [
  {
    id: 'p1-practice',
    planetId: 1,
    kind: '연습',
    title: '착륙 신호',
    description: '밤하늘에 첫 별을 띄우고, 별똥별 기능도 미리 한 번 써봐.',
    to: '/student/checkin',
  },
  {
    id: 'p1-real',
    planetId: 1,
    kind: '현실',
    title: '기분 측정기 3회',
    description: '하루 동안 내 기분이 몇 점쯤인지 세 번 떠올려봐.',
  },
  {
    id: 'p2-practice',
    planetId: 2,
    kind: '연습',
    title: '감정 분해기',
    description: '감정 하나를 생각·몸·행동으로 나눠 보고, 피하면 어떻게 되는지 직접 실험해 봐.',
    to: '/student/practice/emotion-parts',
  },
  {
    id: 'p2-real',
    planetId: 2,
    kind: '현실',
    title: '도망 포착',
    description: '감정을 피한 순간 하나를 잡아서, 무엇을 피했고 그 뒤에 어땠는지 적어봐.',
  },
  {
    // 이름 행성은 UP-A 모듈 2·3을 함께 다뤄서 미션이 3개 (모듈 3: 정서 행동의 반대로 행동하기)
    id: 'p2-opposite',
    planetId: 2,
    kind: '현실',
    title: '반대로 한 걸음',
    description: '감정이 피하라고 할 때, 반대로 아주 작은 행동 하나를 해봐. 예: 방에 숨고 싶을 때 거실에 5분 나가 있기.',
    recordMood: true,
  },
  {
    id: 'p3-practice',
    planetId: 3,
    kind: '연습',
    title: '몸 스캐너',
    description: '1분 바디스캔 안내를 따라 한 뒤, 감정이 느껴지는 곳을 몸 지도에 찍어봐.',
    to: '/student/practice/body-scan',
  },
  {
    id: 'p3-real',
    planetId: 3,
    kind: '현실',
    title: '두근 실험',
    description: '30초 동안 제자리에서 뛰고, 두근거림을 피하지 말고 가만히 지켜봐.',
  },
  {
    id: 'p4-practice',
    planetId: 4,
    kind: '연습',
    title: '생각 함정 찾기',
    description: '결론 건너뛰기, 최악 상상하기 같은 생각 함정을 찾고 망원경 렌즈로 다시 봐.',
    to: '/student/practice/thinking-traps',
  },
  {
    id: 'p4-real',
    planetId: 4,
    kind: '현실',
    title: '해석 검증',
    description: '누군가의 행동을 다르게 해석해 보고, 그 해석이 맞았는지 확인해봐.',
  },
  {
    id: 'p5-practice',
    planetId: 5,
    kind: '연습',
    title: '유성 관측',
    description: '별똥별을 띄우고, 감정을 밀어내지 말고 사라질 때까지 지켜봐.',
    to: '/student/meteor',
  },
  {
    id: 'p5-real',
    planetId: 5,
    kind: '현실',
    title: '1분 머물기',
    description: '감정이 올라올 때 바로 피하지 말고, 1분만 그대로 있어봐.',
  },
  {
    id: 'p6-practice',
    planetId: 6,
    kind: '연습',
    title: '항해 매뉴얼',
    description: '나만의 조절 레시피를 만들고, 힘들 때의 나에게 별빛편지를 써봐.',
    to: '/student/practice/manual',
  },
  {
    id: 'p6-real',
    planetId: 6,
    kind: '현실',
    title: '귀환 보고',
    description: '제일 도움이 된 기술 하나를 골라 상담 선생님께 말해봐.',
  },
];

export function missionsOfPlanet(planetId: number): Mission[] {
  return MISSIONS.filter((m) => m.planetId === planetId);
}

export function missionById(id: string): Mission | undefined {
  return MISSIONS.find((m) => m.id === id);
}

export const COUNSELOR_NAME = '이윤슬 상담사';
