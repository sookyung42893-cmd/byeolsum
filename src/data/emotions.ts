export type Quadrant = 'hot' | 'joy' | 'low' | 'calm';

export interface BroadEmotion {
  name: string;
  fine: string[];
}

export interface QuadrantInfo {
  label: string;
  color: string;
  broads: BroadEmotion[];
}

export const QUADRANTS: Record<Quadrant, QuadrantInfo> = {
  hot: {
    label: '불쾌 · 높은 에너지',
    color: '#FF8E72',
    broads: [
      { name: '짜증', fine: ['억울함', '무시당한 느낌', '서운함', '질투', '신경질', '지긋지긋함'] },
      { name: '화남', fine: ['분노', '답답함', '배신감', '약오름', '열받음', '원망'] },
      { name: '불안', fine: ['초조함', '걱정됨', '긴장됨', '막막함', '조마조마함', '겁남'] },
      { name: '당황', fine: ['창피함', '민망함', '어이없음', '혼란스러움', '놀람'] },
      { name: '스트레스', fine: ['부담감', '압박감', '쫓기는 느낌', '숨막힘', '과부하'] },
    ],
  },
  joy: {
    label: '유쾌 · 높은 에너지',
    color: '#F4C979',
    broads: [
      { name: '기쁨', fine: ['뿌듯함', '신남', '설렘', '감동', '행복함', '벅참'] },
      { name: '자신감', fine: ['당당함', '의욕적', '기대됨', '자랑스러움', '용기 남'] },
      { name: '즐거움', fine: ['재미있음', '들뜸', '유쾌함', '웃김', '짜릿함'] },
      { name: '애정', fine: ['좋아함', '반가움', '친밀함', '두근거림', '사랑스러움'] },
      { name: '호기심', fine: ['궁금함', '흥미로움', '신기함', '몰입됨'] },
    ],
  },
  low: {
    label: '불쾌 · 낮은 에너지',
    color: '#9FA8FF',
    broads: [
      { name: '슬픔', fine: ['외로움', '허전함', '그리움', '속상함', '서러움', '울적함'] },
      { name: '무기력', fine: ['지침', '귀찮음', '멍함', '공허함', '의욕 없음', '피곤함'] },
      { name: '실망', fine: ['후회', '좌절감', '부끄러움', '자책감', '아쉬움'] },
      { name: '소외감', fine: ['혼자인 느낌', '끼지 못한 느낌', '따돌림당한 느낌', '투명인간 같음'] },
      { name: '지루함', fine: ['심심함', '따분함', '시시함', '지겨움'] },
    ],
  },
  calm: {
    label: '편안함',
    color: '#7FD6C2',
    broads: [
      { name: '평온', fine: ['차분함', '안정감', '여유로움', '고요함'] },
      { name: '만족', fine: ['홀가분함', '감사함', '흡족함', '후련함', '충분함'] },
      { name: '느긋함', fine: ['나른함', '포근함', '편안함', '노곤함'] },
      { name: '안심', fine: ['안도감', '든든함', '마음 놓임', '보호받는 느낌'] },
      { name: '따뜻함', fine: ['다정함', '위로받음', '사랑받는 느낌', '연결된 느낌'] },
    ],
  },
};

export const QUADRANT_ORDER: Quadrant[] = ['hot', 'joy', 'low', 'calm'];

/**
 * 밝은 관측소 화면용 감정 색. 학생 화면 색은 흰 배경에서 너무 옅어서(대비 1.6~2.2:1)
 * 같은 색상의 한 단계 진한 값을 쓴다. 이 순서(불쾌·높음 → 불쾌·낮음 → 유쾌·높음 → 편안)로
 * 놓았을 때 색각이상 구분·대비 검사를 모두 통과한다.
 */
export const QUADRANT_COLOR_ON_LIGHT: Record<Quadrant, string> = {
  hot: '#D65A3C',
  low: '#5C68D8',
  joy: '#B98316',
  calm: '#23927B',
};
export const QUADRANT_ORDER_ON_LIGHT: Quadrant[] = ['hot', 'low', 'joy', 'calm'];

/** valence(x)·arousal(y) 좌표로 사분면 판별 */
export function quadrantOf(valence: number, arousal: number): Quadrant {
  if (arousal >= 0) return valence < 0 ? 'hot' : 'joy';
  return valence < 0 ? 'low' : 'calm';
}

export function colorOf(c: { valence: number; arousal: number }): string {
  return QUADRANTS[quadrantOf(c.valence, c.arousal)].color;
}

/** "짜증 · 억울함" 처럼 상위·세부 감정을 함께 표시. 상위만 골랐으면 상위만. */
export function emotionLabel(c: { broadEmotion: string; emotionWord: string }): string {
  return c.emotionWord === c.broadEmotion ? c.broadEmotion : `${c.broadEmotion} · ${c.emotionWord}`;
}

/** 좌표를 말로 풀어쓴 설명 (스크린리더 안내용) */
export function describePoint(valence: number, arousal: number): string {
  const level = (n: number, neg: string, pos: string) => {
    if (n <= -0.6) return `많이 ${neg}`;
    if (n < -0.2) return `조금 ${neg}`;
    if (n <= 0.2) return '중간';
    if (n < 0.6) return `조금 ${pos}`;
    return `많이 ${pos}`;
  };
  return `${level(valence, '불쾌', '유쾌')}, 에너지 ${level(arousal, '낮음', '높음')}`;
}

export function findBroad(name: string): { quadrant: Quadrant; broad: BroadEmotion } | undefined {
  for (const q of QUADRANT_ORDER) {
    const broad = QUADRANTS[q].broads.find((b) => b.name === name);
    if (broad) return { quadrant: q, broad };
  }
  return undefined;
}
