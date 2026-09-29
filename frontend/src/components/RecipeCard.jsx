import { Link } from 'react-router-dom'
import { KOSHER_CATEGORIES, dietInfo, totalMinutes } from '../lib/labels'

export default function RecipeCard({ recipe }) {
  const minutes = totalMinutes(recipe)
  const kosher = KOSHER_CATEGORIES[recipe.kosher_category]

  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className="flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <h3 className="font-serif text-lg leading-snug">
        {recipe.is_pinned && <span className="mr-1" aria-label="Pinned">📌</span>}
        {recipe.title}
      </h3>
      {recipe.description && (
        <p className="mt-1 line-clamp-2 text-sm text-stone-500">{recipe.description}</p>
      )}
      <div className="mt-auto flex flex-wrap gap-1.5 pt-3 text-xs">
        {recipe.dietary_system !== 'none' && (
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-600">
            {dietInfo(recipe.dietary_system).label}
          </span>
        )}
        {kosher && <span className={`rounded-full px-2 py-0.5 ring-1 ${kosher.className}`}>{kosher.label}</span>}
        {minutes && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-600">⏱ {minutes} min</span>}
      </div>
    </Link>
  )
}
