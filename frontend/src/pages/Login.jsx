import { useState } from 'react'
import { supabase } from '../lib/supabase'

// A shared demo account so visitors can try the app without signing up.
// Its password is public by design: only ever point this at a throwaway account.
const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function logIn(credentials) {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword(credentials)
    // On success, useSession sees the new session and App redirects
    if (error) setError(error.message)
    setLoading(false)
  }

  function handleSubmit(event) {
    event.preventDefault()
    logIn({ email, password })
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-3xl text-stone-900 text-center">Interactive Cookbook</h1>
        <p className="mt-2 text-center text-stone-500">Have it all in one place</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
          <label className="block">
            <span className="text-sm font-medium text-stone-700">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-stone-700">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
            />
          </label>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800 disabled:opacity-60"
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        {DEMO_EMAIL && DEMO_PASSWORD && (
          <div className="mt-6 text-center">
            <p className="text-sm text-stone-500">Just looking around?</p>
            <button
              onClick={() => logIn({ email: DEMO_EMAIL, password: DEMO_PASSWORD })}
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-white px-4 py-2.5 font-medium text-amber-800 ring-1 ring-amber-300 hover:bg-amber-50 disabled:opacity-60"
            >
              👀 Try the demo
            </button>
            <p className="mt-2 text-xs text-stone-400">A shared sample cookbook. It's reset from time to time.</p>
          </div>
        )}
      </div>
    </main>
  )
}
