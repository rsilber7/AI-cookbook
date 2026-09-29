import { Link, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Header shown on every logged-in page; the current page renders in <Outlet />.
export default function Layout({ session }) {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="font-serif text-xl">Interactive Cookbook</Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-stone-500 sm:inline">{session.user.email}</span>
            <button
              onClick={() => supabase.auth.signOut()}
              className="rounded-lg px-3 py-1.5 text-stone-700 ring-1 ring-stone-300 hover:bg-stone-100"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
