import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  stage: number;
  children?: ReactNode;
}

/** 아직 구현되지 않은 학생 화면 자리 표시 */
export default function ComingSoon({ icon: Icon, title, description, stage, children }: Props) {
  return (
    <section>
      <header className="mb-8">
        <h1 className="text-3xl text-night-text">{title}</h1>
        <p className="mt-2 text-night-sub">{description}</p>
      </header>
      {children}
      <div className="flex items-center gap-4 rounded-2xl border border-dashed border-night-line bg-night-card p-8">
        <Icon aria-hidden="true" className="h-8 w-8 shrink-0 text-night-star" />
        <p className="text-night-sub">이 화면은 {stage}단계에서 만들어질 예정이에요.</p>
      </div>
    </section>
  );
}
