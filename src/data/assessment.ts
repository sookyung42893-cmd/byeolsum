/**
 * 사전·사후 정서조절 척도: DERS (정서조절곤란 척도, Difficulties in Emotion Regulation Scale, 36문항).
 * 응답은 0(전혀 아니다) ~ 4(거의 항상 그렇다). 점수가 높을수록 정서조절에 어려움이 크다.
 * 역채점 문항은 4 − 응답으로 바꿔서 더한다.
 */
export const ASSESSMENT_CONFIG = {
  name: '정서조절곤란 척도(DERS)',
  shortName: 'DERS',
  scaleMin: 0,
  scaleMax: 4,
  scaleLabels: ['전혀 아니다', '가끔 그렇다', '보통이다', '대부분 그렇다', '거의 항상 그렇다'],
  /** 학생에게 보여줄 안내 */
  instruction: '각 문장을 읽고, 요즘의 나와 가장 가까운 정도를 골라 줘.',
  items: [
    '내가 무엇을 느끼고 있는지 분명하게 안다.',
    '내가 어떻게 느끼고 있는지 주의를 기울인다.',
    '내 감정은 너무도 강렬하여 통제할 수 없는 것처럼 느껴진다.',
    '내가 어떻게 느끼고 있는지 잘 모르겠다.',
    '내가 어떻게 느끼는지 이해하기 어렵다.',
    '내 기분에 주의를 기울인다.',
    '내가 어떤 식으로 느끼는지 정확하게 알고 있다.',
    '내가 무엇을 느끼고 있는지 신경을 쓴다.',
    '내가 어떻게 느끼는지 혼란스럽다.',
    '기분이 나쁠 때, 그 감정을 알아차릴 수 있다.',
    '기분이 나쁠 때, 그렇게 느낀 내 자신한테 화가 난다.',
    '기분이 나쁠 때, 그렇게 느낀 내 자신이 당황스럽다.',
    '기분이 나쁠 때, 일을 마무리하기가 힘들다.',
    '기분이 나쁠 때, 그 기분을 통제할 수 없다.',
    '기분이 나쁠 때, 나는 그 기분이 오랫동안 지속 될 거라 생각한다.',
    '기분이 나쁠 때, 결국 나는 매우 우울해질 것이다.',
    '기분이 나쁠 때, 나는 내 감정을 정당하고도 중요한 것으로 여긴다.',
    '기분이 나쁠 때는 다른 일에 집중하기가 어렵다.',
    '기분이 나쁠 때, 통제할 수 없을 것 같은 기분이 든다.',
    '기분이 나빠도 여전히 해야 할 일을 마무리 할 수 있다.',
    '기분이 나쁠 때, 그렇게 느끼고 있는 내 자신이 창피하다.',
    '기분이 나쁠 때, 내 기분이 좀 더 나아지는 방법을 찾아낼 수 있다.',
    '기분이 나쁠 때는 내가 나약한 사람처럼 느껴진다.',
    '기분이 나쁠 때에도 여전히 내 행동을 통제할 수 있을 것처럼 느껴진다.',
    '기분이 나쁠 때, 그렇게 느낀 것에 대해 죄책감이 든다.',
    '기분이 나쁠 때는 집중하기가 힘들다.',
    '기분이 나쁠 때, 내 행동을 통제하기가 힘들다.',
    '기분이 나쁠 때, 내 기분을 좀 나아지게 할 수 있는 방법은 아무 것도 없다고 생각한다.',
    '기분이 나쁠 때, 그렇게 느낀 내 자신에게 짜증이 난다.',
    '기분이 나쁠 때, 내 자신을 부정적으로 평가하기 시작한다.',
    '기분이 나쁠 때, 내가 할 수 있는 일은 내가 느낀 그 기분에 빠져 있는 것뿐이다.',
    '기분이 나쁠 때, 행동 통제가 안 된다.',
    '기분이 나쁠 때, 나는 그 밖의 다른 어떤 일에 대해 생각하는 것이 어렵다.',
    '기분이 나쁠 때, 내가 실제로 느낀 것을 알아내는 데 시간이 걸린다.',
    '기분이 나쁠 때, 기분이 풀리는데 시간이 오래 걸린다.',
    '기분이 나쁠 때, 내 기분에 압도된다.',
  ],
  /** 역채점 문항 (1부터 센 번호) */
  reverseItems: [1, 2, 6, 7, 8, 10, 17, 20, 22, 24, 34],
  /** 하위척도 (1부터 센 번호) */
  subscales: [
    { name: '정서 비수용', items: [11, 12, 21, 23, 25, 29] },
    { name: '목표 지향 행동의 어려움', items: [13, 18, 20, 26, 33] },
    { name: '충동 통제 곤란', items: [3, 14, 19, 24, 27, 32] },
    { name: '정서 인식 부족', items: [2, 6, 8, 10, 17, 34] },
    { name: '정서조절 전략 접근 제한', items: [15, 16, 22, 28, 30, 31, 35, 36] },
    { name: '정서 명료성 부족', items: [1, 4, 5, 7, 9] },
  ],
};

export const ASSESSMENT_ITEM_COUNT = ASSESSMENT_CONFIG.items.length;

const REVERSE = new Set(ASSESSMENT_CONFIG.reverseItems);

/** i번째(0부터) 문항이 역채점인지 */
export const isReverseItem = (index: number) => REVERSE.has(index + 1);

/** 응답 하나를 채점 점수로 (역채점 반영) */
export function scoredItem(index: number, raw: number): number {
  return isReverseItem(index) ? ASSESSMENT_CONFIG.scaleMax + ASSESSMENT_CONFIG.scaleMin - raw : raw;
}

/** 총점 (역채점 반영 후 합). 0~144, 높을수록 정서조절 곤란이 큼 */
export function totalScore(scores: number[]): number {
  return scores.reduce((sum, raw, i) => sum + scoredItem(i, raw), 0);
}

export const TOTAL_MAX = ASSESSMENT_ITEM_COUNT * ASSESSMENT_CONFIG.scaleMax;

/** 하위척도별 점수 (합) */
export function subscaleScores(scores: number[]) {
  return ASSESSMENT_CONFIG.subscales.map((s) => ({
    name: s.name,
    score: s.items.reduce((sum, n) => sum + scoredItem(n - 1, scores[n - 1] ?? 0), 0),
    max: s.items.length * ASSESSMENT_CONFIG.scaleMax,
  }));
}
