import type { ReactNode } from 'react';

/** 선택형 감정 칩. 선택되면 감정 색으로 채운다. */
export default function Chip({
  selected,
  color = '#F4C979',
  onClick,
  children,
}: {
  selected: boolean;
  color?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm transition ${
        selected ? 'font-medium text-night-bg' : 'text-night-text hover:bg-night-line/60'
      }`}
      style={selected ? { backgroundColor: color, borderColor: color } : { borderColor: `${color}80` }}
    >
      {children}
    </button>
  );
}
