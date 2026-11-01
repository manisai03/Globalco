import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { STATUS_BADGE_CLASSES, formatStatus } from '../../utils/applicationStatus';

export default function StatusBadge({ status, className }) {
  return (
    <Badge className={cn('px-3 py-1', STATUS_BADGE_CLASSES[status] || STATUS_BADGE_CLASSES.PENDING, className)}>
      {formatStatus(status)}
    </Badge>
  );
}
