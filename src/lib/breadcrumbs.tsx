import { Link } from '@tanstack/react-router'

type Crumb = { label: string; to?: string; search?: Record<string, unknown> }

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-600 mb-5">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-slate-700">/</span>}
            {crumb.to && !isLast ? (
              <Link
                to={crumb.to}
                search={crumb.search as any}
                className="hover:text-slate-400 transition-colors"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-slate-400' : ''}>{crumb.label}</span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
