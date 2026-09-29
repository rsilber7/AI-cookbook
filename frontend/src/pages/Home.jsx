import { useEffect, useState } from 'react'
import { api } from '../lib/api'

// Placeholder home page: loads the profile from our backend to prove the
// browser -> FastAPI -> Supabase chain works with the user's login token.
export default function Home() {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api('/users/me').then(setProfile).catch((e) => setError(e.message))
  }, [])

  return (
    <section>
      <h1 className="font-serif text-3xl">Welcome</h1>
      {error && <p className="mt-4 text-red-700">Couldn't load your profile: {error}</p>}
      {!profile && !error && <p className="mt-4 text-stone-500">Loading your profile…</p>}
      {profile && (
        <dl className="mt-6 grid gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-stone-500">Diet</dt>
            <dd className="mt-1 text-lg capitalize">{profile.dietary_system}</dd>
          </div>
          <div>
            <dt className="text-sm text-stone-500">Allergies</dt>
            <dd className="mt-1 text-lg">
              {profile.allergies.length ? profile.allergies.join(', ') : 'None'}
            </dd>
          </div>
        </dl>
      )}
    </section>
  )
}
