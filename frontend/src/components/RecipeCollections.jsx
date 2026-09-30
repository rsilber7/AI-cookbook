import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'
import CollectionPicker from './CollectionPicker'

// Which collections a saved recipe is in, with an editor to add, remove, or move it.
export default function RecipeCollections({ recipeId }) {
  const memberships = useApi(`/recipes/${recipeId}/collections`)
  const [editing, setEditing] = useState(false)

  return (
    <section className="mt-4 rounded-2xl bg-white p-4 text-sm ring-1 ring-stone-200">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium text-stone-700">Collections</h3>
        {!editing && memberships.data && (
          <button onClick={() => setEditing(true)} className="text-amber-800 hover:underline">
            Edit
          </button>
        )}
      </div>
      {memberships.error && <p className="mt-2 text-red-700">{memberships.error}</p>}

      {!editing && memberships.data && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {memberships.data.length === 0 && <span className="text-stone-500">Not in any collection (it's in "All recipes").</span>}
          {memberships.data.map((c) => (
            <Link key={c.id} to={`/collections/${c.id}`} className="rounded-full bg-stone-100 px-2.5 py-1 hover:bg-stone-200">
              📁 {c.name}
            </Link>
          ))}
        </div>
      )}

      {editing && (
        <CollectionsEditor
          recipeId={recipeId}
          current={memberships.data}
          onDone={(updated) => {
            memberships.setData(updated)
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      )}
    </section>
  )
}

function CollectionsEditor({ recipeId, current, onDone, onCancel }) {
  const { data: collections } = useApi('/collections/')
  const [selected, setSelected] = useState(current.map((c) => c.id))
  const [newNames, setNewNames] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      onDone(
        await api(`/recipes/${recipeId}/collections`, {
          method: 'PUT',
          body: { collection_ids: selected, collection_names: newNames },
        }),
      )
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="mt-3">
      <p className="mb-2 text-stone-500">Tick the collections this recipe belongs in. To move it, untick one and tick another.</p>
      <CollectionPicker
        collections={collections}
        selected={selected}
        onSelectedChange={setSelected}
        newNames={newNames}
        onNewNamesChange={setNewNames}
      />
      {error && <p className="mt-2 text-red-700">{error}</p>}
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-lg px-3 py-1.5 text-stone-600 hover:bg-stone-100">Cancel</button>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-amber-700 px-3 py-1.5 font-medium text-white hover:bg-amber-800 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
