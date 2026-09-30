import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BackLink from '../components/BackLink'
import CollectionPicker from '../components/CollectionPicker'
import { api } from '../lib/api'
import { parseAmount } from '../lib/amounts'
import { DIETS, KOSHER_CATEGORIES, formatAmount } from '../lib/labels'
import { useProfile } from '../lib/profile'
import { useApi } from '../lib/useApi'

const input = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2'
const emptyIngredient = () => ({ amount: '', unit: '', name: '', notes: '' })
const emptyStep = () => ({ instruction: '', minutes: '', temp: '' })

// /recipes/new (write a recipe by hand) and /recipes/:id/edit (edit a saved one)
export default function RecipeEditorPage() {
  const { id } = useParams()
  const { profile } = useProfile()
  const existing = useApi(id ? `/recipes/${id}` : null)

  if (existing.error) return <p className="text-red-700">{existing.error}</p>
  if ((id && !existing.data) || !profile) return <p className="text-stone-500">Loading…</p>
  return <RecipeForm key={id ?? 'new'} existing={existing.data} profile={profile} />
}

function RecipeForm({ existing, profile }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState(existing?.title ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [servings, setServings] = useState(existing?.yield_servings?.toString() ?? '')
  const [prep, setPrep] = useState(existing?.prep_time_mins?.toString() ?? '')
  const [cook, setCook] = useState(existing?.cook_time_mins?.toString() ?? '')
  const [ingredients, setIngredients] = useState(
    existing?.ingredients.length
      ? existing.ingredients.map((i) => ({
          amount: formatAmount(i.amount), unit: i.unit ?? '', name: i.name, notes: i.notes ?? '',
        }))
      : [emptyIngredient(), emptyIngredient(), emptyIngredient()],
  )
  const [steps, setSteps] = useState(
    existing?.steps.length
      ? existing.steps.map((s) => ({
          instruction: s.instruction, minutes: s.duration_mins?.toString() ?? '', temp: s.temp_f?.toString() ?? '',
        }))
      : [emptyStep()],
  )
  const [tags, setTags] = useState(existing?.tags.join(', ') ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [diet, setDiet] = useState(existing?.dietary_system ?? profile.dietary_system)
  const [kosherCategory, setKosherCategory] = useState(existing?.kosher_category ?? '')
  const [allergies, setAllergies] = useState(existing?.allergies_applied ?? profile.allergies)
  const [newAllergy, setNewAllergy] = useState('')

  // Collections are only picked here for new recipes; saved ones use the recipe page's Collections section
  const collections = useApi(existing ? null : '/collections/')
  const [collectionIds, setCollectionIds] = useState([])
  const [collectionNames, setCollectionNames] = useState([])

  const [problems, setProblems] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const updateRow = (rows, setRows, index, changes) =>
    setRows(rows.map((row, i) => (i === index ? { ...row, ...changes } : row)))
  const removeRow = (rows, setRows, index) => setRows(rows.filter((_, i) => i !== index))

  function addAllergy() {
    const value = newAllergy.trim().toLowerCase()
    if (value && !allergies.includes(value)) setAllergies([...allergies, value])
    setNewAllergy('')
  }

  // Everything except the title is optional: blank rows are dropped, blank numbers become null
  function buildRecipe() {
    const wholeNumber = (value, label) => {
      if (!value.trim()) return null
      const n = Number(value)
      if (!Number.isInteger(n) || n < 0) throw new Error(`${label} must be a whole number.`)
      return n
    }
    const builtIngredients = ingredients
      .filter((row) => row.name.trim())
      .map((row) => {
        const amount = parseAmount(row.amount)
        // Non-numbers like "a pinch" or "to taste" are kept as part of the note
        const vague = Number.isNaN(amount) ? row.amount.trim() : ''
        return {
          name: row.name.trim(),
          amount: vague ? null : amount,
          unit: row.unit.trim() || null,
          notes: [vague, row.notes.trim()].filter(Boolean).join(', ') || null,
        }
      })
    const builtSteps = steps
      .filter((row) => row.instruction.trim())
      .map((row, i) => ({
        order: i + 1,
        instruction: row.instruction.trim(),
        duration_mins: wholeNumber(row.minutes, `Step ${i + 1} minutes`),
        temp_f: wholeNumber(row.temp, `Step ${i + 1} temperature`),
      }))
    if (diet === 'kosher' && !kosherCategory) throw new Error('Pick meat, dairy, or parve for a kosher recipe.')
    return {
      title: title.trim(),
      description: description.trim() || null,
      yield_servings: wholeNumber(servings, 'Servings'),
      prep_time_mins: wholeNumber(prep, 'Prep time'),
      cook_time_mins: wholeNumber(cook, 'Cook time'),
      ingredients: builtIngredients,
      steps: builtSteps,
      tags: tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
      notes: notes.trim() || null,
      dietary_system: diet,
      kosher_category: diet === 'kosher' ? kosherCategory : null,
      allergies_applied: allergies,
    }
  }

  // Save runs the free label check first; "Save without those labels" drops only the labels that failed
  async function save({ dropFailedLabels = false } = {}) {
    setError(null)
    let recipe
    try {
      recipe = buildRecipe()
    } catch (e) {
      return setError(e.message)
    }
    setSaving(true)
    try {
      if (dropFailedLabels) {
        const broken = new Set(problems.map((p) => p.label))
        if (broken.has('kosher')) Object.assign(recipe, { dietary_system: 'none', kosher_category: null })
        recipe.allergies_applied = recipe.allergies_applied.filter((a) => !broken.has(a.toLowerCase()))
      } else {
        setProblems(null)
        const { problems: found } = await api('/recipes/check', {
          method: 'POST',
          body: {
            ingredients: recipe.ingredients,
            dietary_system: recipe.dietary_system,
            kosher_category: recipe.kosher_category,
            allergies: recipe.allergies_applied,
          },
        })
        if (found.length) return setProblems(found)
      }
      const saved = existing
        ? await api(`/recipes/${existing.id}`, { method: 'PATCH', body: recipe })
        : await api('/recipes/', {
            method: 'POST',
            body: { ...recipe, source: 'manual', collection_ids: collectionIds, collection_names: collectionNames },
          })
      navigate(`/recipes/${saved.id}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink to={existing ? `/recipes/${existing.id}` : '/'} label={existing ? 'Back to recipe' : 'Back to cookbook'} />
      <h1 className="mt-2 font-serif text-3xl">{existing ? '✏️ Edit recipe' : '✍️ Write a recipe'}</h1>
      <p className="mt-1 text-sm text-stone-500">Only the title is required. Leave out anything you don't need.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
        className="mt-6 space-y-6"
      >
        <section className="space-y-3">
          <label className="block">
            <span className="font-medium text-stone-700">Title</span>
            <input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className={`mt-1 ${input}`} />
          </label>
          <label className="block">
            <span className="font-medium text-stone-700">Description</span>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={`mt-1 ${input}`} />
          </label>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <NumberField label="Serves" value={servings} onChange={setServings} />
            <NumberField label="Prep (min)" value={prep} onChange={setPrep} />
            <NumberField label="Cook (min)" value={cook} onChange={setCook} />
          </div>
        </section>

        <section>
          <h2 className="font-serif text-xl">Ingredients</h2>
          <div className="mt-2 space-y-2">
            {ingredients.map((row, i) => (
              <div key={i} className="flex flex-wrap gap-2 rounded-xl bg-white p-2 ring-1 ring-stone-200 sm:flex-nowrap">
                <input aria-label="Amount" placeholder="1 ½" value={row.amount} onChange={(e) => updateRow(ingredients, setIngredients, i, { amount: e.target.value })} className={`${input} w-20 px-2`} />
                <input aria-label="Unit" placeholder="cup" value={row.unit} onChange={(e) => updateRow(ingredients, setIngredients, i, { unit: e.target.value })} className={`${input} w-24 px-2`} />
                <input aria-label="Ingredient" placeholder="flour" value={row.name} onChange={(e) => updateRow(ingredients, setIngredients, i, { name: e.target.value })} className={`${input} min-w-32 flex-1 px-2`} />
                <input aria-label="Note" placeholder="note (optional)" value={row.notes} onChange={(e) => updateRow(ingredients, setIngredients, i, { notes: e.target.value })} className={`${input} basis-full px-2 sm:basis-auto sm:flex-1`} />
                <RemoveButton label={`Remove ingredient ${i + 1}`} onClick={() => removeRow(ingredients, setIngredients, i)} />
              </div>
            ))}
          </div>
          <AddButton onClick={() => setIngredients([...ingredients, emptyIngredient()])}>Add ingredient</AddButton>
        </section>

        <section>
          <h2 className="font-serif text-xl">Steps <span className="text-sm font-normal text-stone-400">(optional)</span></h2>
          <div className="mt-2 space-y-2">
            {steps.map((row, i) => (
              <div key={i} className="flex gap-2 rounded-xl bg-white p-2 ring-1 ring-stone-200">
                <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-medium text-amber-900">{i + 1}</span>
                <div className="flex-1 space-y-2">
                  <textarea aria-label={`Step ${i + 1}`} rows={2} placeholder="What to do…" value={row.instruction} onChange={(e) => updateRow(steps, setSteps, i, { instruction: e.target.value })} className={`${input} px-2`} />
                  <div className="flex gap-2 text-sm">
                    <input aria-label="Minutes" placeholder="min" inputMode="numeric" value={row.minutes} onChange={(e) => updateRow(steps, setSteps, i, { minutes: e.target.value })} className={`${input} w-20 px-2 py-1`} />
                    <input aria-label="Temperature °F" placeholder="°F" inputMode="numeric" value={row.temp} onChange={(e) => updateRow(steps, setSteps, i, { temp: e.target.value })} className={`${input} w-20 px-2 py-1`} />
                  </div>
                </div>
                <RemoveButton label={`Remove step ${i + 1}`} onClick={() => removeRow(steps, setSteps, i)} />
              </div>
            ))}
          </div>
          <AddButton onClick={() => setSteps([...steps, emptyStep()])}>Add step</AddButton>
        </section>

        <section className="space-y-3">
          <label className="block">
            <span className="font-medium text-stone-700">Notes</span>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={`mt-1 ${input}`} />
          </label>
          <label className="block">
            <span className="font-medium text-stone-700">Tags</span>
            <input placeholder="dinner, quick, shabbat" value={tags} onChange={(e) => setTags(e.target.value)} className={`mt-1 ${input}`} />
          </label>
        </section>

        <section className="space-y-3 rounded-2xl bg-stone-100/70 p-4 text-sm">
          <h2 className="font-serif text-xl">Labels</h2>
          <div className="flex flex-wrap gap-3">
            <label className="flex-1">
              <span className="font-medium text-stone-700">Diet</span>
              <select value={diet} onChange={(e) => setDiet(e.target.value)} className={`mt-1 ${input} px-2`}>
                {DIETS.map((d) => <option key={d.value} value={d.value}>{d.emoji} {d.label}</option>)}
              </select>
            </label>
            {diet === 'kosher' && (
              <label className="flex-1">
                <span className="font-medium text-stone-700">Kosher type</span>
                <select required value={kosherCategory} onChange={(e) => setKosherCategory(e.target.value)} className={`mt-1 ${input} px-2`}>
                  <option value="">Choose…</option>
                  {Object.entries(KOSHER_CATEGORIES).map(([value, k]) => <option key={value} value={value}>{k.label}</option>)}
                </select>
              </label>
            )}
          </div>
          <div>
            <span className="font-medium text-stone-700">Checked for allergies</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {allergies.map((a) => (
                <span key={a} className="flex items-center gap-1 rounded-full bg-white py-0.5 pl-2.5 pr-1 ring-1 ring-stone-300">
                  {a}
                  <button type="button" onClick={() => setAllergies(allergies.filter((x) => x !== a))} aria-label={`Remove ${a}`} className="rounded-full px-1 text-stone-400 hover:text-stone-700">×</button>
                </span>
              ))}
              <input
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addAllergy()
                  }
                }}
                onBlur={addAllergy}
                placeholder="+ add"
                aria-label="Add an allergy to check for"
                className="w-24 rounded-full bg-white px-2.5 py-0.5 ring-1 ring-stone-300 focus:outline-none focus:ring-amber-600"
              />
            </div>
          </div>
          <p className="text-xs text-stone-500">Checked by a keyword scan when you save. Always double-check labels on packaged ingredients.</p>
        </section>

        {!existing && (
          <section>
            <h2 className="font-serif text-xl">Collections <span className="text-sm font-normal text-stone-400">(optional)</span></h2>
            <div className="mt-2 text-sm">
              <CollectionPicker
                collections={collections.data}
                selected={collectionIds}
                onSelectedChange={setCollectionIds}
                newNames={collectionNames}
                onNewNamesChange={setCollectionNames}
              />
            </div>
          </section>
        )}

        {problems && (
          <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-900 ring-1 ring-red-200">
            <p className="font-medium">⚠️ These ingredients don't match the labels</p>
            <ul className="mt-1 list-disc pl-5">
              {problems.map((p) => <li key={p.message + p.label}>{p.message}</li>)}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => setProblems(null)} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-red-200 hover:bg-red-100">
                Go back and fix
              </button>
              <button type="button" disabled={saving} onClick={() => save({ dropFailedLabels: true })} className="rounded-lg bg-red-700 px-3 py-1.5 font-medium text-white hover:bg-red-800 disabled:opacity-60">
                Save without those labels
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-red-700">{error}</p>}
        <button type="submit" disabled={saving} className="w-full rounded-xl bg-amber-700 px-4 py-3 font-medium text-white hover:bg-amber-800 disabled:opacity-70">
          {saving ? 'Saving…' : existing ? 'Save changes' : 'Save recipe'}
        </button>
      </form>
    </div>
  )
}

function NumberField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="font-medium text-stone-700">{label}</span>
      <input inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} className={`mt-1 ${input}`} />
    </label>
  )
}

function AddButton({ onClick, children }) {
  return (
    <button type="button" onClick={onClick} className="mt-2 text-sm font-medium text-amber-800 hover:underline">
      + {children}
    </button>
  )
}

function RemoveButton({ label, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700">
      ×
    </button>
  )
}
