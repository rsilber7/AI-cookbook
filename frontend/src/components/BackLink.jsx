import { Link } from 'react-router-dom'

export default function BackLink({ to = '/', label = 'Back to cookbook' }) {
  return (
    <Link to={to} className="text-sm text-stone-500 hover:text-stone-800">
      ← {label}
    </Link>
  )
}
