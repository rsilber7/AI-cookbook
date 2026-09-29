import { useEffect, useState } from 'react'
import { api } from './api'

// Loads data from a backend GET endpoint. Pass null to skip loading.
export function useApi(path) {
  const [result, setResult] = useState({ path: null, data: null, error: null })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!path) return
    // Ignore a response that arrives after the path changed (e.g. quick navigation)
    let stale = false
    api(path)
      .then((data) => !stale && setResult({ path, data, error: null }))
      .catch((e) => !stale && setResult({ path, data: null, error: e.message }))
    return () => {
      stale = true
    }
  }, [path, version])

  const current = result.path === path
  return {
    data: current ? result.data : null,
    error: current ? result.error : null,
    loading: Boolean(path) && !current,
    reload: () => setVersion((v) => v + 1),
    setData: (data) => setResult({ path, data, error: null }),
  }
}
