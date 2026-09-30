import { Link, Outlet, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import NewRecipeButton from './NewRecipeButton'
import ProfileBadge from './ProfileBadge'
import ProfileProvider from './ProfileProvider'

// The floating "New recipe" button is hidden while already creating or editing one
const isEditingPage = (pathname) =>
  pathname === '/create' || pathname === '/recipes/new' || pathname.endsWith('/edit')

// Header shown on every logged-in page; the current page renders in <Outlet />.
export default function Layout({ session }) {
  const { pathname } = useLocation()

  return (
    <ProfileProvider>
      <div className="min-h-screen bg-stone-50 text-stone-900">
        <header className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
            <Link to="/" className="font-serif text-xl">Interactive Cookbook</Link>
            <div className="flex items-center gap-2 text-sm">
              <ProfileBadge />
              <button
                onClick={() => supabase.auth.signOut()}
                title={session.user.email}
                className="rounded-lg px-3 py-1 text-stone-600 hover:bg-stone-100"
              >
                Log out
              </button>
            </div>
          </div>
        </header>
        {/* Bottom padding keeps content clear of the floating button */}
        <main className="mx-auto max-w-4xl px-4 pb-28 pt-8">
          <Outlet />
        </main>
        {!isEditingPage(pathname) && <NewRecipeButton />}
      </div>
    </ProfileProvider>
  )
}
