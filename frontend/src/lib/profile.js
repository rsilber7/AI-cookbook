import { createContext, useContext } from 'react'

// The logged-in user's diet + allergies, shared by every page (the header badge
// shows it; the create screen uses it for the rule toggles). Filled by ProfileProvider.
export const ProfileContext = createContext(null)

export function useProfile() {
  return useContext(ProfileContext)
}
