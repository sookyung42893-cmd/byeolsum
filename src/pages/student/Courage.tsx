import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CornerDownRight, Lock } from 'lucide-react';
import { useApp, useCurrentStudent } from '../../context/AppContext';
import { COURAGE_STATION, planetById } from '../../data/planets';
import { courageChallenges, courageStars, courageStatus } from '../../lib/voyage';
import { formatDate } from '../../lib/dates';
import CourageStarIcon from '../../components/codex/CourageStarIcon';
import type { Challenge } from '../../types';

const STATUS_TEXT: Record<Challenge['status'], string> = {
  보냄: '도착한 도전',
  '실행 전 기록': '하기 전 마음을 적어 둠',
  완료: '시도함',
  '다음 주로': '다음 주로 넘김',
};

/**
 * 용기 구간 (6~7회기, UP-A 모듈 7 정서 노출).
 * 미리 정해진 행성 미션이 없고, 회기에서 상담 선생님과 함께 정한 도전 미션이 이곳에 모인다.
 * 발견물 대신 용기의 별 개수를 보여준다.
 */
export default function CouragePage() {
  const { db } = useApp();
  const student = useCurrentStudent()!;
  const status = courageStatus(student);
  const list = courageChallenges(db, student.id);
  const stars = courageStars(db, student.id, true);
  const st = COURAGE_STATION;

  return (
    <div className="space-y-8">
      <Link to="/student/map" className="inline-flex items-center gap-1.5 text-sm text-night-sub hover:text-night-text">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        항해 지도
      </Link>

      <header>
        <p className="flex items-center gap-2 text-sm text-night-sub">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: st.color }} />
          6~7회기 · UP-A {st.upaModule} · {status === '완료' ? '지나온 구간' : status === '탐사중' ? '지금 머무는 곳' : '아직 잠긴 구간'}
        </p>
        <h1 className="mt-1 text-3xl text-night-text">{st.name}</h1>
        <p className="mt-2 max-w-2xl leading-relaxed text-night-sub">
          행성이 아니라 빛 구름 사이를 지나는 구간이야. 미리 정해진 미션 대신, 회기에서 선생님과 함께 정한 도전 미션으로
          피하던 것에 한 걸음씩 다가가 봐. 해 본 것만으로 용기의 별이 하나씩 떠.
        </p>
      </header>

      <section
        aria-labelledby="courage-stars"
        className="flex items-center gap-[4%] rounded-3xl border p-6"
        style={{
          borderColor: stars > 0 ? st.color : '#222A55',
          background: stars > 0 ? `radial-gradient(circle at 12% 50%, ${st.color}2E 0%, #151B3A 55%)` : '#151B3A',
        }}
      >
        <div className="min-w-0 flex-1">
          <h2 id="courage-stars" className="font-sans text-sm text-night-sub">
            이 구간의 용기의 별
          </h2>
          <p className="mt-1 font-display text-2xl text-night-text">{stars}개</p>
          {stars > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label={`용기의 별 ${stars}개`}>
              {Array.from({ length: stars }, (_, i) => (
                <li key={i}>
                  <CourageStarIcon />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-night-sub">
              {status === '잠김'
                ? '6회기가 되면 이 구간에 도착해. 그 전에도 선생님이 도전 미션을 보내 줄 수 있어.'
                : '도전 미션을 시도하면 결과와 상관없이 별이 하나 떠.'}
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="courage-list" className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <h2 id="courage-list" className="font-sans text-lg font-medium text-night-text">
            이 구간에서 받은 도전 미션
          </h2>
          <Link to="/student/challenge" className="inline-flex items-center gap-1.5 text-sm text-night-star underline-offset-4 hover:underline">
            도전 미션 화면으로
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
        {status === '잠김' && list.length === 0 ? (
          <p className="flex items-center gap-2 rounded-2xl border border-night-line bg-night-card p-5 text-sm text-night-sub">
            <Lock aria-hidden="true" className="h-4 w-4" />
            아직 잠긴 구간이야.
          </p>
        ) : list.length === 0 ? (
          <p className="rounded-2xl border border-night-line bg-night-card p-5 text-sm text-night-sub">
            아직 도착한 도전 미션이 없어. 회기에서 선생님과 함께 정하면 여기에 모여.
          </p>
        ) : (
          <ul className="space-y-3">
            {list.map((c) => (
              <li key={c.id} className="rounded-2xl border border-night-line bg-night-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-night-sub">
                  <span>
                    {c.session}회기 · {c.step}단계 · {formatDate(c.createdAt)}
                  </span>
                  <span className={c.status === '완료' ? 'text-night-star' : ''}>
                    {c.status === '다음 주로' && <CornerDownRight aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />}
                    {STATUS_TEXT[c.status]}
                  </span>
                </div>
                <p className="mt-2 font-medium text-night-text">{c.title}</p>
                {c.predicted !== undefined && (
                  <p className="mt-1 text-sm text-night-sub">
                    마음 점수: 하기 전 예상 <span className="text-night-text">{c.predicted}</span>
                    {c.actual !== undefined && (
                      <>
                        {' '}→ 하고 나서 <span className="text-night-text">{c.actual}</span>
                      </>
                    )}
                  </p>
                )}
                {c.reflection && <p className="mt-2 rounded-xl bg-night-bg/70 px-3 py-2 text-sm text-night-text">{c.reflection}</p>}
                {c.linkedSkills.length > 0 && (
                  <p className="mt-2 text-xs text-night-sub">챙겨간 기술: {c.linkedSkills.map((id) => planetById(id).name).join(', ')}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
