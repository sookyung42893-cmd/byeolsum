import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useApp, useCurrentStudent } from '../../../context/AppContext';
import { missionById, planetById } from '../../../data/planets';
import { completeMission, progressOf } from '../../../lib/voyage';

/** 연습 화면 공통 틀: 어느 행성의 어떤 연습인지 + 돌아가기 */
export default function PracticeShell({ missionId, children }: { missionId: string; children: ReactNode }) {
  const mission = missionById(missionId)!;
  const planet = planetById(mission.planetId);
  return (
    <div className="max-w-4xl space-y-8">
      <Link to={`/student/planet/${planet.id}`} className="inline-flex items-center gap-1.5 text-sm text-night-sub hover:text-night-text">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        {planet.name} 미션
      </Link>
      <header>
        <p className="flex items-center gap-2 text-sm text-night-sub">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: planet.color }} />
          {planet.name} · 연습 미션
        </p>
        <h1 className="mt-1 text-3xl text-night-text">{mission.title}</h1>
        <p className="mt-2 text-night-sub">{mission.description}</p>
      </header>
      {children}
    </div>
  );
}

/** 연습을 끝냈을 때 미션 완료로 기록하는 함수 */
export function usePracticeComplete(missionId: string) {
  const { db, updateDb } = useApp();
  const student = useCurrentStudent()!;
  const alreadyDone = progressOf(db, student.id, missionId)?.status === '완료';
  return {
    alreadyDone,
    complete: (reflection: string) => updateDb((d) => completeMission(d, student.id, missionId, reflection)),
  };
}

/** 연습을 마친 뒤 보여주는 칸 */
export function PracticeDone({ missionId, children }: { missionId: string; children?: ReactNode }) {
  const planet = planetById(missionById(missionId)!.planetId);
  return (
    <section aria-live="polite" className="rounded-3xl border border-night-star/50 bg-night-card p-6">
      <p className="flex items-center gap-2 text-lg text-night-text">
        <Check aria-hidden="true" className="h-5 w-5 text-emo-calm" />
        연습을 마쳤어. {planet.name} 미션에 기록해 뒀어.
      </p>
      {children}
      <Link
        to={`/student/planet/${planet.id}`}
        className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-night-star px-5 py-2.5 font-medium text-night-bg hover:brightness-105"
      >
        {planet.name}로 돌아가기
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </section>
  );
}
