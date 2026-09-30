import { Link } from 'react-router-dom'

// A collection styled like a colored cookbook tab divider
export default function CollectionTile({ to, emoji = '📁', name, subtitle, color = 'border-l-tomato' }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 rounded-r-2xl border-l-8 bg-paper p-4 shadow-sm ring-1 ring-amber-900/10 transition hover:translate-x-1 hover:shadow-md ${color}`}
    >
      <span className="text-2xl" aria-hidden>{emoji}</span>
      <span className="min-w-0">
        <span className="block truncate font-display text-lg font-medium">{name}</span>
        {subtitle && <span className="block text-sm text-stone-500">{subtitle}</span>}
      </span>
    </Link>
  )
}
