import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Sparkles, UserRound, X } from 'lucide-react';
import { useApp, useCurrentStudent } from '../../context/AppContext';
import { contactsOf } from './TrustedContacts';

export const HOTLINES = [
  { name: '청소년상담 1388', tel: '1388', desc: '24시간 · 전화, 문자, 카카오톡' },
  { name: '자살예방상담 109', tel: '109', desc: '24시간 · 전화' },
];

/**
 * 도움 받기 창.
 * - crisis: 위기 신호가 감지됐을 때 바로 뜬다 (상담 선생님에게도 알림이 갔다는 것까지 알려준다)
 * - help: 사이드 메뉴의 "도움 받기"로 언제든 연다
 */
export default function HelpDialog({ mode, onClose }: { mode: 'crisis' | 'help'; onClose: () => void }) {
  const { db } = useApp();
  const student = useCurrentStudent()!;
  const contacts = contactsOf(db.trustedContacts, student.id);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05081A]/80 p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        tabIndex={-1}
        className="w-full max-w-lg rounded-3xl border border-night-line bg-night-card p-6 text-night-text shadow-2xl outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="help-title" className="text-2xl text-night-text">
            {mode === 'crisis' ? '지금 많이 힘들지?' : '도움이 필요할 때'}
          </h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded-lg p-1 text-night-sub hover:text-night-text">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        {mode === 'crisis' && (
          <p className="mt-2 leading-relaxed text-night-text">
            혼자 버티지 않아도 돼. 방금 남긴 기록을 보고 상담 선생님에게도 알림이 갔어. 선생님이 근무 시간이 아니면 다음 근무일
            아침에 확인하게 되니까, 지금 바로 이야기가 필요하면 아래로 연락해 줘.
          </p>
        )}

        <ul className="mt-5 space-y-2">
          {HOTLINES.map((h) => (
            <li key={h.tel}>
              <a
                href={`tel:${h.tel}`}
                className="flex items-center gap-3 rounded-2xl border border-emo-hot/50 bg-emo-hot/10 px-4 py-3 hover:bg-emo-hot/15"
              >
                <Phone aria-hidden="true" className="h-5 w-5 shrink-0 text-emo-hot" />
                <span>
                  <span className="block font-medium text-night-text">{h.name}</span>
                  <span className="block text-xs text-night-sub">{h.desc}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>

        <section aria-labelledby="contacts-title" className="mt-5">
          <h3 id="contacts-title" className="font-sans text-sm font-medium text-night-text">
            내가 등록한 연락할 사람
          </h3>
          {contacts.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {contacts.map((c) => (
                <li key={c.id} className="flex items-center gap-2 text-night-text">
                  <UserRound aria-hidden="true" className="h-4 w-4 text-night-star" />
                  {c.name} <span className="text-sm text-night-sub">· {c.relation}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-night-sub">
              아직 없어.{' '}
              <Link to="/student/planet/1#contacts" onClick={onClose} className="text-night-star underline underline-offset-4">
                첫불 행성에서 등록
              </Link>
              해 둘 수 있어.
            </p>
          )}
        </section>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-night-line pt-5">
          <Link
            to="/student/meteor"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl border border-emo-hot/50 px-4 py-2.5 text-sm text-night-text hover:bg-emo-hot/10"
          >
            <Sparkles aria-hidden="true" className="h-4 w-4 text-emo-hot" />
            별똥별 띄우고 같이 지켜보기
          </Link>
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm text-night-sub hover:text-night-text">
            {mode === 'crisis' ? '알겠어' : '닫기'}
          </button>
        </div>
      </div>
    </div>
  );
}
