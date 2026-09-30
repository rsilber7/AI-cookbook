import { supabase } from './supabase'

// Deployed: the backend's own URL (VITE_API_URL). In dev, Vite forwards /api/* to
// http://localhost:8000 (see vite.config.js).
const API_BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')

// Calls our FastAPI backend with the logged-in user's token.
export async function api(path, { method = 'GET', body } = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.status === 204) return null
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(errorMessage(payload) ?? `Request failed (${response.status})`)
  }
  return payload
}

// FastAPI errors are {"detail": "..."} or, for validation errors, {"detail": [{msg, loc}, ...]}
function errorMessage(payload) {
  const detail = payload?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((d) => d.msg).join('; ')
  return null
}
