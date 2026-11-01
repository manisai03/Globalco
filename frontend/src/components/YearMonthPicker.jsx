import { Label } from '@/components/ui/label';
import SelectField from './common/SelectField';

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
      {label && <Label className="mb-1 text-xs text-muted-foreground">{label}</Label>}
      <div className="flex gap-2">
        <SelectField
          value={month}
          onValueChange={onMonthChange}
          options={MONTHS}
          emptyLabel="Month"
          aria-label={label ? `${label} month` : 'Month'}
          className="flex-1"
        />
        <SelectField
          value={year}
          onValueChange={onYearChange}
          options={YEARS}
          emptyLabel="Year"
          aria-label={label ? `${label} year` : 'Year'}
          className="flex-1"
        />
      </div>
    </div>
  );
}
