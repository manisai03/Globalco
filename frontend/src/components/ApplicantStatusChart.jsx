import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { chartTooltipProps } from '@/lib/chart';
import api, { unwrap } from '../services/api';
import { STATUS_CHART_COLORS, formatStatus } from '../utils/applicationStatus';
import { pluralize } from '../utils/formatters';

const PERIODS = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
];

export default function ApplicantStatusChart({ refreshKey = 0 }) {
  const [period, setPeriod] = useState('month');
  const [result, setResult] = useState({ key: null, data: null, failed: false });
  const requestKey = `${period}|${refreshKey}`;

  useEffect(() => {
    let cancelled = false;
    api.get(`/api/admin/analytics/applications?period=${period}`)
      .then((res) => { if (!cancelled) setResult({ key: requestKey, data: unwrap(res), failed: false }); })
      .catch(() => { if (!cancelled) setResult({ key: requestKey, data: null, failed: true }); });
    return () => { cancelled = true; };
  }, [period, requestKey]);

  const loading = result.key !== requestKey;
  const data = loading ? null : result.data;

  const chartData = data
    ? Object.entries(data.statusBreakdown || {})
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({
          name: formatStatus(status),
          value: count,
          status,
        }))
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Applicant Status Breakdown</CardTitle>
        <CardDescription>
          {loading
            ? 'Loading…'
            : result.failed
              ? 'Could not load statistics'
              : `${pluralize(data?.total ?? 0, 'application')} · ${data?.periodLabel ?? ''}`}
        </CardDescription>
        <CardAction>
          <Tabs value={period} onValueChange={setPeriod}>
            <TabsList>
              {PERIODS.map((p) => (
                <TabsTrigger key={p.key} value={p.key} className="px-3 text-xs">{p.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardAction>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <Skeleton className="size-48 rounded-full" />
            <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-9" />)}
            </div>
          </div>
        ) : result.failed ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Statistics are unavailable right now. Try again in a moment.</p>
        ) : chartData.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No applications in this period.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  stroke="var(--card)"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_CHART_COLORS[entry.status] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip {...chartTooltipProps} formatter={(value, name) => [pluralize(value, 'applicant'), name]} />
              </PieChart>
            </ResponsiveContainer>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {chartData.map((item) => (
                <div key={item.status} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                  <span className="size-3 rounded-full" style={{ backgroundColor: STATUS_CHART_COLORS[item.status] }} />
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="ml-auto font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
