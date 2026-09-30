import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import FallingFood from '../components/FallingFood'
import { demoAvailable, signInAsDemo } from '../lib/demo'

const SLOGANS = [
  'Nut-free? Kosher? Vegan? We’ve got you.',
  'Snap a photo, get a recipe.',
  'Grandma’s card, saved forever.',
  'What’s for dinner? Ask your cookbook.',
  'Every recipe checked against your rules.',
]

const FEATURES = [
  { emoji: '✨', title: 'Make it with AI', text: 'Describe a craving and get a full recipe, then tweak it until it’s just right.', tilt: '-rotate-2' },
  { emoji: '📷', title: 'Snap to import', text: 'Photograph a cookbook page or screenshot a post. It becomes a recipe card.', tilt: 'rotate-1' },
  { emoji: '🛡️', title: 'Your rules, checked twice', text: 'Allergies and diets are applied by the AI, then double-checked by code.', tilt: '-rotate-1' },
]

// The cover opens once per visit (per browser tab session). The flag is only
// written after the page has shown, so React's dev double-render can't skip it.
function useCoverOnce() {
  const [showCover] = useState(() => {
    try {
      return !sessionStorage.getItem('coverOpened')
    } catch {
      return true
    }
  })
  useEffect(() => {
    try {
      sessionStorage.setItem('coverOpened', '1')
    } catch {
      // Storage blocked (e.g. private mode): the cover just shows every visit
    }
  }, [])
  return showCover
}

export default function Welcome() {
  const showCover = useCoverOnce()
  const [slogan, setSlogan] = useState(0)
  const [demoError, setDemoError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setSlogan((i) => (i + 1) % SLOGANS.length), 3500)
    return () => clearInterval(timer)
  }, [])

  async function tryDemo() {
    setLoading(true)
    setDemoError(await signInAsDemo())
    setLoading(false)
  }

  return (
    <div className="relative min-h-screen overflow-hidden text-stone-900">
      <FallingFood />

      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <span className="font-display text-xl font-semibold">🍳 Interactive Cookbook</span>
        <Link to="/login" className="rounded-full px-4 py-1.5 font-medium text-stone-700 ring-1 ring-stone-300 hover:bg-white">
          Log in
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        {/* The open cookbook: a paper page with a cover that swings open on arrival */}
        <section className="relative mt-4 rounded-3xl bg-paper px-6 py-12 text-center shadow-xl ring-1 ring-amber-900/10 sm:px-12 sm:py-16">
          <p className="font-hand text-2xl text-basil">your kitchen’s new best friend</p>
          <h1 className="mt-2 font-display text-5xl font-bold leading-tight sm:text-6xl">
            Your recipes.
            <br />
            <span className="text-tomato">Your rules.</span>
          </h1>
          <p key={slogan} className="fade-up mt-5 min-h-10 font-hand text-3xl text-blueberry" aria-live="polite">
            {SLOGANS[slogan]}
          </p>
          <p className="mx-auto mt-4 max-w-xl text-lg text-stone-600">
            Generate, import, and write recipes that always follow your diet and allergies, all in one cozy cookbook.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {demoAvailable ? (
              <button
                onClick={tryDemo}
                disabled={loading}
                className="hover-wiggle rounded-full bg-tomato px-8 py-3.5 font-display text-lg font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-70"
              >
                <span className="wiggle-target inline-block">👀</span> {loading ? 'Opening…' : 'Peek inside'}
              </button>
            ) : null}
            <Link
              to="/login"
              className={
                demoAvailable
                  ? 'rounded-full px-6 py-3 font-medium text-stone-700 ring-1 ring-stone-300 hover:bg-white'
                  : 'rounded-full bg-tomato px-8 py-3.5 font-display text-lg font-semibold text-white shadow-md'
              }
            >
              Log in
            </Link>
          </div>
          {demoError && <p className="mt-3 text-sm text-red-700">{demoError}</p>}
          {demoAvailable && <p className="mt-3 text-sm text-stone-500">No sign-up needed: try a sample cookbook.</p>}

          {showCover && (
            <div
              aria-hidden
              className="book-cover absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-tomato text-white shadow-2xl"
            >
              <span className="text-6xl">🍳</span>
              <span className="mt-3 font-display text-4xl font-bold">Interactive Cookbook</span>
              <span className="mt-1 font-hand text-2xl text-butter">Have it all in one place</span>
            </div>
          )}
        </section>

        <section className="mt-16 grid gap-8 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`tape relative rounded-2xl bg-paper p-6 shadow-md ring-1 ring-amber-900/10 transition hover:rotate-0 hover:-translate-y-1 ${f.tilt}`}
            >
              <span className="text-4xl" aria-hidden>{f.emoji}</span>
              <h2 className="mt-3 font-display text-xl font-semibold">{f.title}</h2>
              <p className="mt-2 text-stone-600">{f.text}</p>
            </div>
          ))}
        </section>

        <p className="mt-14 text-center font-hand text-2xl text-stone-500">Made with 🧡 and a pinch of code</p>
      </main>
    </div>
  )
}
