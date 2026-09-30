import { useState } from 'react'
import { dietInfo } from '../lib/labels'
import { useProfile } from '../lib/profile'

const QUICK_ALLERGIES = ['dairy', 'gluten', 'eggs', 'peanuts', 'shellfish']

// The diet/allergy rules for one AI request: toggles for the saved profile,
// plus one-off extra allergies. rules = {apply_dietary, apply_allergies, extra_allergies}
export default function RulesPanel({ rules, onChange }) {
  const { profile } = useProfile()
  const [custom, setCustom] = useState('')

  const set = (changes) => onChange({ ...rules, ...changes })
  const toggleExtra = (allergy) =>
    set({
      extra_allergies: rules.extra_allergies.includes(allergy)
        ? rules.extra_allergies.filter((a) => a !== allergy)
        : [...rules.extra_allergies, allergy],
    })

  // Enter adds the typed allergy (not a <form>: this panel sits inside the create form)
  function addCustom(event) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const value = custom.trim().toLowerCase()
    if (value && !rules.extra_allergies.includes(value)) set({ extra_allergies: [...rules.extra_allergies, value] })
    setCustom('')
  }

  const diet = profile && dietInfo(profile.dietary_system)
  const chips = [...new Set([...QUICK_ALLERGIES, ...rules.extra_allergies])]

  return (
    <fieldset className="space-y-3 rounded-xl bg-stone-100/70 p-4 text-sm">
      <legend className="sr-only">Rules for this recipe</legend>
      {profile && profile.dietary_system !== 'none' && (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={rules.apply_dietary}
            onChange={(e) => set({ apply_dietary: e.target.checked })}
            className="h-4 w-4 accent-amber-700"
          />
          Use my diet ({diet.emoji} {diet.label})
        </label>
      )}
      {profile && profile.allergies.length > 0 && (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={rules.apply_allergies}
            onChange={(e) => set({ apply_allergies: e.target.checked })}
            className="h-4 w-4 accent-amber-700"
          />
          Avoid my allergies ({profile.allergies.join(', ')})
        </label>
      )}

      <div>
        <p className="text-stone-600">Also make it free of:</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((allergy) => {
            const on = rules.extra_allergies.includes(allergy)
            return (
              <button
                key={allergy}
                type="button"
                onClick={() => toggleExtra(allergy)}
                aria-pressed={on}
                className={`rounded-full px-2.5 py-1 ring-1 ${
                  on ? 'bg-emerald-600 text-white ring-emerald-600' : 'bg-white text-stone-700 ring-stone-300 hover:bg-stone-50'
                }`}
              >
                {on ? '✓ ' : ''}{allergy}
              </button>
            )
          })}
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={addCustom}
            placeholder="+ other"
            aria-label="Add another allergy (press Enter)"
            className="w-24 rounded-full bg-white px-2.5 py-1 ring-1 ring-stone-300 focus:outline-none focus:ring-amber-600"
          />
        </div>
      </div>
    </fieldset>
  )
}
