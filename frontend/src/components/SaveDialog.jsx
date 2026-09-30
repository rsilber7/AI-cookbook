import { useState } from 'react'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'
import CollectionPicker from './CollectionPicker'

// Final step for a draft: edit the title, pick collections, and save.
// Existing collections are sent by ID; newly typed ones by name (the backend creates them).
export default function SaveDialog({ draft, onSaved, onClose }) {
  const { data: collections, error: loadError } = useApi('/collections/')
  const [title, setTitle] = useState(draft.title)
  const [pickedIds, setPickedIds] = useState(null)
  const [newNames, setNewNames] = useState([])
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
        <p className="text-xs text-stone-500">Optional: every recipe is always in "All recipes".</p>
        {loadError && <p className="mt-2 text-sm text-red-700">{loadError}</p>}
        <div className="mt-2">
          <CollectionPicker
            collections={collections}
            selected={selected}
            onSelectedChange={setPickedIds}
            newNames={newNames}
            onNewNamesChange={setNewNames}
          />
        </div>

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
