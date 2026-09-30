import { useState } from 'react'

// Checklist of the user's collections plus a box to add new ones by name.
// Existing collections are tracked by ID (`selected`), new ones by name (`newNames`).
export default function CollectionPicker({ collections, selected, onSelectedChange, newNames, onNewNamesChange }) {
  const [newName, setNewName] = useState('')

  const toggle = (id) =>
    onSelectedChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])

  function addNew() {
    const name = newName.trim()
    if (!name) return
    // Typing an existing collection's name just ticks it instead of creating a duplicate
    const existing = collections?.find((c) => c.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      if (!selected.includes(existing.id)) onSelectedChange([...selected, existing.id])
    } else if (!newNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
      onNewNamesChange([...newNames, name])
    }
    setNewName('')
  }

  return (
    <div>
      <div className="max-h-48 space-y-1 overflow-y-auto">
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
            <button type="button" onClick={() => onNewNamesChange(newNames.filter((n) => n !== name))} aria-label={`Remove ${name}`}>
              ×
            </button>
          </div>
        ))}
        {collections?.length === 0 && newNames.length === 0 && (
          <p className="px-2 text-sm text-stone-500">No collections yet. Create one below.</p>
        )}
      </div>
      <div className="mt-2 flex gap-2 text-sm">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addNew()
            }
          }}
          placeholder="+ New collection"
          className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2"
        />
        <button type="button" onClick={addNew} className="rounded-lg px-3 ring-1 ring-stone-300 hover:bg-stone-100">
          Add
        </button>
      </div>
    </div>
  )
}
