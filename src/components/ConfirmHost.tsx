import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { setConfirmListener, type ConfirmRequest } from '../lib/confirm';

/** 앱 안에 그리는 확인창. 학생 화면은 밤하늘 색, 상담사 화면은 밝은 색 */
export default function ConfirmHost() {
  const [req, setReq] = useState<ConfirmRequest | null>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  const light = useLocation().pathname.startsWith('/observatory');

  useEffect(() => setConfirmListener((r) => setReq(r)), []);

  const close = (ok: boolean) => {
    req?.resolve(ok);
    setReq(null);
  };

  useEffect(() => {
    if (!req) return;
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);

  if (!req) return null;

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 ${light ? 'theme-obs bg-[#141A3A]/40' : 'theme-night bg-[#05081A]/80'}`}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-message"
        className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${
          light ? 'border-obs-line bg-obs-card text-obs-text' : 'border-night-line bg-night-card text-night-text'
        }`}
      >
        <p id="confirm-message" className="whitespace-pre-line leading-relaxed">
          {req.message}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => close(false)}
            className={`rounded-xl px-4 py-2 text-sm ${light ? 'text-obs-sub hover:bg-obs-bg hover:text-obs-text' : 'text-night-sub hover:text-night-text'}`}
          >
            취소
          </button>
          <button
            ref={okRef}
            type="button"
            onClick={() => close(true)}
            className={`rounded-xl px-5 py-2 text-sm font-medium ${
              light ? 'bg-obs-accent text-white hover:brightness-110' : 'bg-night-star text-night-bg hover:brightness-105'
            }`}
          >
            {req.confirmLabel ?? '확인'}
          </button>
        </div>
      </div>
    </div>
  );
}
