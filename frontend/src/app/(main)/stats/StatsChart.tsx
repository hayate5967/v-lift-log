'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { StatsMetric, StatsPoint } from '@/lib/api/types';

const METRIC_LABELS: Record<StatsMetric, string> = {
  maxWeight: '最大重量(kg)',
  est1RM: '推定1RM(kg)',
  maxVelocity: '最大速度(m/s)',
};

export function StatsChart({
  points,
  metric,
}: {
  points: StatsPoint[];
  metric: StatsMetric;
}) {
  if (points.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        この条件に合う記録がまだありません。
      </p>
    );
  }

  const data = points.map((point) => ({
    date: new Date(point.performedAt).toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
    }),
    value: Math.round(point.value * 100) / 100,
  }));

  return (
    <div className="flex h-72 w-full flex-col gap-2">
      <p className="text-sm font-medium text-zinc-700">
        {METRIC_LABELS[metric]}
      </p>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} width={40} />
          <Tooltip
            formatter={(value) => [String(value), METRIC_LABELS[metric]]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2563eb"
            strokeWidth={2}
            dot
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
