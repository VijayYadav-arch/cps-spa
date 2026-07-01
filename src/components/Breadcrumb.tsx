import { Link } from 'react-router-dom';

export interface Crumb {
  label: string;
  to?: string;
}

/**
 * Compact breadcrumb / back trail for pages nested below a section (e.g. the clinician
 * workspace). The last crumb is the current page (plain text); earlier crumbs link back.
 * Complements the sidebar with an explicit in-page way back.
 */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" data-testid="breadcrumb" className="mb-3 flex flex-wrap items-center gap-1.5 text-sm">
      {items.map((it, i) => (
        <span key={`${it.label}-${i}`} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden="true" className="text-slate-300">›</span>}
          {it.to ? (
            <Link to={it.to} className="text-teal-700 hover:underline">{it.label}</Link>
          ) : (
            <span className="font-medium text-slate-600" aria-current="page">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
