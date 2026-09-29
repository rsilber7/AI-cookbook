import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { useSession } from './lib/useSession'
import AllCollections from './pages/AllCollections'
import CollectionPage from './pages/CollectionPage'
import Home from './pages/Home'
import Login from './pages/Login'
import RecipePage from './pages/RecipePage'

export default function App() {
  const session = useSession()

  // Still checking whether the user is logged in
  if (session === undefined) return null

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
        <Route element={session ? <Layout session={session} /> : <Navigate to="/login" replace />}>
          <Route path="/" element={<Home />} />
          <Route path="/collections" element={<AllCollections />} />
          <Route path="/collections/all" element={<CollectionPage />} />
          <Route path="/collections/:id" element={<CollectionPage />} />
          <Route path="/recipes/:id" element={<RecipePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
