import { ProfileContext } from '../lib/profile'
import { useApi } from '../lib/useApi'

// Loads the profile once and shares it with everything inside
export default function ProfileProvider({ children }) {
  const { data: profile, setData: setProfile, error } = useApi('/users/me')
  return (
    <ProfileContext.Provider value={{ profile, setProfile, error }}>
      {children}
    </ProfileContext.Provider>
  )
}
