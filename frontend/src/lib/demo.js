import { supabase } from './supabase'

// A shared demo account so visitors can try the app without signing up.
// Its password is public by design: only ever point this at a throwaway account.
const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD

export const demoAvailable = Boolean(DEMO_EMAIL && DEMO_PASSWORD)

// Resolves to an error message, or null on success (the session hook then redirects)
export async function signInAsDemo() {
  const { error } = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
  return error?.message ?? null
}
