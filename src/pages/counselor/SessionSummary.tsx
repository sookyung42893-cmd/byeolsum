import { AlertTriangle, ArrowDown, Info } from 'lucide-react';
import type { SummaryLine, SummaryTarget, SummaryTone } from '../../lib/sessionSummary';

/** 줄 색: 위기 신호는 빨강, 그 밖의 주의 신호는 주황, 참고는 파랑 (밝은 관측소 배경에서 대비 4.5:1 이상) */
const TONE: Record<SummaryTone, { row: string; chip: string }> = {
  alert: { row: 'bg-[#FEE4E2] text-[#912018]', chip: 'bg-[#B42318] text-white' },
  warn: { row: 'bg-[#FEF0C7] text-[#7A2E0E]', chip: 'bg-[#B54708] text-white' },
  normal: { row: 'text-obs-text', chip: 'bg-obs-bg text-obs-sub' },
  note: { row: 'bg-[#EEF1FF] text-[#2A3170]', chip: 'bg-[#3B45A8] text-white' },
};

/** 리포트 맨 위 "회기 전 3분 요약". 문장은 lib/sessionSummary.ts에서 기록을 계산해 정해진 틀로 만든다 */
export default function SessionSummary({ lines, onDetail }: { lines: SummaryLine[]; onDetail: (target: SummaryTarget) => void }) {
  return (
    <section aria-labelledby="summary-title" className="rounded-2xl border-2 border-obs-accent/30 bg-obs-card p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="summary-title" className="font-sans text-lg font-semibold">
          회기 전 3분 요약
        </h2>
        <p className="text-xs text-obs-sub">학생 기록에서 계산한 내용이에요</p>
      </div>
      <ul className="mt-4 space-y-1.5">
        {lines.map((l) => {
          const t = TONE[l.tone];
          return (
            <li key={l.key} className={`flex items-start gap-3 rounded-xl px-3 py-2.5 ${t.row}`}>
              <span className={`mt-0.5 inline-flex w-[5.5rem] shrink-0 items-center justify-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${t.chip}`}>
                {l.tone === 'alert' || l.tone === 'warn' ? <AlertTriangle aria-hidden="true" className="h-3 w-3" /> : null}
                {l.tone === 'note' ? <Info aria-hidden="true" className="h-3 w-3" /> : null}
                {l.label}
              </span>
              <span className="min-w-0 flex-1 text-[15px] leading-relaxed">{l.text}</span>
              <button
                type="button"
                onClick={() => onDetail(l.target)}
                className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs text-obs-sub underline-offset-2 hover:text-obs-text hover:underline"
                aria-label={`${l.label} 자세히 보기`}
              >
                자세히
                <ArrowDown aria-hidden="true" className="h-3 w-3" />
              </button>
            </li>
          );
        })}
      </ul>
      {lines.some((l) => l.key === 'note') && (
        <p className="mt-2 pl-[6.5rem] text-xs text-obs-sub">"참고"는 기록에서 찾은 규칙일 뿐이에요. 적용할지는 상담사 선생님이 판단해 주세요.</p>
      )}
    </section>
  );
}
