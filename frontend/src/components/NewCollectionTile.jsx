import { useState } from 'react'
import { api } from '../lib/api'

// A "+ New collection" tile that turns into a name box; creates an empty collection.
export default function NewCollectionTile({ onCreated }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function create(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      onCreated(await api('/collections/', { method: 'POST', body: { name } }))
      setName('')
      setEditing(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 p-4 text-stone-500 hover:border-amber-400 hover:text-amber-800"
      >
        <span className="text-xl leading-none">+</span> New collection
      </button>
    )
  }

  return (
    <form onSubmit={create} className="rounded-2xl bg-white p-3 ring-2 ring-amber-300">
      <input
        autoFocus
        required
        maxLength={100}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
        placeholder="Collection name"
        className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
      />
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
      <div className="mt-2 flex justify-end gap-1.5 text-sm">
        <button type="button" onClick={() => setEditing(false)} className="rounded-lg px-2.5 py-1 text-stone-600 hover:bg-stone-100">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="rounded-lg bg-amber-700 px-2.5 py-1 font-medium text-white disabled:opacity-60">
          {saving ? 'Creating…' : 'Create'}
        </button>
      </div>
    </form>
  )
}
