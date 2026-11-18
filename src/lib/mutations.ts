import type { CheckIn, DB } from '../types';

/** 체크인을 지우면 그 체크인으로 했던 전략 사용 기록도 함께 지운다 */
export function removeCheckIn(db: DB, id: string): DB {
  return {
    ...db,
    checkIns: db.checkIns.filter((c) => c.id !== id),
    strategyUses: db.strategyUses.filter((u) => u.checkInId !== id),
  };
}

/** 같은 id의 체크인을 고친 내용으로 바꾼다 (기록한 시각은 그대로) */
export function replaceCheckIn(db: DB, next: CheckIn): DB {
  return { ...db, checkIns: db.checkIns.map((c) => (c.id === next.id ? next : c)) };
}

export const DELETE_CHECKIN_CONFIRM = '이 별을 밤하늘에서 지울까? 이 별로 했던 망원경 관측 기록도 함께 지워져.';

/**
 * 지우기 확인 문구. 이 별 때문에 선생님에게 위기 신호 알림이 갔다면,
 * 별을 지워도 선생님 쪽 알림 기록은 남는다는 걸 미리 알려준다.
 */
export function deleteCheckInConfirm(db: DB, checkInId: string): string {
  const alerted = db.crisisAlerts.some((a) => a.sourceIds.includes(checkInId));
  return alerted
    ? `${DELETE_CHECKIN_CONFIRM}\n\n이 별 때문에 선생님에게 "많이 힘들 수 있다"는 알림이 갔어. 별을 지워도 그 알림 기록은 선생님 쪽에 남아. 너를 돕기 위해서야.`
    : DELETE_CHECKIN_CONFIRM;
}
