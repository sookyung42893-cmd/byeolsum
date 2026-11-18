import type { ReactNode } from 'react';
import { BODY_PARTS, type BodyPart } from '../types';
import Chip from './Chip';

const BASE = '#222A55';
const EDGE = '#3A4478';

/**
 * 몸 지도. 그림의 부위를 눌러도 되고, 아래 칩(실제 버튼)으로 골라도 된다.
 * 그림은 마우스용 보조 수단이라 스크린리더에는 숨기고, 칩이 같은 선택을 맡는다.
 */
export default function BodyMap({
  value,
  onChange,
  color,
  readOnly = false,
}: {
  value: BodyPart | null;
  onChange: (part: BodyPart | null) => void;
  color: string;
  /** 바디스캔 안내처럼 보여주기만 할 때: 칩을 숨기고 그림도 누를 수 없다 */
  readOnly?: boolean;
}) {
  const toggle = (p: BodyPart) => {
    if (!readOnly) onChange(value === p ? null : p);
  };

  const Part = ({ part, children }: { part: BodyPart; children: ReactNode }) => {
    const on = value === part;
    return (
      <g
        onClick={() => toggle(part)}
        className={readOnly ? undefined : 'cursor-pointer transition-opacity hover:opacity-90'}
        fill={on ? color : BASE}
        fillOpacity={on ? 0.9 : 1}
        stroke={on ? '#FFFFFF' : EDGE}
        strokeWidth={on ? 2 : 1.5}
      >
        <title>{part}</title>
        {children}
      </g>
    );
  };

  return (
    <div className="flex items-start gap-6">
      <svg viewBox="0 0 200 330" className="w-40 shrink-0" aria-hidden="true">
        <defs>
          <filter id="body-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        {value && <circle cx={GLOW[value].x} cy={GLOW[value].y} r={GLOW[value].r} fill={color} opacity={0.45} filter="url(#body-glow)" />}

        <Part part="다리">
          <rect x={72} y={212} width={25} height={110} rx={11} />
          <rect x={103} y={212} width={25} height={110} rx={11} />
        </Part>
        <Part part="팔·손">
          <rect x={36} y={84} width={22} height={118} rx={11} />
          <rect x={142} y={84} width={22} height={118} rx={11} />
          <circle cx={47} cy={210} r={11} />
          <circle cx={153} cy={210} r={11} />
        </Part>
        <Part part="배">
          <rect x={68} y={156} width={64} height={56} rx={12} />
        </Part>
        <Part part="가슴">
          <rect x={64} y={100} width={72} height={54} rx={12} />
        </Part>
        <Part part="목·어깨">
          <path d="M 88 66 h 24 v 10 q 30 2 34 22 h -92 q 4 -20 34 -22 z" />
        </Part>
        <Part part="머리">
          <circle cx={100} cy={36} r={30} />
        </Part>
        <Part part="얼굴">
          <ellipse cx={100} cy={44} rx={16} ry={17} />
        </Part>
      </svg>

      {!readOnly && <div role="group" aria-label="감정을 느낀 몸 위치" className="flex flex-wrap gap-2">
        {BODY_PARTS.map((p) => (
          <Chip key={p} selected={value === p} color={color} onClick={() => toggle(p)}>
            {p}
          </Chip>
        ))}
      </div>}
    </div>
  );
}

const GLOW: Record<BodyPart, { x: number; y: number; r: number }> = {
  머리: { x: 100, y: 30, r: 34 },
  얼굴: { x: 100, y: 44, r: 24 },
  '목·어깨': { x: 100, y: 84, r: 40 },
  가슴: { x: 100, y: 127, r: 40 },
  배: { x: 100, y: 184, r: 36 },
  '팔·손': { x: 100, y: 150, r: 70 },
  다리: { x: 100, y: 268, r: 50 },
};
