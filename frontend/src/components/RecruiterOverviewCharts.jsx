import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { chartAxisProps, chartTooltipProps } from '@/lib/chart';
import { STATUS_CHART_COLORS, formatStatus } from '../utils/applicationStatus';

export default function RecruiterOverviewCharts({ jobsByCategory, applicationsByStatus }) {
  const categoryData = Object.entries(jobsByCategory || {}).map(([name, value]) => ({ name, value }));
  const statusData = Object.entries(applicationsByStatus || {}).map(([name, value]) => ({ name, value }));

  return (
    <>
      {categoryData.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Jobs by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData}>
                <XAxis dataKey="name" {...chartAxisProps} />
                <YAxis allowDecimals={false} {...chartAxisProps} />
                <Tooltip {...chartTooltipProps} />
                <Bar dataKey="value" name="Jobs" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
      {statusData.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Applications by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  stroke="var(--card)"
                  label={({ name, value }) => `${formatStatus(name)}: ${value}`}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_CHART_COLORS[entry.name] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip {...chartTooltipProps} formatter={(value, name) => [value, formatStatus(name)]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </>
  );
}
