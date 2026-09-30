import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// The current Supabase login session: undefined while loading, null when logged out.
export function useSession() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession))
    return () => data.subscription.unsubscribe()
  }, [])

  return session
}
