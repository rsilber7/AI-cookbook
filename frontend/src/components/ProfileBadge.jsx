import { useState } from 'react'
import { api } from '../lib/api'
import { DIETS, dietInfo } from '../lib/labels'
import { useProfile } from '../lib/profile'

// Small corner badge showing the user's diet + allergies; click to edit them.
export default function ProfileBadge() {
  const { profile, setProfile } = useProfile()
  const [open, setOpen] = useState(false)

  if (!profile) return null
  const diet = dietInfo(profile.dietary_system)
  const allergyCount = profile.allergies.length

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100"
      >
        <span aria-hidden>{diet.emoji}</span>
        {diet.label}
        <span className="text-amber-700">·</span>
        {allergyCount ? `${allergyCount} ${allergyCount === 1 ? 'allergy' : 'allergies'}` : 'No allergies'}
      </button>
      {open && (
        <ProfileEditor
          profile={profile}
          onSaved={(updated) => {
            setProfile(updated)
            setOpen(false)
          }}
          onCancel={() => setOpen(false)}
        />
      )}
    </div>
  )
}

function ProfileEditor({ profile, onSaved, onCancel }) {
  const [diet, setDiet] = useState(profile.dietary_system)
  const [allergies, setAllergies] = useState(profile.allergies)
  const [newAllergy, setNewAllergy] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function addAllergy(event) {
    event.preventDefault()
    const value = newAllergy.trim().toLowerCase()
    if (value && !allergies.includes(value)) setAllergies([...allergies, value])
    setNewAllergy('')
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      onSaved(await api('/users/me', { method: 'PATCH', body: { dietary_system: diet, allergies } }))
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl bg-white p-4 text-sm shadow-lg ring-1 ring-stone-200">
      <label className="block">
        <span className="font-medium text-stone-700">Diet</span>
        <select
          value={diet}
          onChange={(e) => setDiet(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5"
        >
          {DIETS.map((d) => (
            <option key={d.value} value={d.value}>{d.emoji} {d.label}</option>
          ))}
        </select>
      </label>

      <p className="mt-4 font-medium text-stone-700">Allergies</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {allergies.length === 0 && <span className="text-stone-400">None</span>}
        {allergies.map((a) => (
          <span key={a} className="flex items-center gap-1 rounded-full bg-stone-100 py-0.5 pl-2.5 pr-1 text-stone-700">
            {a}
            <button
              onClick={() => setAllergies(allergies.filter((x) => x !== a))}
              aria-label={`Remove ${a}`}
              className="rounded-full px-1 text-stone-400 hover:text-stone-700"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <form onSubmit={addAllergy} className="mt-2 flex gap-2">
        <input
          value={newAllergy}
          onChange={(e) => setNewAllergy(e.target.value)}
          placeholder="Add an allergy…"
          className="min-w-0 flex-1 rounded-lg border border-stone-300 px-2 py-1.5"
        />
        <button type="submit" className="rounded-lg px-2.5 ring-1 ring-stone-300 hover:bg-stone-100">Add</button>
      </form>

      {error && <p className="mt-3 text-red-700">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
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
