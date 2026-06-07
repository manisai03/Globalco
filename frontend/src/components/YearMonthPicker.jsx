const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1979 }, (_, i) => String(currentYear - i));

export default function YearMonthPicker({ label, month, year, onMonthChange, onYearChange }) {
  return (
    <div>
      {label && <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>}
      <div className="flex gap-2">
        <select
          value={month || ''}
          onChange={(e) => onMonthChange(e.target.value)}
          className="flex-1 rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">Month</option>
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <select
          value={year || ''}
          onChange={(e) => onYearChange(e.target.value)}
          className="flex-1 rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">Year</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
