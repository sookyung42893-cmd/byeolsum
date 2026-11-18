/**
 * 사전·사후 정서조절 척도 설정.
 * 실제 문항은 나중에 넣는다. 문항 수와 응답 범위(1~5)를 여기서 바꾸면 화면과 계산이 함께 따라간다.
 */
export const ASSESSMENT_CONFIG = {
  name: '정서조절 척도',
  scaleMin: 1,
  scaleMax: 5,
  scaleLabels: ['전혀 아니다', '아니다', '보통이다', '그렇다', '매우 그렇다'],
  /** 비워 두면 "문항 1", "문항 2"…로 표시 */
  items: Array.from({ length: 10 }, (_, i) => `문항 ${i + 1} (나중에 채울 자리)`),
};

export const ASSESSMENT_ITEM_COUNT = ASSESSMENT_CONFIG.items.length;
