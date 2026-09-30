import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import BackLink from '../components/BackLink'
import RecipeCollections from '../components/RecipeCollections'
import RecipeView from '../components/RecipeView'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'

export default function RecipePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: recipe, setData: setRecipe, error } = useApi(`/recipes/${id}`)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  async function run(action) {
    setBusy(true)
    setActionError(null)
    try {
      await action()
    } catch (e) {
      setActionError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const togglePin = () =>
    run(async () => setRecipe(await api(`/recipes/${id}`, { method: 'PATCH', body: { is_pinned: !recipe.is_pinned } })))

  const remove = () => {
    if (!confirm(`Delete "${recipe.title}"? This can't be undone.`)) return
    run(async () => {
      await api(`/recipes/${id}`, { method: 'DELETE' })
      navigate('/')
    })
  }

  if (error) return <p className="text-red-700">{error}</p>
  if (!recipe) return <p className="text-stone-500">Loading…</p>

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink />
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            to={`/recipes/${recipe.id}/edit`}
            className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-stone-300 hover:bg-stone-100"
          >
            ✏️ Edit
          </Link>
          <Link
            to={`/create?mode=modify&base=${recipe.id}`}
            className="rounded-lg bg-amber-700 px-3 py-1.5 font-medium text-white hover:bg-amber-800"
          >
            🔄 Adapt with AI
          </Link>
          <button
            onClick={togglePin}
            disabled={busy}
            className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-stone-300 hover:bg-stone-100 disabled:opacity-60"
          >
            {recipe.is_pinned ? '📌 Unpin' : '📌 Pin'}
          </button>
          <button
            onClick={remove}
            disabled={busy}
            className="rounded-lg bg-white px-3 py-1.5 text-red-700 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      </div>
      {actionError && <p className="mt-3 text-red-700">{actionError}</p>}

      <RecipeCollections recipeId={recipe.id} />

      <div className="mt-4">
        <RecipeView recipe={recipe} />
      </div>

      {recipe.original_text && (
        <details className="mt-4 rounded-xl bg-white p-4 text-sm ring-1 ring-stone-200">
          <summary className="cursor-pointer text-stone-600">Original text</summary>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-stone-600">{recipe.original_text}</pre>
        </details>
      )}
    </div>
  )
}
