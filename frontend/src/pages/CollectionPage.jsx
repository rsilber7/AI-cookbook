import { useParams } from 'react-router-dom'
import BackLink from '../components/BackLink'
import RecipeCard from '../components/RecipeCard'
import { useApi } from '../lib/useApi'

// Shows one collection's recipes, or every recipe for /collections/all
export default function CollectionPage() {
  const { id } = useParams()
  const isAll = id === undefined
  const recipes = useApi(isAll ? '/recipes/' : `/collections/${id}/recipes`)
  const collections = useApi(isAll ? null : '/collections/')

  const name = isAll ? 'All recipes' : collections.data?.find((c) => c.id === id)?.name
  const error = recipes.error || collections.error

  return (
    <div>
      <BackLink />
      <h1 className="mt-2 font-serif text-3xl">{name ?? ' '}</h1>
      {error && <p className="mt-4 text-red-700">{error}</p>}
      {!recipes.data && !error && <p className="mt-4 text-stone-500">Loading…</p>}
      {recipes.data?.length === 0 && <p className="mt-4 text-stone-500">No recipes here yet.</p>}
      {recipes.data?.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.data.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}
        </div>
      )}
    </div>
  )
}
