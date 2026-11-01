import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-7xl font-bold text-primary">404</h1>
      <p className="mt-4 text-xl font-medium">Page not found</p>
      <p className="mt-2 text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild size="lg">
          <Link to="/"><Home />Go Home</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/jobs"><Search />Browse jobs</Link>
        </Button>
      </div>
    </div>
  );
}
