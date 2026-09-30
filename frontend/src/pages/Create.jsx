import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import BackLink from '../components/BackLink'
import RecipeView from '../components/RecipeView'
import RulesPanel from '../components/RulesPanel'
import SaveDialog from '../components/SaveDialog'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'

const MODES = {
  generate: { emoji: '✨', heading: 'Generate a recipe with AI', button: 'Generate recipe' },
  modify: { emoji: '✏️', heading: 'Modify a saved recipe', button: 'Create new version' },
  import: { emoji: '📋', heading: 'Import a recipe', button: 'Import recipe' },
}

const DEFAULT_RULES = { apply_dietary: true, apply_allergies: true, extra_allergies: [] }

// /create?mode=generate|modify|import[&base=<recipe id>]
// Keyed on the URL so picking a different option from the + menu starts fresh.
export default function CreatePage() {
  const [params] = useSearchParams()
  const mode = MODES[params.get('mode')] ? params.get('mode') : 'generate'
  return <Create key={params.toString()} mode={mode} initialBaseId={params.get('base') ?? ''} />
}

function Create({ mode, initialBaseId }) {
  const navigate = useNavigate()
  const [rules, setRules] = useState(DEFAULT_RULES)
  const [description, setDescription] = useState('')
  const [title, setTitle] = useState('')
  const [pasted, setPasted] = useState('')
  const [baseId, setBaseId] = useState(initialBaseId)

  // Every draft the AI has produced, so the user can flip back to an earlier one
  const [versions, setVersions] = useState([])
  const [index, setIndex] = useState(0)
  const [tweak, setTweak] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const savedRecipes = useApi(mode === 'modify' ? '/recipes/' : null)
  const current = versions[index]

  async function requestDraft(path, body) {
    setLoading(true)
    setError(null)
    try {
      const result = await api(path, { method: 'POST', body: { ...body, ...rules } })
      const next = [...versions, result]
      setVersions(next)
      setIndex(next.length - 1)
      return true
    } catch (e) {
      setError(e.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  function start(event) {
    event.preventDefault()
    const titleOverride = title.trim() || null
    if (mode === 'import') requestDraft('/recipes/import', { text: pasted, title: titleOverride })
    else if (mode === 'modify') requestDraft('/recipes/generate', { description, base_recipe_id: baseId, title: titleOverride })
    else requestDraft('/recipes/generate', { description, title: titleOverride })
  }

  async function submitTweak(event) {
    event.preventDefault()
    if (await requestDraft('/recipes/generate', { description: tweak, base_recipe: current.recipe })) setTweak('')
  }

  const { emoji, heading, button } = MODES[mode]

  // Step 1: describe / pick / paste
  if (!current) {
    return (
      <div className="mx-auto max-w-2xl">
        <BackLink />
        <h1 className="mt-2 font-serif text-3xl">{emoji} {heading}</h1>
        <form onSubmit={start} className="mt-6 space-y-5">
          {mode === 'modify' && (
            <label className="block">
              <span className="font-medium text-stone-700">Recipe to modify</span>
              <select
                required
                value={baseId}
                onChange={(e) => setBaseId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
              >
                <option value="">{savedRecipes.data ? 'Choose a recipe…' : 'Loading your recipes…'}</option>
                {savedRecipes.data?.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
              </select>
              {savedRecipes.data?.length === 0 && (
                <span className="mt-1 block text-sm text-stone-500">You don't have any saved recipes yet.</span>
              )}
            </label>
          )}

          {mode === 'import' ? (
            <label className="block">
              <span className="font-medium text-stone-700">Paste the recipe</span>
              <textarea
                required
                maxLength={20000}
                rows={10}
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                placeholder="From a text, the Notes app, a website… any format is fine."
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </label>
          ) : (
            <label className="block">
              <span className="font-medium text-stone-700">
                {mode === 'modify' ? 'What should change?' : 'What would you like to make?'}
              </span>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={mode === 'modify' ? 'e.g. make it dairy-free and a bit spicier' : 'e.g. a quick weeknight chicken dinner, something Moroccan'}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </label>
          )}

          <label className="block">
            <span className="font-medium text-stone-700">Title <span className="font-normal text-stone-400">(optional)</span></span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={mode === 'modify' ? 'Leave blank for e.g. "Shakshuka (Dairy-Free)"' : 'Leave blank and AI will name it'}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>

          <RulesPanel rules={rules} onChange={setRules} />

          {error && <p className="text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-amber-700 px-4 py-3 font-medium text-white hover:bg-amber-800 disabled:opacity-70"
          >
            {loading ? '🍳 Cooking up your recipe… (up to ~30 seconds)' : button}
          </button>
        </form>
      </div>
    )
  }

  // Step 2: review the draft, tweak it, flip between versions, save
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <BackLink />
        <button
          onClick={() => { setVersions([]); setIndex(0) }}
          className="text-sm text-stone-500 hover:text-stone-800"
        >
          Start over
        </button>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          {current.warnings.length > 0 && (
            <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-900 ring-1 ring-red-200">
              <p className="font-medium">⚠️ Double-check before cooking</p>
              <ul className="mt-1 list-disc pl-5">
                {current.warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            </div>
          )}
          <RecipeView recipe={current.recipe} variant="draft" />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {versions.length > 1 && (
            <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-stone-200">
              <button onClick={() => setIndex(index - 1)} disabled={index === 0} className="px-2 disabled:opacity-30" aria-label="Previous version">←</button>
              <span>Version {index + 1} of {versions.length}</span>
              <button onClick={() => setIndex(index + 1)} disabled={index === versions.length - 1} className="px-2 disabled:opacity-30" aria-label="Next version">→</button>
            </div>
          )}

          <form onSubmit={submitTweak} className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
            <label className="block">
              <span className="font-medium">Tweak it</span>
              <textarea
                required
                rows={3}
                value={tweak}
                onChange={(e) => setTweak(e.target.value)}
                placeholder="e.g. less spicy, no olives, make it serve 6"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
            <RulesPanel rules={rules} onChange={setRules} />
            {error && <p className="text-sm text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-white px-4 py-2 font-medium text-amber-800 ring-1 ring-amber-300 hover:bg-amber-50 disabled:opacity-70"
            >
              {loading ? '🍳 Reworking…' : 'Update draft'}
            </button>
          </form>

          <button
            onClick={() => setSaving(true)}
            disabled={loading}
            className="w-full rounded-xl bg-amber-700 px-4 py-3 font-medium text-white hover:bg-amber-800 disabled:opacity-70"
          >
            Save recipe
          </button>
        </aside>
      </div>

      {saving && (
        <SaveDialog
          draft={current.recipe}
          onClose={() => setSaving(false)}
          onSaved={(saved) => navigate(`/recipes/${saved.id}`)}
        />
      )}
    </div>
  )
}
