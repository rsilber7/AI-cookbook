import { useState } from 'react'
import { Link } from 'react-router-dom'
import { demoAvailable, signInAsDemo } from '../lib/demo'
import { supabase } from '../lib/supabase'

const input =
  'mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 focus:border-tomato focus:outline-none focus:ring-2 focus:ring-tomato/20'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // On success, useSession sees the new session and App redirects
  async function run(signIn) {
    setLoading(true)
    setError(await signIn())
    setLoading(false)
  }

  function handleSubmit(event) {
    event.preventDefault()
    run(async () => (await supabase.auth.signInWithPassword({ email, password })).error?.message ?? null)
  }

  return (
    <main className="flex min-h-screen flex-col px-4">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between py-4">
        <Link to="/" className="font-display text-xl font-semibold">🍳 Interactive Cookbook</Link>
        <Link to="/" className="text-sm text-stone-600 hover:text-stone-900">← Back</Link>
      </header>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center pb-16">
        <h1 className="text-center font-display text-4xl font-bold">
          Welcome <span className="text-tomato">back</span>
        </h1>
        <p className="mt-1 text-center font-hand text-2xl text-basil">let’s get cooking</p>

        <form onSubmit={handleSubmit} className="tape relative mt-8 space-y-4 rounded-2xl bg-paper p-6 shadow-md ring-1 ring-amber-900/10">
          <label className="block">
            <span className="text-sm font-medium text-stone-700">Email</span>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-stone-700">Password</span>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${input} pr-16`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 mt-0.5 -translate-y-1/2 rounded-lg px-2 py-1 text-sm text-stone-500 hover:text-stone-800"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-tomato px-4 py-2.5 font-display text-lg font-semibold text-white shadow-sm hover:brightness-95 disabled:opacity-60"
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        {demoAvailable && (
          <div className="mt-6 text-center">
            <p className="text-sm text-stone-500">Just looking around?</p>
            <button
              onClick={() => run(signInAsDemo)}
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-white px-4 py-2.5 font-medium text-tomato ring-1 ring-tomato/40 hover:bg-orange-50 disabled:opacity-60"
            >
              👀 Peek inside the demo
            </button>
            <p className="mt-2 text-xs text-stone-400">A shared sample cookbook. It’s reset from time to time.</p>
          </div>
        )}
      </div>
    </main>
  )
}
