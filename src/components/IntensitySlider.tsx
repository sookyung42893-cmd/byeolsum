import { useId } from 'react';

/** 0~10 강도 슬라이더 (실제 label 연결) */
export default function IntensitySlider({
  label,
  value,
  onChange,
  color = '#F4C979',
  hideLabel = false,
  minLabel = '0 거의 없음',
  maxLabel = '10 아주 셈',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color?: string;
  hideLabel?: boolean;
  /** 양 끝 설명 (기분 점수처럼 강도가 아닌 척도에 쓴다) */
  minLabel?: string;
  maxLabel?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'mb-2 block text-sm text-night-text'}>
        {label}
      </label>
      <div className="flex items-center gap-4">
        <input
          id={id}
          type="range"
          min={0}
          max={10}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: color }}
        />
        <output htmlFor={id} className="w-10 text-right font-display text-2xl text-night-text">
          {value}
        </output>
      </div>
      <div className="mt-1 flex justify-between text-xs text-night-sub">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
