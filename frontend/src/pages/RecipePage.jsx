import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BackLink from '../components/BackLink'
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
        <div className="flex gap-2 text-sm">
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
