import { Navigate, useParams } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useApp, useCurrentAccount } from '../../context/AppContext';
import { checkInsInWeek, lastCheckIn } from '../../lib/selectors';
import { studentBadges } from '../../lib/signals';
import { daysUntil, formatDate, formatDateTime, relativeDays } from '../../lib/dates';
import {
  RECENT_DAYS,
  dailyPeaks,
  forecastGap,
  granularityTrend,
  highMoments,
  meteorHalfLife,
  quadrantDistribution,
  round1,
  strategyEffects,
  timePatternSummary,
  topWords,
  weeklyCompare,
} from '../../lib/metrics';
import { QUADRANT_COLOR_ON_LIGHT, emotionLabel, quadrantOf } from '../../data/emotions';
import StatusBadge from '../../components/StatusBadge';
import { stationOfSession } from '../../data/planets';
import VoyagePanel from './VoyagePanel';
import ChallengePanel from './ChallengePanel';
import AssessmentPanel from './AssessmentPanel';
import { CrisisHistory } from './Crisis';
import { StatTile } from '../../components/obs/ReportParts';
import { DailyPeakChart, EmotionDistributionChart, GranularityChart, StrategyEffectChart } from './ReportCharts';
function deltaText(current: number | null, previous: number | null, unit: string) {
  if (current === null || previous === null) return { diff: null, text: '지난주 기록이 없어 비교할 수 없어요' };
  const diff = round1(current - previous);
  if (diff === 0) return { diff, text: `지난주(${round1(previous)}${unit})와 같아요` };
  return { diff, text: `지난주 ${round1(previous)}${unit}보다 ${Math.abs(diff)}${unit} ${diff > 0 ? '많아요' : '적어요'}` };
}

export default function StudentReport() {
  const { db } = useApp();
  const account = useCurrentAccount();
  const { studentId } = useParams();
  // 다른 상담사의 학생은 주소를 알아도 볼 수 없다
  const student = db.students.find((s) => s.id === studentId && s.counselorId === account?.id);
  if (!student) return <Navigate to="/observatory" replace />;

  const badges = studentBadges(db, student);
  const last = lastCheckIn(db, student.id);
  const next = student.nextSessionDate;
  const dDay = next ? daysUntil(next) : null;

  const weekly = weeklyCompare(db, student.id);
  const half = meteorHalfLife(db, student.id);
  const gap = forecastGap(db, student.id);
  const thisWeek = checkInsInWeek(db, student.id, 0);
  const moments = highMoments(db, student.id);
  const consent = db.consents.find((c) => c.studentId === student.id);
  const contacts = db.trustedContacts.filter((c) => c.studentId === student.id);

  const avgCur = weekly.avgIntensity.current;
  const intensityDelta = deltaText(avgCur, weekly.avgIntensity.previous, '점');
  intensityDelta.text = intensityDelta.text.replace('많아요', '높아요').replace('적어요', '낮아요');

  return (
    <article aria-labelledby="report-title" className="space-y-8 pb-12">
      <header>
        <div className="flex items-center gap-3">
          <h1 id="report-title" className="text-3xl">
            {student.name} 회기 준비 리포트
          </h1>
          <div className="flex gap-1.5">
            {badges.map((b) => (
              <StatusBadge key={b} kind={b} />
            ))}
          </div>
        </div>
        <p className="mt-2 text-sm text-obs-sub">
          현재 {student.currentSession}회기 · {stationOfSession(student.currentSession).name} · {student.mode} · 다음 회기{' '}
          {next ? `${formatDate(next + 'T00:00:00')} (${dDay === 0 ? '오늘' : `D-${dDay}`})` : '아직 정하지 않음'} · 마지막 기록{' '}
          {last ? `${formatDateTime(last.timestamp)} (${relativeDays(last.timestamp)})` : '없음'} ·{' '}
          {consent ? `${formatDate(consent.agreedAt)} 동의 · 보호자 동의 ${consent.guardianConsent ? '받음' : '확인 필요'}` : '아직 동의 전'} · 연락할 사람{' '}
          {contacts.length}명
        </p>
      </header>

      <CrisisHistory student={student} />

      <section aria-labelledby="kpi-title">
        <h2 id="kpi-title" className="sr-only">
          핵심 지표
        </h2>
        <div className="grid grid-cols-4 gap-4">
          <StatTile
            label="이번 주 감정 기록"
            help="학생이 밤하늘에 감정 별을 띄운(체크인한) 횟수예요."
            value={String(weekly.count.current)}
            unit="회"
            delta={deltaText(weekly.count.current, weekly.count.previous, '회')}
          />
          <StatTile
            label="이번 주 감정 세기 평균"
            help="기록한 감정이 얼마나 셌는지 평균 (0~10). 높을수록 센 감정이 많았어요."
            value={avgCur === null ? '-' : String(round1(avgCur))}
            unit={avgCur === null ? undefined : '/ 10'}
            delta={intensityDelta}
          />
          <StatTile
            label="감정이 반으로 줄기까지"
            help="별똥별로 감정을 지켜볼 때, 가장 셀 때의 세기가 절반으로 내려가기까지 걸린 시간. 짧을수록 감정이 빨리 가라앉아요."
            value={half.avgMinutes === null ? '-' : String(round1(half.avgMinutes))}
            unit={half.avgMinutes === null ? undefined : '분'}
            note={
              half.total === 0
                ? `최근 ${RECENT_DAYS}일 동안 별똥별을 쓴 기록이 없어요`
                : `최근 ${RECENT_DAYS}일 별똥별 ${half.total}번 중 ${half.reached}번 절반까지 내려갔어요`
            }
          />
          <StatTile
            label="기술 쓰고 예상 vs 실제"
            help="렌즈·호흡 같은 기술을 쓰기 전 '쓰고 나면 몇 점쯤 될까' 예상한 세기와 실제 세기의 차이예요. 마이너스면 예상보다 더 가라앉았다는 뜻이에요."
            value={gap.avg === null ? '-' : `${gap.avg > 0 ? '+' : ''}${round1(gap.avg)}`}
            unit={gap.avg === null ? undefined : '점'}
            note={
              gap.avg === null
                ? `최근 ${RECENT_DAYS}일 동안 기술을 쓴 기록이 없어요`
                : gap.avg < 0
                  ? `예상보다 평균 ${Math.abs(round1(gap.avg))}점 더 가라앉았어요 (${gap.count}번)`
                  : gap.avg > 0
                    ? `예상보다 평균 ${round1(gap.avg)}점 덜 가라앉았어요 (${gap.count}번)`
                    : `예상과 실제가 평균적으로 같았어요 (${gap.count}번)`
            }
          />
        </div>
      </section>

      <section aria-labelledby="charts-title">
        <h2 id="charts-title" className="sr-only">
          차트
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <DailyPeakChart data={dailyPeaks(db, student.id)} />
          <StrategyEffectChart data={strategyEffects(db, student.id)} />
          <EmotionDistributionChart data={quadrantDistribution(thisWeek)} words={topWords(thisWeek)} />
          <GranularityChart data={granularityTrend(db, student.id)} />
        </div>
      </section>

      <section aria-labelledby="moments-title" className="rounded-2xl border border-obs-line bg-obs-card p-6">
        <h2 id="moments-title" className="font-sans text-base font-semibold">
          회기에서 다뤄볼 순간
        </h2>
        <p className="mt-0.5 text-sm text-obs-sub">최근 {RECENT_DAYS}일, 강도 7 이상 기록을 시간순으로</p>
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-obs-bg px-4 py-3 text-sm font-medium text-obs-text">
          <Clock aria-hidden="true" className="h-4 w-4 shrink-0 text-obs-accent" />
          {timePatternSummary(moments.map((m) => m.checkIn))}
        </p>
        {moments.length > 0 && (
          <ol className="mt-4 divide-y divide-obs-line">
            {moments.map(({ checkIn: c, uses }) => (
              <li key={c.id} className="grid grid-cols-[160px_150px_64px_1fr] items-start gap-4 py-3 text-sm">
                <span className="tabular-nums text-obs-sub">{formatDateTime(c.timestamp)}</span>
                <span className="flex items-center gap-2 text-obs-text">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: QUADRANT_COLOR_ON_LIGHT[quadrantOf(c.valence, c.arousal)] }}
                  />
                  {emotionLabel(c)}
                </span>
                <span className="font-semibold text-obs-text">강도 {c.intensity}</span>
                <span>
                  <span className="text-obs-text">{c.situation || '(상황 메모 없음)'}</span>
                  {uses.map((u) => (
                    <span key={u.id} className="mt-1 block text-xs text-obs-sub">
                      {u.strategy} 사용 · 예보 {u.predictedAfter} → 실제 {u.actualAfter}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <VoyagePanel student={student} />

      <ChallengePanel student={student} />

      <AssessmentPanel student={student} />
    </article>
  );
}
