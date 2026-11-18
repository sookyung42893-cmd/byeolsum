import type { BadgeKind } from '../lib/signals';

const STYLES: Record<BadgeKind, { label: string; className: string }> = {
  'needs-check': { label: '확인 필요', className: 'bg-[#FDECEC] text-[#A1262A] border-[#F3C4C4]' },
  inactive: { label: '3일 이상 미접속', className: 'bg-[#FFF3DF] text-[#7A4A00] border-[#F1D9A8]' },
  maintenance: { label: '유지 모드', className: 'bg-[#E4F5F0] text-[#1C5E4D] border-[#BFE3D8]' },
};

export default function StatusBadge({ kind }: { kind: BadgeKind }) {
  const s = STYLES[kind];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}
