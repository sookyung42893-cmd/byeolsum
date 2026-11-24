import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Sparkles, Telescope, Trash2, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import StarField from '../components/StarField';
import Logo from '../components/Logo';
import { askConfirm } from '../lib/confirm';
import { DEMO_INVITE_CODE, DEMO_PASSWORD } from '../data/seed';
import { FRESH_ACCOUNT_ID } from '../data/demo';
import { PASSWORD_RULE, USERNAME_RULE, type SignUpErrors, type SignUpInput } from '../lib/auth';
import type { Account, Role } from '../types';

type Tab = 'signup' | 'login';

const inputClass =
  'w-full rounded-xl border border-night-line bg-night-bg px-4 py-2.5 text-night-text outline-none transition focus:border-night-star aria-[invalid=true]:border-emo-hot';

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid': boolean }) => ReactNode;
}) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm text-night-text">
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': Boolean(error) })}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-night-sub">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-emo-hot">
          {error}
        </p>
      )}
    </div>
  );
}

const ROLE_OPTIONS: { value: Role; label: string; desc: string; icon: typeof User }[] = [
  { value: 'student', label: '학생', desc: '내 마음을 별로 기록해요', icon: User },
  { value: 'counselor', label: '상담사', desc: '별숨 관측소에서 학생을 살펴요', icon: Telescope },
];

function SignUpForm({ onDone }: { onDone: (a: Account) => void }) {
  const { signUp } = useApp();
  const [form, setForm] = useState<SignUpInput>({
    role: 'student',
    displayName: '',
    username: '',
    password: '',
    passwordConfirm: '',
    inviteCode: '',
  });
  const [errors, setErrors] = useState<SignUpErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof SignUpInput) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await signUp(form);
    setSubmitting(false);
    if (result.errors) setErrors(result.errors);
    else onDone(result.account);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm text-night-text">어떤 역할로 가입할까요?</legend>
        <div className="grid grid-cols-2 gap-3">
          {ROLE_OPTIONS.map(({ value, label, desc, icon: Icon }) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                name="role"
                value={value}
                checked={form.role === value}
                onChange={() => set('role')(value)}
                className="peer sr-only"
              />
              <span className="flex h-full flex-col gap-1 rounded-2xl border border-night-line bg-night-bg p-4 transition peer-checked:border-night-star peer-checked:bg-night-star/10 peer-focus-visible:shadow-[0_0_0_2px_#F4C979,0_0_14px_3px_rgba(244,201,121,0.45)]">
                <span className="flex items-center gap-2 font-medium text-night-text">
                  <Icon aria-hidden="true" className="h-5 w-5 text-night-star" />
                  {label}
                </span>
                <span className="text-xs text-night-sub">{desc}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {form.role === 'student' && (
        <Field label="상담 선생님 초대 코드" hint="선생님이 관측소에서 알려주는 6자리 코드예요." error={errors.inviteCode}>
          {(p) => (
            <input
              {...p}
              className={`${inputClass} uppercase tracking-[0.3em]`}
              value={form.inviteCode}
              maxLength={6}
              onChange={(e) => set('inviteCode')(e.target.value.toUpperCase())}
              autoComplete="off"
            />
          )}
        </Field>
      )}
      <Field
        label={form.role === 'student' ? '이름 또는 별명' : '이름'}
        hint={form.role === 'student' ? '실명이 아니어도 괜찮아요. 상담 선생님에게 이 이름으로 보여요.' : undefined}
        error={errors.displayName}
      >
        {(p) => <input {...p} className={inputClass} value={form.displayName} onChange={(e) => set('displayName')(e.target.value)} autoComplete="nickname" />}
      </Field>
      <Field label="아이디" hint={USERNAME_RULE} error={errors.username}>
        {(p) => <input {...p} className={inputClass} value={form.username} onChange={(e) => set('username')(e.target.value)} autoComplete="username" />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="비밀번호" hint={PASSWORD_RULE} error={errors.password}>
          {(p) => <input {...p} type="password" className={inputClass} value={form.password} onChange={(e) => set('password')(e.target.value)} autoComplete="new-password" />}
        </Field>
        <Field label="비밀번호 확인" error={errors.passwordConfirm}>
          {(p) => <input {...p} type="password" className={inputClass} value={form.passwordConfirm} onChange={(e) => set('passwordConfirm')(e.target.value)} autoComplete="new-password" />}
        </Field>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-night-star px-5 py-3 font-medium text-night-bg transition hover:brightness-105 disabled:opacity-60"
      >
        {form.role === 'student' ? '학생으로 가입하기' : '상담사로 가입하기'}
      </button>
    </form>
  );
}

function LogInForm({ onDone }: { onDone: (a: Account) => void }) {
  const { logIn } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const account = await logIn(username, password);
    if (account) onDone(account);
    else setError('아이디 또는 비밀번호가 맞지 않아요.');
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label="아이디">
        {(p) => <input {...p} className={inputClass} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />}
      </Field>
      <Field label="비밀번호">
        {(p) => <input {...p} type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />}
      </Field>
      {error && (
        <p role="alert" className="text-sm text-emo-hot">
          {error}
        </p>
      )}
      <button type="submit" className="w-full rounded-xl bg-night-star px-5 py-3 font-medium text-night-bg transition hover:brightness-105">
        로그인
      </button>
    </form>
  );
}

export default function Welcome() {
  const { db, enterAs, startFresh, restoreDemo, removeDemo } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('signup');

  const goHome = (account: Account) => navigate(account.role === 'student' ? '/student/sky' : '/observatory');

  const demoAccounts = db.accounts.filter((a) => a.demo);
  const demoCounselor = demoAccounts.find((a) => a.role === 'counselor');
  const demoStudents = demoAccounts
    .filter((a) => a.role === 'student' && a.id !== FRESH_ACCOUNT_ID)
    .map((account) => ({ account, student: db.students.find((s) => s.id === account.studentId) }));

  const handleRestore = () => {
    void askConfirm('예시 학생 A~D와 예시 상담사의 기록을 처음 상태로 다시 채울까요? 직접 가입한 계정은 그대로 남아요.').then((ok) => ok && restoreDemo());
  };
  const handleRemove = () => {
    void askConfirm('예시 학생 A~D, 예시 상담사 계정과 그 기록을 모두 지울까요? 직접 가입한 계정은 그대로 남아요.').then((ok) => ok && removeDemo());
  };

  const tabClass = (t: Tab) =>
    `flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
      tab === t ? 'bg-night-line text-night-text' : 'text-night-sub hover:text-night-text'
    }`;

  return (
    <div className="theme-night relative min-h-screen overflow-hidden bg-night-bg text-night-text">
      <StarField />
      <main className="relative mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-10 px-4 py-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-[6%] md:px-[4%] md:py-12">
        <div>
          <p className="font-display text-lg tracking-[0.02em] text-night-sub">감정이 지나가는 밤하늘</p>
          {/* 마크 높이 1.15em, 세로 가운데 정렬, 글자와 바짝 */}
          <h1 className="mt-3 flex items-center gap-[0.08em] text-6xl text-night-star md:text-7xl">
            <Logo className="h-[1.15em] w-auto shrink-0" />
            별숨
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-night-sub">
            마음을 밤하늘의 별로 띄워보는 곳.
            <br />
            오늘의 감정에 좌표를 찍고, 천천히 이름을 붙여봐.
          </p>

          {demoAccounts.length > 0 ? (
          <section aria-labelledby="start-title" className="mt-12 max-w-lg">
            <h2 id="start-title" className="font-sans text-base font-medium text-night-text">
              바로 시작하기
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-night-sub">가입 없이 예시 데이터(학생 4명, 2주치 기록)로 둘러봐요.</p>

            {demoCounselor && (
              <button
                type="button"
                onClick={() => {
                  enterAs(demoCounselor);
                  goHome(demoCounselor);
                }}
                className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-night-line bg-night-card px-5 py-4 text-left transition hover:border-night-star"
              >
                <Telescope aria-hidden="true" className="h-6 w-6 shrink-0 text-night-star" />
                <span>
                  <span className="block font-medium text-night-text">상담사로 시작</span>
                  <span className="block text-xs text-night-sub">별숨 관측소에서 학생 A~D의 회기 준비 리포트를 봐요</span>
                </span>
              </button>
            )}

            {demoStudents.length > 0 && (
              <fieldset className="mt-3 rounded-2xl border border-night-line bg-night-card px-5 py-4">
                <legend className="sr-only">학생으로 시작: 학생 고르기</legend>
                <p aria-hidden="true" className="flex items-center gap-3">
                  <User aria-hidden="true" className="h-6 w-6 shrink-0 text-night-star" />
                  <span>
                    <span className="block font-medium text-night-text">학생으로 시작</span>
                    <span className="block text-xs text-night-sub">어떤 학생으로 들어갈지 골라요</span>
                  </span>
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {demoStudents.map(({ account, student }) => (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => {
                        enterAs(account);
                        goHome(account);
                      }}
                      className="rounded-xl border border-night-line bg-night-bg px-2 py-2.5 text-center transition hover:border-night-star"
                    >
                      <span className="block text-sm font-medium text-night-text">{account.displayName}</span>
                      <span className="block text-xs text-night-sub">
                        {student ? `${student.currentSession}회기${student.mode === '유지' ? ' · 유지' : ''}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <button
              type="button"
              onClick={() => {
                startFresh();
                navigate('/student/sky');
              }}
              className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-dashed border-night-line bg-night-card px-5 py-4 text-left transition hover:border-night-star"
            >
              <Sparkles aria-hidden="true" className="h-6 w-6 shrink-0 text-night-star" />
              <span>
                <span className="block font-medium text-night-text">처음 시작하는 학생으로 체험</span>
                <span className="block text-xs text-night-sub">동의서 → 사전 검사(DERS) → 첫 밤하늘까지, 학생이 처음 보는 화면 그대로. 누를 때마다 새로 시작해요</span>
              </span>
            </button>

            <p className="mt-4 text-xs leading-relaxed text-night-sub">
              로그인 탭으로 예시 계정에 들어갈 때 비밀번호는 {DEMO_PASSWORD} 예요. 예시 상담사의 초대 코드는{' '}
              {DEMO_INVITE_CODE} 예요. 예시 학생들은 예시 상담사의 관측소에서만 보여요.
            </p>
            <div className="mt-4 flex gap-5">
              <button
                type="button"
                onClick={handleRestore}
                className="inline-flex items-center gap-2 text-xs text-night-sub underline-offset-4 hover:text-night-text hover:underline"
              >
                <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
                예시 데이터 처음 상태로
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-2 text-xs text-night-sub underline-offset-4 hover:text-night-text hover:underline"
              >
                <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                예시 데이터 지우기
              </button>
            </div>
          </section>
          ) : (
            <button
              type="button"
              onClick={handleRestore}
              className="mt-14 inline-flex items-center gap-2 text-xs text-night-sub underline-offset-4 hover:text-night-text hover:underline"
            >
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
              예시 데이터 다시 채우기
            </button>
          )}
        </div>

        <section className="rounded-3xl border border-night-line bg-night-card p-8">
          <div role="tablist" aria-label="회원가입 또는 로그인" className="mb-7 flex gap-1 rounded-xl bg-night-bg p-1">
            <button type="button" role="tab" id="tab-signup" aria-selected={tab === 'signup'} aria-controls="panel-signup" className={tabClass('signup')} onClick={() => setTab('signup')}>
              회원가입
            </button>
            <button type="button" role="tab" id="tab-login" aria-selected={tab === 'login'} aria-controls="panel-login" className={tabClass('login')} onClick={() => setTab('login')}>
              로그인
            </button>
          </div>
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === 'signup' ? <SignUpForm onDone={goHome} /> : <LogInForm onDone={goHome} />}
          </div>
        </section>
      </main>
    </div>
  );
}
