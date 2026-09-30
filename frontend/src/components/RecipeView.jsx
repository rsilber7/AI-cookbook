import { KOSHER_CATEGORIES, SOURCES, dietInfo, formatAmount } from '../lib/labels'

// A full recipe. variant="draft" is the yellow notepad look for unsaved AI drafts;
// "final" is the clean white card for saved recipes. Empty sections are hidden,
// since imported recipes may have no amounts, times, or even steps.
export default function RecipeView({ recipe, variant = 'final' }) {
  const isDraft = variant === 'draft'
  const kosher = KOSHER_CATEGORIES[recipe.kosher_category]
  const facts = [
    recipe.yield_servings && `Serves ${recipe.yield_servings}`,
    recipe.prep_time_mins && `Prep ${recipe.prep_time_mins} min`,
    recipe.cook_time_mins && `Cook ${recipe.cook_time_mins} min`,
  ].filter(Boolean)

  return (
    <article
      className={
        isDraft
          ? 'relative rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-6'
          : 'rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200'
      }
    >
      {isDraft && (
        <span className="absolute -top-3 left-5 rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-bold tracking-wide text-amber-950">
          DRAFT
        </span>
      )}

      <h2 className="font-serif text-2xl sm:text-3xl">{recipe.title}</h2>
      {recipe.description && <p className="mt-2 text-stone-600">{recipe.description}</p>}

      <div className="mt-4 flex flex-wrap gap-1.5 text-xs">
        {recipe.dietary_system !== 'none' && (
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-700">
            {dietInfo(recipe.dietary_system).emoji} {dietInfo(recipe.dietary_system).label}
          </span>
        )}
        {kosher && <span className={`rounded-full px-2 py-0.5 ring-1 ${kosher.className}`}>{kosher.label}</span>}
        {recipe.allergies_applied.length > 0 && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800 ring-1 ring-emerald-200">
            ✓ Checked for {recipe.allergies_applied.join(', ')}
          </span>
        )}
        {recipe.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-500">#{tag}</span>
        ))}
      </div>

      {facts.length > 0 && <p className="mt-4 text-sm text-stone-500">{facts.join(' · ')}</p>}

      {recipe.ingredients.length > 0 && (
        <section className="mt-6">
          <h3 className="font-serif text-xl">Ingredients</h3>
          <ul className="mt-2 space-y-1.5">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-amber-600" aria-hidden>•</span>
                <span>
                  {ing.amount != null && <strong className="font-medium">{formatAmount(ing.amount)} </strong>}
                  {ing.unit && <span>{ing.unit} </span>}
                  {ing.name}
                  {ing.notes && <span className="text-stone-500">, {ing.notes}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recipe.steps.length > 0 && (
        <section className="mt-6">
          <h3 className="font-serif text-xl">Steps</h3>
          <ol className="mt-2 space-y-3">
            {recipe.steps.map((step) => (
              <li key={step.order} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-medium text-amber-900">
                  {step.order}
                </span>
                <p>
                  {step.instruction}
                  {(step.duration_mins || step.temp_f) && (
                    <span className="ml-1 text-sm text-stone-500">
                      ({[step.duration_mins && `${step.duration_mins} min`, step.temp_f && `${step.temp_f}°F`].filter(Boolean).join(', ')})
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {recipe.ingredients.length === 0 && recipe.steps.length === 0 && (
        <p className="mt-6 text-stone-500">No ingredients or steps yet.</p>
      )}

      {recipe.notes && (
        <section className="mt-6 rounded-xl bg-stone-50 p-4 text-sm text-stone-600 ring-1 ring-stone-200">
          <h3 className="font-medium text-stone-800">Notes</h3>
          <p className="mt-1">{recipe.notes}</p>
        </section>
      )}

      <p className="mt-6 text-xs text-stone-400">{SOURCES[recipe.source]}</p>
    </article>
  )
}
