import { Link } from 'react-router-dom';

export default function EmptyState({ icon: Icon, title, description, actionLabel, actionTo, onAction }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
      {Icon && <Icon className="h-12 w-12 text-slate-300 dark:text-slate-600" />}
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>}
      {(actionLabel && actionTo) && (
        <Link to={actionTo} className="btn-primary mt-6">{actionLabel}</Link>
      )}
      {(actionLabel && onAction) && (
        <button type="button" onClick={onAction} className="btn-primary mt-6">{actionLabel}</button>
      )}
    </div>
  );
}
