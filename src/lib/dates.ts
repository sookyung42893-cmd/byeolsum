export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** YYYY-MM-DD (로컬 시간 기준) */
export function toDateKey(t: number): string {
  const d = new Date(t);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

const dateFmt = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
const timeFmt = new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' });

export function formatDate(input: string | number): string {
  return dateFmt.format(new Date(input));
}

export function formatDateTime(input: string | number): string {
  const d = new Date(input);
  return `${dateFmt.format(d)} ${timeFmt.format(d)}`;
}

export function daysSince(iso: string, now = Date.now()): number {
  return (now - new Date(iso).getTime()) / DAY;
}

/** "N일 전" 같은 상대 표현 */
export function relativeDays(iso: string, now = Date.now()): string {
  const diff = Math.round((startOfDay(now) - startOfDay(new Date(iso).getTime())) / DAY);
  if (diff <= 0) return '오늘';
  if (diff === 1) return '어제';
  return `${diff}일 전`;
}

/** 다음 회기까지 남은 일수 (D-day 표시용) */
export function daysUntil(dateKey: string, now = Date.now()): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  const target = new Date(y, m - 1, d).getTime();
  return Math.round((target - startOfDay(now)) / DAY);
}
