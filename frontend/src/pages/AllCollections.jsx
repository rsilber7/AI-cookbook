import BackLink from '../components/BackLink'
import CollectionTile from '../components/CollectionTile'
import NewCollectionTile from '../components/NewCollectionTile'
import { useApi } from '../lib/useApi'

export default function AllCollections() {
  const { data: collections, setData, error } = useApi('/collections/')

  return (
    <div>
      <BackLink />
      <h1 className="mt-2 font-serif text-3xl">All collections</h1>
      {error && <p className="mt-4 text-red-700">{error}</p>}
      {!collections && !error && <p className="mt-4 text-stone-500">Loading…</p>}
      {collections && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CollectionTile to="/collections/all" emoji="🍽️" name="All recipes" />
          {collections.map((c) => (
            <CollectionTile key={c.id} to={`/collections/${c.id}`} name={c.name} />
          ))}
          <NewCollectionTile onCreated={(c) => setData([...collections, c])} />
        </div>
      )}
    </div>
  )
}
