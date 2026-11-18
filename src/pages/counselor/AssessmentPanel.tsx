import { useApp } from '../../context/AppContext';
import { ASSESSMENT_CONFIG } from '../../data/assessment';
import { formatDate } from '../../lib/dates';
import type { Assessment, Student } from '../../types';

const PRE_COLOR = '#7B84AD';
const POST_COLOR = '#3B45A8';

const mean = (a: Assessment) => Math.round((a.scores.reduce((s, x) => s + x, 0) / a.scores.length) * 100) / 100;

/** 사전·사후 정서조절 척도 비교. 문항과 응답 범위는 data/assessment.ts 설정을 따른다 */
export default function AssessmentPanel({ student }: { student: Student }) {
  const { db } = useApp();
  const { items, scaleMin, scaleMax, name } = ASSESSMENT_CONFIG;
  const pick = (t: Assessment['timing']) =>
    db.assessments.filter((a) => a.studentId === student.id && a.timing === t).sort((a, b) => b.takenAt.localeCompare(a.takenAt))[0];
  const pre = pick('사전');
  const post = pick('사후');
  const range = scaleMax - scaleMin;
  const pct = (v: number) => `${((v - scaleMin) / range) * 100}%`;
  const diff = pre && post ? Math.round((mean(post) - mean(pre)) * 100) / 100 : null;

  return (
    <section aria-labelledby="assessment-title" className="rounded-2xl border border-obs-line bg-obs-card p-6">
      <h2 id="assessment-title" className="font-sans text-xl font-semibold">
        사전·사후 {name}
      </h2>
      <p className="mt-0.5 text-sm text-obs-sub">
        {items.length}문항 · {scaleMin}~{scaleMax}점 · 사전은 시작할 때, 사후는 8회기(별빛 행성)에서. 문항 해석(역채점 등)은 척도 문항을 넣은 뒤 확인해 주세요.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-obs-bg p-4">
          <p className="text-sm text-obs-sub">사전 평균</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{pre ? mean(pre) : '-'}</p>
          <p className="text-xs text-obs-sub">{pre ? formatDate(pre.takenAt) : '아직 안 함'}</p>
        </div>
        <div className="rounded-xl bg-obs-bg p-4">
          <p className="text-sm text-obs-sub">사후 평균</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{post ? mean(post) : '-'}</p>
          <p className="text-xs text-obs-sub">{post ? formatDate(post.takenAt) : '8회기(별빛 행성)에서 실시'}</p>
        </div>
        <div className="rounded-xl bg-obs-bg p-4">
          <p className="text-sm text-obs-sub">변화 (사후 − 사전)</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{diff === null ? '-' : `${diff > 0 ? '+' : ''}${diff}`}</p>
          <p className="text-xs text-obs-sub">{diff === null ? '두 번 모두 하면 보여요' : '평균 점수 차이'}</p>
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
          <table className="mt-2 w-full text-left text-sm">
            <thead className="text-xs text-obs-sub">
              <tr className="border-b border-obs-line">
                <th scope="col" className="py-2 pr-3 font-medium">문항</th>
                <th scope="col" className="w-1/2 py-2 pr-3 font-medium">
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
                  </td>
                  <td className="py-2 pr-3" aria-hidden="true">
                    <div className="space-y-1">
                      <div className="h-2 rounded-full bg-obs-bg">
                        <div className="h-full rounded-full" style={{ width: pct(pre.scores[i]), backgroundColor: PRE_COLOR }} />
                      </div>
                      {post && (
                        <div className="h-2 rounded-full bg-obs-bg">
                          <div className="h-full rounded-full" style={{ width: pct(post.scores[i]), backgroundColor: POST_COLOR }} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{pre.scores[i]}</td>
                  <td className="py-2 text-right tabular-nums">{post ? post.scores[i] : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
