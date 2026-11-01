export const chartTooltipProps = {
  contentStyle: {
    background: 'var(--popover)',
    color: 'var(--popover-foreground)',
    border: '1px solid var(--border)',
    borderRadius: 'calc(var(--radius) - 2px)',
    fontSize: 12,
  },
  itemStyle: { color: 'var(--popover-foreground)' },
  labelStyle: { color: 'var(--muted-foreground)' },
  cursor: { fill: 'var(--muted)', opacity: 0.5 },
};

export const chartAxisProps = {
  tick: { fontSize: 12, fill: 'var(--muted-foreground)' },
  axisLine: { stroke: 'var(--border)' },
  tickLine: { stroke: 'var(--border)' },
};
