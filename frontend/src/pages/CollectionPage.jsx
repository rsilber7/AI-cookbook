import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BackLink from '../components/BackLink'
import RecipeCard from '../components/RecipeCard'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'

// Shows one collection's recipes (with rename / delete / remove), or every recipe for /collections/all
export default function CollectionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isAll = id === undefined
  const recipes = useApi(isAll ? '/recipes/' : `/collections/${id}/recipes`)
  const collections = useApi(isAll ? null : '/collections/')
  const [renaming, setRenaming] = useState(false)
  const [actionError, setActionError] = useState(null)

  const collection = collections.data?.find((c) => c.id === id)
  const name = isAll ? 'All recipes' : collection?.name
  const error = recipes.error || collections.error
  const notFound = !isAll && collections.data && !collection

  async function removeRecipe(recipe) {
    setActionError(null)
    try {
      await api(`/collections/${id}/recipes/${recipe.id}`, { method: 'DELETE' })
      recipes.setData(recipes.data.filter((r) => r.id !== recipe.id))
    } catch (e) {
      setActionError(e.message)
    }
  }

  async function deleteCollection() {
    const message = `Delete the collection "${name}"?\n\nThe recipes in it won't be deleted: they stay in "All recipes" and any other collections.`
    if (!confirm(message)) return
    try {
      await api(`/collections/${id}`, { method: 'DELETE' })
      navigate('/')
    } catch (e) {
      setActionError(e.message)
    }
  }

  if (notFound) {
    return (
      <div>
        <BackLink />
        <p className="mt-4 text-stone-500">This collection doesn't exist anymore.</p>
      </div>
    )
  }

  return (
    <div>
      <BackLink />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        {renaming ? (
          <RenameForm
            collection={collection}
            onRenamed={(updated) => {
              collections.setData(collections.data.map((c) => (c.id === updated.id ? updated : c)))
              setRenaming(false)
            }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <h1 className="font-serif text-3xl">{name ?? ' '}</h1>
        )}
        {!isAll && collection && !renaming && (
          <div className="flex gap-2 text-sm">
            <button onClick={() => setRenaming(true)} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-stone-300 hover:bg-stone-100">
              ✏️ Rename
            </button>
            <button onClick={deleteCollection} className="rounded-lg bg-white px-3 py-1.5 text-red-700 ring-1 ring-red-200 hover:bg-red-50">
              🗑 Delete
            </button>
          </div>
        )}
      </div>

      {(error || actionError) && <p className="mt-4 text-red-700">{error || actionError}</p>}
      {!recipes.data && !error && <p className="mt-4 text-stone-500">Loading…</p>}
      {recipes.data?.length === 0 && (
        <p className="mt-4 text-stone-500">
          {isAll
            ? 'No recipes yet. Tap 🍳 New recipe to make your first one.'
            : 'No recipes here yet. Open any recipe and use "Collections → Edit" to add it.'}
        </p>
      )}
      {recipes.data?.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.data.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} onRemove={isAll ? undefined : () => removeRecipe(recipe)} />
          ))}
        </div>
      )}
    </div>
  )
}

function RenameForm({ collection, onRenamed, onCancel }) {
  const [name, setName] = useState(collection.name)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      onRenamed(await api(`/collections/${collection.id}`, { method: 'PATCH', body: { name } }))
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="flex w-full flex-wrap items-center gap-2">
      <input
        autoFocus
        required
        maxLength={100}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
        className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-1.5 font-serif text-2xl"
      />
      <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100">
        Cancel
      </button>
      <button type="submit" disabled={saving} className="rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60">
        {saving ? 'Saving…' : 'Save'}
      </button>
      {error && <p className="w-full text-sm text-red-700">{error}</p>}
    </form>
  )
}
