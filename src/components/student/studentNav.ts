import { BookOpen, Flag, Mail, Map, Moon, type LucideIcon } from 'lucide-react';

/**
 * 학생 메뉴 정의. 사이드 메뉴(지금)와 나중에 만들 모바일 하단 탭이 같은 목록을 쓴다.
 * also: 함께 강조할 하위 화면 경로
 */
export interface StudentNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  also?: string[];
}

export const STUDENT_NAV: StudentNavItem[] = [
  { to: '/student/sky', label: '나의 밤하늘', icon: Moon, also: ['/student/checkin', '/student/telescope'] },
  { to: '/student/map', label: '항해 지도', icon: Map, also: ['/student/planet', '/student/practice', '/student/courage'] },
  { to: '/student/challenge', label: '도전 미션', icon: Flag },
  { to: '/student/codex', label: '탐사 도감', icon: BookOpen },
  { to: '/student/letters', label: '별빛편지', icon: Mail },
];

/** 별똥별은 감정이 셀 때 바로 쓸 수 있게 메뉴와 따로 항상 고정한다. 절대 잠그지 않는다 */
export const METEOR_LINK = { to: '/student/meteor', label: '별똥별 띄우기' };

export function isNavActive(item: StudentNavItem, pathname: string): boolean {
  return pathname.startsWith(item.to) || (item.also?.some((p) => pathname.startsWith(p)) ?? false);
}
