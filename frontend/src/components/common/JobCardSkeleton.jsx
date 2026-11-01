import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function JobCardSkeleton() {
  return (
    <Card className="gap-0 p-5">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/2" />
      <div className="mt-4 flex gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </Card>
  );
}
