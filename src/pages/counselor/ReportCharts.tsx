import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartCard, OBS_CHART, TooltipBox } from '../../components/obs/ReportParts';
import { QUADRANTS, QUADRANT_COLOR_ON_LIGHT, type Quadrant } from '../../data/emotions';
import type { dailyPeaks, granularityTrend, quadrantDistribution, strategyEffects, topWords } from '../../lib/metrics';
import { quadrantOf } from '../../data/emotions';

const axisTick = { fill: OBS_CHART.axis, fontSize: 12 };
const labelStyle = { fill: OBS_CHART.text, fontSize: 12 };

// LabelList content 함수의 props는 Recharts 타입이 느슨해서 any로 받는다

export function DailyPeakChart({ data }: { data: ReturnType<typeof dailyPeaks> }) {
  const max = Math.max(...data.map((d) => d.peak ?? -1));
  const empty = data.every((d) => d.peak === null);
  return (
    <ChartCard
      title="요일별 최고 강도"
      subtitle="최근 7일, 그날 기록 중 가장 높은 강도"
      empty={empty ? '최근 7일 동안 기록이 없어요.' : undefined}
      table={{
        caption: '요일별 최고 강도',
        columns: ['날짜', '최고 강도', '기록 수'],
        rows: data.map((d) => [d.label, d.peak ?? '기록 없음', d.count]),
      }}
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 22, right: 8, left: -18, bottom: 0 }} accessibilityLayer>
          <CartesianGrid vertical={false} stroke={OBS_CHART.grid} />
          <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: OBS_CHART.grid }} tick={axisTick} />
          <YAxis domain={[0, 10]} ticks={[0, 5, 10]} tickLine={false} axisLine={false} tick={axisTick} />
          <Tooltip
            cursor={{ fill: '#F0F1F8' }}
            content={({ active, payload }) => {
              const p = active && payload?.[0]?.payload;
              if (!p) return null;
              return (
                <TooltipBox title={p.label} lines={[p.peak === null ? '기록 없음' : `최고 강도 ${p.peak}`, `기록 ${p.count}번`]} />
              );
            }}
          />
          <Bar dataKey="peak" fill={OBS_CHART.accent} radius={[4, 4, 0, 0]} maxBarSize={24}>
            <LabelList
              dataKey="peak"
              content={(props: any) =>
                props.value === max ? (
                  <text x={props.x + props.width / 2} y={props.y - 6} textAnchor="middle" {...labelStyle} fontWeight={600}>
                    {props.value}
                  </text>
                ) : null
              }
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function StrategyEffectChart({ data }: { data: ReturnType<typeof strategyEffects> }) {
  const used = data.filter((d) => d.count > 0);
  const lo = Math.min(0, ...used.map((d) => d.avgDrop ?? 0));
  const hi = Math.max(4, ...used.map((d) => Math.ceil(d.avgDrop ?? 0)));
  const rows = data.map((d) => ({ ...d, value: d.avgDrop ?? 0 }));
  return (
    <ChartCard
      title="전략별 효과"
      subtitle="최근 2주, 사용 전 강도에서 사용 후 실제 강도까지 내려간 평균"
      empty={used.length === 0 ? '최근 2주 동안 사용한 전략이 없어요.' : undefined}
      table={{
        caption: '전략별 효과',
        columns: ['전략', '평균 감소', '사용 횟수'],
        rows: data.map((d) => [d.strategy, d.avgDrop === null ? '-' : `${d.avgDrop}점`, `${d.count}회`]),
      }}
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 96, left: 8, bottom: 0 }} accessibilityLayer>
          <CartesianGrid horizontal={false} stroke={OBS_CHART.grid} />
          <XAxis type="number" domain={[lo, hi]} tickLine={false} axisLine={false} tick={axisTick} allowDecimals={false} />
          <YAxis type="category" dataKey="strategy" width={104} tickLine={false} axisLine={{ stroke: OBS_CHART.grid }} tick={axisTick} />
          <Tooltip
            cursor={{ fill: '#F0F1F8' }}
            content={({ active, payload }) => {
              const p = active && payload?.[0]?.payload;
              if (!p) return null;
              return (
                <TooltipBox
                  title={p.strategy}
                  lines={p.count ? [`평균 ${p.avgDrop}점 감소`, `${p.count}회 사용`] : ['최근 2주 사용 없음']}
                />
              );
            }}
          />
          <Bar dataKey="value" fill={OBS_CHART.accent} radius={[0, 4, 4, 0]} maxBarSize={20}>
            <LabelList
              dataKey="value"
              content={(props: any) => {
                const d = rows[props.index];
                const x = props.x + Math.max(props.width, 0) + 8;
                return (
                  <text x={x} y={props.y + props.height / 2 + 4} {...labelStyle}>
                    {d.count ? `${d.avgDrop}점 · ${d.count}회` : '사용 없음'}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function EmotionDistributionChart({
  data,
  words,
}: {
  data: ReturnType<typeof quadrantDistribution>;
  words: ReturnType<typeof topWords>;
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const rows = data.map((d) => ({ ...d, label: QUADRANTS[d.quadrant].label }));
  return (
    <ChartCard
      title="감정 분포"
      subtitle={`최근 7일, 기록 ${total}개의 사분면`}
      empty={total === 0 ? '최근 7일 동안 기록이 없어요.' : undefined}
      table={{
        caption: '감정 분포',
        columns: ['사분면', '기록 수', '비율'],
        rows: [
          ...rows.map((d) => [d.label, d.count, `${d.pct}%`]),
          ...words.map((w) => [`자주 쓴 감정: ${w.word}`, w.count, '']),
        ],
      }}
    >
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 80, left: 8, bottom: 0 }} accessibilityLayer>
          <XAxis type="number" hide domain={[0, Math.max(1, ...rows.map((r) => r.count))]} />
          <YAxis type="category" dataKey="label" width={118} tickLine={false} axisLine={{ stroke: OBS_CHART.grid }} tick={axisTick} />
          <Tooltip
            cursor={{ fill: '#F0F1F8' }}
            content={({ active, payload }) => {
              const p = active && payload?.[0]?.payload;
              if (!p) return null;
              return <TooltipBox title={p.label} lines={[`${p.count}번 · ${p.pct}%`]} />;
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {rows.map((r) => (
              <Cell key={r.quadrant} fill={QUADRANT_COLOR_ON_LIGHT[r.quadrant as Quadrant]} />
            ))}
            <LabelList
              dataKey="count"
              content={(props: any) => (
                <text x={props.x + props.width + 8} y={props.y + props.height / 2 + 4} {...labelStyle}>
                  {`${rows[props.index].count}번 · ${rows[props.index].pct}%`}
                </text>
              )}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {words.length > 0 && (
        <div className="mt-3 border-t border-obs-line pt-3">
          <p className="text-xs text-obs-sub">자주 쓴 감정 단어</p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-obs-text">
            {words.map((w) => (
              <li key={w.word} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: QUADRANT_COLOR_ON_LIGHT[quadrantOf(w.sample.valence, w.sample.arousal)] }}
                />
                {w.word}
                <span className="text-obs-sub">{w.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}

export function GranularityChart({ data }: { data: ReturnType<typeof granularityTrend> }) {
  const lastIdx = data.map((d) => d.ratio !== null).lastIndexOf(true);
  return (
    <ChartCard
      title="정서 세분화 추이"
      subtitle="주별로 세부 감정 없이 상위 감정만 고른 비율 (낮을수록 세밀하게 구분)"
      empty={lastIdx < 0 ? '아직 기록이 없어요.' : undefined}
      table={{
        caption: '정서 세분화 추이',
        columns: ['주', '상위 감정만 고른 비율', '상위만 / 전체'],
        rows: data.map((d) => [d.label, d.ratio === null ? '기록 없음' : `${d.ratio}%`, `${d.broadOnly} / ${d.total}`]),
      }}
    >
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 22, right: 24, left: -12, bottom: 0 }} accessibilityLayer>
          <CartesianGrid vertical={false} stroke={OBS_CHART.grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: OBS_CHART.grid }} tick={axisTick} padding={{ left: 24, right: 24 }} />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            tickFormatter={(v) => `${v}%`}
            tickLine={false}
            axisLine={false}
            tick={axisTick}
          />
          <Tooltip
            cursor={{ stroke: OBS_CHART.grid }}
            content={({ active, payload }) => {
              const p = active && payload?.[0]?.payload;
              if (!p) return null;
              return (
                <TooltipBox
                  title={p.label}
                  lines={p.ratio === null ? ['기록 없음'] : [`상위 감정만 ${p.broadOnly}/${p.total}번`, `${p.ratio}%`]}
                />
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="ratio"
            stroke={OBS_CHART.accent}
            strokeWidth={2}
            connectNulls
            dot={{ r: 4, fill: OBS_CHART.accent, stroke: '#FFFFFF', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: OBS_CHART.accent, stroke: '#FFFFFF', strokeWidth: 2 }}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="ratio"
              content={(props: any) =>
                props.index === lastIdx ? (
                  <text x={props.x} y={props.y - 12} textAnchor="middle" {...labelStyle} fontWeight={600}>
                    {props.value}%
                  </text>
                ) : null
              }
            />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
