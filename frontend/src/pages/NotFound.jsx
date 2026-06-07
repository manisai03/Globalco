import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-primary-600">404</h1>
      <p className="mt-4 text-xl text-slate-600 dark:text-slate-400">Page not found</p>
      <Link to="/" className="mt-6 rounded-xl bg-primary-600 px-6 py-3 font-medium text-white hover:bg-primary-700">
        Go Home
      </Link>
    </div>
  );
}
