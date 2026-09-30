import { Link, useNavigate } from 'react-router-dom'
import CollectionTile from '../components/CollectionTile'
import NewCollectionTile from '../components/NewCollectionTile'
import RecipeCard from '../components/RecipeCard'
import { QUICK_IDEAS, surpriseIdea } from '../lib/ideas'
import { tabColor } from '../lib/labels'
import { useProfile } from '../lib/profile'
import { tipOfTheDay } from '../lib/tips'
import { useApi } from '../lib/useApi'

// How many collections to show before the "…" tile (plus the "All recipes" tile)
const COLLECTIONS_SHOWN = 5
// Pinned cards sit at slightly different angles, like cards stuck to a board
const TILTS = ['-rotate-1', 'rotate-1', 'rotate-0', 'rotate-2', '-rotate-2']

const ideaLink = (prompt) => `/create?mode=generate&prompt=${encodeURIComponent(prompt)}`

export default function Home() {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const recipes = useApi('/recipes/')
  const collections = useApi('/collections/')

  const error = recipes.error || collections.error
  if (error) return <p className="text-red-700">Couldn’t load your cookbook: {error}</p>
  if (!recipes.data || !collections.data) return <p className="font-hand text-2xl text-stone-500">Opening your cookbook…</p>

  const pinned = recipes.data.filter((r) => r.is_pinned)
  const shownCollections = collections.data.slice(0, COLLECTIONS_SHOWN)
  const hiddenCount = collections.data.length - shownCollections.length
  const tip = tipOfTheDay(profile?.dietary_system ?? 'none')

  return (
    <div className="space-y-12">
      <section className="grid gap-6 md:grid-cols-[1fr_17rem] md:items-start">
        <div>
          <h1 className="font-display text-4xl font-bold">
            What’s <span className="text-tomato">cooking</span>?
          </h1>
          <p className="mt-1 font-hand text-2xl text-basil">pick a spark, or start from scratch with 🍳</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {QUICK_IDEAS.map((idea) => (
              <Link
                key={idea.label}
                to={ideaLink(idea.prompt)}
                className="rounded-full bg-paper px-4 py-2 font-medium shadow-sm ring-1 ring-amber-900/10 transition hover:-translate-y-0.5 hover:bg-butter/30"
              >
                {idea.emoji} {idea.label}
              </Link>
            ))}
            <button
              onClick={() => navigate(ideaLink(surpriseIdea()))}
              className="hover-wiggle rounded-full bg-blueberry px-4 py-2 font-medium text-white shadow-sm transition hover:-translate-y-0.5"
            >
              <span className="wiggle-target inline-block">🎲</span> Surprise me
            </button>
          </div>
        </div>

        <aside className="tape relative rotate-1 rounded-2xl bg-butter/25 p-4 shadow-sm ring-1 ring-butter/60">
          <p className="font-hand text-xl text-amber-900">Tip of the day</p>
          <p className="mt-1 text-stone-800">
            <span aria-hidden>{tip.emoji} </span>
            {tip.text}
          </p>
        </aside>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold">📌 Pinned</h2>
        {pinned.length ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pinned.map((recipe, i) => (
              <RecipeCard key={recipe.id} recipe={recipe} className={`tape ${TILTS[i % TILTS.length]}`} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-stone-500">
            Nothing pinned yet. Open a recipe and tap <span className="whitespace-nowrap">📌 Pin</span> to keep it here.
          </p>
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold">📚 Collections</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CollectionTile
            to="/collections/all"
            emoji="🍽️"
            name="All recipes"
            color="border-l-stone-400"
            subtitle={`${recipes.data.length} ${recipes.data.length === 1 ? 'recipe' : 'recipes'}`}
          />
          {shownCollections.map((c, i) => (
            <CollectionTile key={c.id} to={`/collections/${c.id}`} name={c.name} color={tabColor(i)} />
          ))}
          {hiddenCount > 0 && (
            <Link
              to="/collections"
              className="flex items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 p-4 text-stone-500 hover:border-stone-400 hover:text-stone-700"
            >
              … {hiddenCount} more
            </Link>
          )}
          <NewCollectionTile onCreated={(c) => collections.setData([...collections.data, c])} />
        </div>
      </section>
    </div>
  )
}
