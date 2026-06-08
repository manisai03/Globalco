import { Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import { APP_NAME } from '../utils/appBranding';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 text-lg font-bold text-primary-700 dark:text-primary-400">
              <Briefcase className="h-6 w-6" />
              {APP_NAME}
            </div>
            <p className="mt-3 max-w-md text-sm text-slate-500 dark:text-slate-400">
              AI-powered recruitment platform connecting talented professionals with top companies in Hyderabad and beyond.
            </p>
          </div>
          <div>
            <h4 className="font-semibold">Platform</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <li><Link to="/jobs" className="hover:text-primary-600">Browse Jobs</Link></li>
              <li><Link to="/register" className="hover:text-primary-600">Create Account</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold">Contact</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <li>Hitech City, Hyderabad</li>
              <li>support@jobboard.app</li>
            </ul>
          </div>
        </div>
        <p className="mt-8 border-t border-slate-200 pt-8 text-center text-sm text-slate-400 dark:border-slate-800">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
