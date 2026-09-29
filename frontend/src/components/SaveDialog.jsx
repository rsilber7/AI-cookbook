import { useState } from 'react'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'

// Final step for a draft: edit the title, pick collections, and save.
// Existing collections are sent by ID; newly typed ones by name (the backend creates them).
export default function SaveDialog({ draft, onSaved, onClose }) {
  const { data: collections, error: loadError } = useApi('/collections/')
  const [title, setTitle] = useState(draft.title)
  const [pickedIds, setPickedIds] = useState(null)
  const [newNames, setNewNames] = useState([])
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Until the user changes anything, pre-select the draft's collections
  // (e.g. the original's collections when adapting a saved recipe)
  const draftNames = draft.collection_names.map((n) => n.toLowerCase())
  const selected =
    pickedIds ??
    (collections ?? [])
      .filter((c) => draft.collection_ids.includes(c.id) || draftNames.includes(c.name.toLowerCase()))
      .map((c) => c.id)

  const toggle = (id) => setPickedIds(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])

  function addNew(event) {
    event.preventDefault()
    const name = newName.trim()
    if (!name) return
    const existing = collections?.find((c) => c.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      if (!selected.includes(existing.id)) setPickedIds([...selected, existing.id])
    } else if (!newNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
      setNewNames([...newNames, name])
    }
    setNewName('')
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const saved = await api('/recipes/', {
        method: 'POST',
        body: { ...draft, title: title.trim() || draft.title, collection_ids: selected, collection_names: newNames },
      })
      onSaved(saved)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-stone-900/40 p-4 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 id="save-title" className="font-serif text-2xl">Save recipe</h2>

        <label className="mt-4 block text-sm">
          <span className="font-medium text-stone-700">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-base"
          />
        </label>

        <p className="mt-5 text-sm font-medium text-stone-700">Add to collections</p>
        {loadError && <p className="mt-2 text-sm text-red-700">{loadError}</p>}
        <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
          {collections?.map((c) => (
            <label key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-stone-50">
              <input
                type="checkbox"
                checked={selected.includes(c.id)}
                onChange={() => toggle(c.id)}
                className="h-4 w-4 accent-amber-700"
              />
              📁 {c.name}
            </label>
          ))}
          {newNames.map((name) => (
            <div key={name} className="flex items-center justify-between rounded-lg bg-emerald-50 px-2 py-1.5 text-emerald-900">
              <span>✨ {name} <span className="text-xs text-emerald-700">(new)</span></span>
              <button onClick={() => setNewNames(newNames.filter((n) => n !== name))} aria-label={`Remove ${name}`}>×</button>
            </div>
          ))}
          {collections?.length === 0 && newNames.length === 0 && (
            <p className="px-2 text-sm text-stone-500">No collections yet. Create one below, or skip it: the recipe will still be in "All recipes".</p>
          )}
        </div>
        <form onSubmit={addNew} className="mt-2 flex gap-2 text-sm">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="+ New collection"
            className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2"
          />
          <button type="submit" className="rounded-lg px-3 ring-1 ring-stone-300 hover:bg-stone-100">Add</button>
        </form>

        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-stone-600 hover:bg-stone-100">Cancel</button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save recipe'}
          </button>
        </div>
      </div>
    </div>
  )
}
