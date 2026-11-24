import { useLocation, useNavigate } from 'react-router-dom';
import { DatabaseZap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { askConfirm } from '../lib/confirm';

/** 개발용: 화면 오른쪽 아래 구석의 "데이터 초기화" 버튼 */
export default function DevResetButton() {
  const { resetAll } = useApp();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const light = pathname.startsWith('/observatory');

  const reset = () => {
    void askConfirm('저장된 데이터를 모두 지우고 예시 데이터로 새로 시작할까요? 직접 가입한 계정과 기록도 함께 지워져요.', '초기화').then((ok) => {
      if (!ok) return;
      resetAll();
      navigate('/');
    });
  };

  return (
    <button
      type="button"
      onClick={reset}
      className={`fixed z-50 ${light ? 'bottom-3 right-3' : 'bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-3 md:bottom-3 md:left-auto md:right-3'} inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-sm transition ${
        light
          ? 'border-obs-line bg-obs-card text-obs-sub hover:text-obs-text'
          : 'border-night-line bg-night-card text-night-sub hover:text-night-text'
      }`}
    >
      <DatabaseZap aria-hidden="true" className="h-3.5 w-3.5" />
      데이터 초기화
      <span className="sr-only">(개발용)</span>
    </button>
  );
}
