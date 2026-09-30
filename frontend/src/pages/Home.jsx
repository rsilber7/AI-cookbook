import { Link } from 'react-router-dom'
import CollectionTile from '../components/CollectionTile'
import RecipeCard from '../components/RecipeCard'
import { useApi } from '../lib/useApi'

// How many collections to show before the "…" tile (plus the "All recipes" tile)
const COLLECTIONS_SHOWN = 5

export default function Home() {
  const recipes = useApi('/recipes/')
  const collections = useApi('/collections/')

  const error = recipes.error || collections.error
  if (error) return <p className="text-red-700">Couldn't load your cookbook: {error}</p>
  if (!recipes.data || !collections.data) return <p className="text-stone-500">Loading your cookbook…</p>

  const pinned = recipes.data.filter((r) => r.is_pinned)
  const shownCollections = collections.data.slice(0, COLLECTIONS_SHOWN)
  const hiddenCount = collections.data.length - shownCollections.length

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-serif text-2xl">📌 Pinned</h2>
        {pinned.length ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pinned.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}
          </div>
        ) : (
          <p className="mt-3 text-stone-500">
            Nothing pinned yet. Open a recipe and tap <span className="whitespace-nowrap">📌 Pin</span> to keep it here.
          </p>
        )}
      </section>

      <section>
        <h2 className="font-serif text-2xl">📚 Collections</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CollectionTile
            to="/collections/all"
            emoji="🍽️"
            name="All recipes"
            subtitle={`${recipes.data.length} ${recipes.data.length === 1 ? 'recipe' : 'recipes'}`}
          />
          {shownCollections.map((c) => (
            <CollectionTile key={c.id} to={`/collections/${c.id}`} name={c.name} />
          ))}
          {hiddenCount > 0 && (
            <Link
              to="/collections"
              className="flex items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 p-4 text-stone-500 hover:border-stone-400 hover:text-stone-700"
            >
              … {hiddenCount} more
            </Link>
          )}
        </div>
      </section>
    </div>
  )
}
