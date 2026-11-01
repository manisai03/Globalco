import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const EMPTY = '__empty__';

/**
 * Radix Select forbids "" as an item value, so an `emptyLabel` option is mapped to a sentinel
 * and reported back to callers as "".
 */
export default function SelectField({
  value,
  onValueChange,
  options,
  placeholder,
  emptyLabel,
  className,
  id,
  disabled,
  size,
  'aria-label': ariaLabel,
}) {
  const normalized = (value ?? '') === '' ? (emptyLabel ? EMPTY : undefined) : String(value);

  return (
    <Select
      value={normalized}
      onValueChange={(v) => onValueChange(v === EMPTY ? '' : v)}
      disabled={disabled}
    >
      <SelectTrigger id={id} size={size} className={cn('w-full', className)} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder ?? emptyLabel} />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-72">
        {emptyLabel && <SelectItem value={EMPTY}>{emptyLabel}</SelectItem>}
        {options.map((opt) => {
          const o = typeof opt === 'object' ? opt : { value: opt, label: opt };
          return (
            <SelectItem key={o.value} value={String(o.value)}>
              {o.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
