import { useId, useState, type ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

/** 관측소 차트 공통 색 (밝은 테마) */
export const OBS_CHART = {
  accent: '#3B45A8',
  grid: '#E6E8F0',
  axis: '#5A6185',
  text: '#141A3A',
};

export function StatTile({
  label,
  value,
  unit,
  delta,
  note,
  help,
}: {
  label: string;
  value: string;
  unit?: string;
  /** 지난주 대비 변화. 좋고 나쁨을 판단하지 않도록 색은 중립으로 둔다 */
  delta?: { diff: number | null; text: string };
  note?: string;
  /** 이 지표가 무슨 뜻인지 쉬운 말로 (마우스를 올리지 않아도 늘 보인다) */
  help?: string;
}) {
  const Icon = delta?.diff == null || delta.diff === 0 ? Minus : delta.diff > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="rounded-2xl border border-obs-line bg-obs-card p-5">
      <p className="text-sm font-medium text-obs-text">{label}</p>
      {help && <p className="mt-1 text-xs leading-relaxed text-obs-sub">{help}</p>}
      <p className="mt-2 text-3xl font-semibold text-obs-text">
        {value}
        {unit && <span className="ml-1 text-base font-medium text-obs-sub">{unit}</span>}
      </p>
      {delta && (
        <p className="mt-2 flex items-center gap-1 text-sm text-obs-sub">
          <Icon aria-hidden="true" className="h-4 w-4" />
          {delta.text}
        </p>
      )}
      {note && <p className="mt-2 text-xs leading-relaxed text-obs-sub">{note}</p>}
    </div>
  );
}

export interface TableView {
  caption: string;
  columns: string[];
  rows: (string | number)[][];
}

/** 차트 카드. 모든 차트에 '표로 보기'를 붙여 색·마우스 없이도 값을 읽을 수 있게 한다 */
export function ChartCard({
  title,
  subtitle,
  children,
  table,
  empty,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  table: TableView;
  empty?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="rounded-2xl border border-obs-line bg-obs-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 id={titleId} className="font-sans text-base font-semibold text-obs-text">
            {title}
          </h3>
          <p className="mt-0.5 text-sm text-obs-sub">{subtitle}</p>
        </div>
        {!empty && (
          <button
            type="button"
            aria-pressed={showTable}
            onClick={() => setShowTable((v) => !v)}
            className="shrink-0 rounded-lg border border-obs-line px-2.5 py-1 text-xs text-obs-sub hover:bg-obs-bg hover:text-obs-text"
          >
            {showTable ? '차트로 보기' : '표로 보기'}
          </button>
        )}
      </div>
      <div className="mt-4">
        {empty ? (
          <p className="flex h-[220px] items-center justify-center text-sm text-obs-sub">{empty}</p>
        ) : showTable ? (
          <table className="w-full text-sm">
            <caption className="sr-only">{table.caption}</caption>
            <thead>
              <tr className="border-b border-obs-line text-left text-obs-sub">
                {table.columns.map((c) => (
                  <th key={c} scope="col" className="py-2 pr-4 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-b border-obs-line/60 last:border-0">
                  {r.map((cell, j) => (
                    <td key={j} className="py-2 pr-4 tabular-nums text-obs-text">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

/** Recharts 툴팁 내용 */
export function TooltipBox({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-lg border border-obs-line bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-obs-text">{title}</p>
      {lines.map((l) => (
        <p key={l} className="text-obs-sub">
          {l}
        </p>
      ))}
    </div>
  );
}
