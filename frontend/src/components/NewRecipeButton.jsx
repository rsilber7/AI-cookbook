import { useState } from 'react'
import { Link } from 'react-router-dom'

const OPTIONS = [
  { mode: 'generate', emoji: '✨', title: 'Generate with AI', text: 'Describe it, get a recipe' },
  { mode: 'modify', emoji: '✏️', title: 'Modify a recipe', text: 'Adapt one you already saved' },
  { mode: 'import', emoji: '📋', title: 'Import a recipe', text: 'Paste one from anywhere' },
]

// Floating "🍳 +" button in the bottom corner that opens the three ways to add a recipe
export default function NewRecipeButton() {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-5 right-5 z-30 flex flex-col items-end gap-3">
      {open && (
        <div className="w-64 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-stone-200">
          {OPTIONS.map((o) => (
            <Link
              key={o.mode}
              to={`/create?mode=${o.mode}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-amber-50"
            >
              <span className="text-2xl" aria-hidden>{o.emoji}</span>
              <span>
                <span className="block font-medium">{o.title}</span>
                <span className="block text-sm text-stone-500">{o.text}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="New recipe"
        className="flex items-center gap-2 rounded-full bg-amber-600 py-3 pl-4 pr-5 text-white shadow-lg transition hover:scale-105 hover:bg-amber-700"
      >
        <span className="text-2xl leading-none" aria-hidden>🍳</span>
        <span className={`text-2xl font-light leading-none transition ${open ? 'rotate-45' : ''}`}>+</span>
        <span className="font-medium">New recipe</span>
      </button>
    </div>
  )
}
