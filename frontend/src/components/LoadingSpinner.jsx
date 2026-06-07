import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ fullScreen = false }) {
  const spinner = <Loader2 className="h-8 w-8 animate-spin text-primary-600" />;
  if (fullScreen) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">{spinner}</div>
    );
  }
  return spinner;
}
