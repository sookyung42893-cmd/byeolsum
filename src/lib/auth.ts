import type { Account, Role, Session } from '../types';

/**
 * 서버가 없는 데모용 인증. 비밀번호를 평문으로 두지 않으려고 해시만 저장하지만,
 * localStorage에 있으므로 실제 서비스 수준의 보안은 아니다.
 */
export async function hashPassword(username: string, password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export interface SignUpInput {
  role: Role;
  displayName: string;
  username: string;
  password: string;
  passwordConfirm: string;
  /** 학생만: 담당 상담사의 초대 코드 */
  inviteCode: string;
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 헷갈리는 0/O, 1/I 제외

export function makeInviteCode(used: Set<string>): string {
  for (;;) {
    const code = Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
    if (!used.has(code)) return code;
  }
}

export function findCounselorByCode(accounts: Account[], code: string): Account | undefined {
  const normalized = code.trim().toUpperCase();
  return accounts.find((a) => a.role === 'counselor' && a.inviteCode === normalized);
}

export type SignUpErrors = Partial<Record<keyof SignUpInput, string>>;

export const USERNAME_RULE = '영문 소문자, 숫자, -, _ 로 4~20자';
export const PASSWORD_RULE = '6자 이상';

export function validateSignUp(input: SignUpInput, accounts: Account[]): SignUpErrors {
  const errors: SignUpErrors = {};
  const name = input.displayName.trim();
  if (!name) errors.displayName = '이름을 적어주세요.';
  else if (name.length > 12) errors.displayName = '이름은 12자까지 쓸 수 있어요.';

  const username = input.username.trim();
  if (!/^[a-z0-9_-]{4,20}$/.test(username)) errors.username = `아이디는 ${USERNAME_RULE}로 만들어주세요.`;
  else if (accounts.some((a) => a.username === username)) errors.username = '이미 쓰이고 있는 아이디예요.';

  if (input.password.length < 6) errors.password = `비밀번호는 ${PASSWORD_RULE}이어야 해요.`;
  if (input.passwordConfirm !== input.password) errors.passwordConfirm = '비밀번호가 서로 달라요.';

  if (input.role === 'student') {
    if (!input.inviteCode.trim()) errors.inviteCode = '상담 선생님에게 받은 초대 코드를 적어주세요.';
    else if (!findCounselorByCode(accounts, input.inviteCode)) errors.inviteCode = '이 코드를 쓰는 상담 선생님을 찾지 못했어요.';
  }
  return errors;
}

export function sessionFor(account: Account): Session {
  if (account.role === 'student' && account.studentId) {
    return { role: 'student', accountId: account.id, studentId: account.studentId };
  }
  return { role: 'counselor', accountId: account.id };
}
