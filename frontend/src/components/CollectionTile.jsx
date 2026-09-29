import { Link } from 'react-router-dom'

export default function CollectionTile({ to, emoji = '📁', name, subtitle }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="text-2xl" aria-hidden>{emoji}</span>
      <span className="min-w-0">
        <span className="block truncate font-medium">{name}</span>
        {subtitle && <span className="block text-sm text-stone-500">{subtitle}</span>}
      </span>
    </Link>
  )
}
