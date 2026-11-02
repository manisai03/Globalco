import { Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { APP_NAME } from '../utils/appBranding';
import { useAuth } from '../context/auth';

export default function Footer() {
  const { user, isAdmin } = useAuth();
  return (
    <footer className="mt-auto border-t bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 text-lg font-bold text-primary">
              <Briefcase className="size-6" />
              {APP_NAME}
            </div>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              AI-powered recruitment platform connecting talented professionals with top companies in Hyderabad and beyond.
            </p>
          </div>
          <div>
            <h4 className="font-semibold">Platform</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/jobs" className="transition-colors hover:text-primary">Browse Jobs</Link></li>
              {user ? (
                <li>
                  <Link to={isAdmin ? '/admin' : '/dashboard'} className="transition-colors hover:text-primary">
                    {isAdmin ? 'Recruiter dashboard' : 'My dashboard'}
                  </Link>
                </li>
              ) : (
                <li><Link to="/register" className="transition-colors hover:text-primary">Create Account</Link></li>
              )}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold">Contact</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Hitech City, Hyderabad</li>
              <li>support@jobboard.app</li>
            </ul>
          </div>
        </div>
        <Separator className="mt-8" />
        <p className="pt-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
