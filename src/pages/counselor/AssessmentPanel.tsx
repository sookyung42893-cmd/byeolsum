import { useApp } from '../../context/AppContext';
import { ASSESSMENT_CONFIG, isReverseItem, scoredItem, subscaleScores, totalScore, TOTAL_MAX } from '../../data/assessment';
import { formatDate } from '../../lib/dates';
import type { Assessment, Student } from '../../types';

const PRE_COLOR = '#7B84AD';
const POST_COLOR = '#3B45A8';

/** 사전·사후 DERS 비교. 점수는 역채점 반영 후 합이고, 높을수록 정서조절 곤란이 크다 */
export default function AssessmentPanel({ student }: { student: Student }) {
  const { db } = useApp();
  const { items, scaleMin, scaleMax, name } = ASSESSMENT_CONFIG;
  const pick = (t: Assessment['timing']) =>
    db.assessments.filter((a) => a.studentId === student.id && a.timing === t).sort((a, b) => b.takenAt.localeCompare(a.takenAt))[0];
  const pre = pick('사전');
  const post = pick('사후');
  const range = scaleMax - scaleMin;
  const pct = (v: number, max = scaleMax, min = scaleMin) => `${((v - min) / (max - min || range)) * 100}%`;
  const preTotal = pre ? totalScore(pre.scores) : null;
  const postTotal = post ? totalScore(post.scores) : null;
  const diff = preTotal !== null && postTotal !== null ? postTotal - preTotal : null;
  const preSub = pre ? subscaleScores(pre.scores) : [];
  const postSub = post ? subscaleScores(post.scores) : [];

  const Bars = ({ a, b, max }: { a: number; b?: number; max: number }) => (
    <div className="space-y-1" aria-hidden="true">
      <div className="h-2 rounded-full bg-obs-bg">
        <div className="h-full rounded-full" style={{ width: pct(a, max, 0), backgroundColor: PRE_COLOR }} />
      </div>
      {b !== undefined && (
        <div className="h-2 rounded-full bg-obs-bg">
          <div className="h-full rounded-full" style={{ width: pct(b, max, 0), backgroundColor: POST_COLOR }} />
        </div>
      )}
    </div>
  );

  return (
    <section aria-labelledby="assessment-title" className="rounded-2xl border border-obs-line bg-obs-card p-6">
      <h2 id="assessment-title" className="font-sans text-xl font-semibold">
        사전·사후 {name}
      </h2>
      <p className="mt-0.5 text-sm text-obs-sub">
        {items.length}문항 · {scaleMin}~{scaleMax}점 · 총점 0~{TOTAL_MAX}점, 낮을수록 정서조절 곤란이 적어요. 역채점 문항은 {scaleMax}−응답으로 바꿔 더했어요. 사전은 시작할 때, 사후는 8회기(별빛 행성)에서.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-obs-bg p-4">
          <p className="text-sm text-obs-sub">사전 총점</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{preTotal ?? '-'}</p>
          <p className="text-xs text-obs-sub">{pre ? formatDate(pre.takenAt) : '아직 안 함'}</p>
        </div>
        <div className="rounded-xl bg-obs-bg p-4">
          <p className="text-sm text-obs-sub">사후 총점</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{postTotal ?? '-'}</p>
          <p className="text-xs text-obs-sub">{post ? formatDate(post.takenAt) : '8회기(별빛 행성)에서 실시'}</p>
        </div>
        <div className="rounded-xl bg-obs-bg p-4">
          <p className="text-sm text-obs-sub">변화 (사후 − 사전)</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{diff === null ? '-' : `${diff > 0 ? '+' : ''}${diff}`}</p>
          <p className="text-xs text-obs-sub">
            {diff === null ? '두 번 모두 하면 보여요' : diff < 0 ? '곤란이 줄었어요' : diff > 0 ? '곤란이 늘었어요' : '변화 없음'}
          </p>
        </div>
      </div>

      {pre && (
        <>
          <ul className="mt-5 flex gap-5 text-xs text-obs-sub" aria-label="막대 색 안내">
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: PRE_COLOR }} />
              사전
            </li>
            {post && (
              <li className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: POST_COLOR }} />
                사후
              </li>
            )}
          </ul>

          <h3 className="mt-4 font-sans text-base font-semibold">하위척도</h3>
          <table className="mt-1 w-full text-left text-sm">
            <thead className="text-xs text-obs-sub">
              <tr className="border-b border-obs-line">
                <th scope="col" className="py-2 pr-3 font-medium">하위척도</th>
                <th scope="col" className="w-1/2 py-2 pr-3 font-medium">
                  <span className="sr-only">막대</span>
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">사전</th>
                <th scope="col" className="py-2 text-right font-medium">사후</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-obs-line">
              {preSub.map((s, i) => (
                <tr key={s.name}>
                  <td className="py-2 pr-3 text-obs-text">{s.name}</td>
                  <td className="py-2 pr-3">
                    <Bars a={s.score} b={postSub[i]?.score} max={s.max} />
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {s.score}<span className="text-obs-sub">/{s.max}</span>
                  </td>
                  <td className="py-2 text-right tabular-nums">{postSub[i] ? postSub[i].score : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <details className="mt-5">
            <summary className="cursor-pointer font-sans text-base font-semibold">문항별 응답 보기</summary>
            <p className="mt-1 text-xs text-obs-sub">숫자는 학생이 고른 응답(0~4)이고, 막대는 역채점을 반영한 곤란 점수예요.</p>
            <table className="mt-2 w-full text-left text-sm">
              <thead className="text-xs text-obs-sub">
                <tr className="border-b border-obs-line">
                  <th scope="col" className="py-2 pr-3 font-medium">문항</th>
                  <th scope="col" className="w-2/5 py-2 pr-3 font-medium">
                    <span className="sr-only">막대</span>
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">사전</th>
                  <th scope="col" className="py-2 text-right font-medium">사후</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-obs-line">
                {items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-3 text-obs-text">
                      {i + 1}. {item}
                      {isReverseItem(i) && (
                        <span className="ml-1.5 rounded bg-obs-bg px-1.5 py-0.5 text-xs text-obs-sub">역채점</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <Bars
                        a={scoredItem(i, pre.scores[i])}
                        b={post ? scoredItem(i, post.scores[i]) : undefined}
                        max={scaleMax}
                      />
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{pre.scores[i]}</td>
                    <td className="py-2 text-right tabular-nums">{post ? post.scores[i] : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  );
}
