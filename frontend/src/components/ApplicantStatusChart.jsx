import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api, { unwrap } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const STATUS_COLORS = {
  PENDING: '#f59e0b',
  SHORTLISTED: '#3b82f6',
  REJECTED: '#ef4444',
  INTERVIEW_SCHEDULED: '#8b5cf6',
  HIRED: '#10b981',
  WITHDRAWN: '#94a3b8',
};

const STATUS_LABELS = {
  PENDING: 'Pending Review',
  SHORTLISTED: 'Shortlisted',
  REJECTED: 'Rejected',
  INTERVIEW_SCHEDULED: 'Interview Round',
  HIRED: 'Hired',
  WITHDRAWN: 'Withdrawn',
};

const PERIODS = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
];

export default function ApplicantStatusChart() {
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/admin/analytics/applications?period=${period}`)
      .then((res) => setData(unwrap(res)))
      .finally(() => setLoading(false));
  }, [period]);

  const chartData = data
    ? Object.entries(data.statusBreakdown || {})
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({
          name: STATUS_LABELS[status] || status,
          value: count,
          status,
        }))
    : [];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold">Applicant Status Breakdown</h3>
          <p className="text-sm text-slate-500">
            {data?.total ?? 0} applications · {data?.periodLabel}
          </p>
        </div>
        <div className="flex rounded-lg border border-slate-200 p-1 dark:border-slate-700">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                period === p.key
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : chartData.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-500">No applications in this period.</p>
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
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#64748b'} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} applicants`, name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {chartData.map((item) => (
              <div key={item.status} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[item.status] }} />
                <span className="text-slate-600 dark:text-slate-300">{item.name}</span>
                <span className="ml-auto font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
