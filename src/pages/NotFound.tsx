import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-6 py-32 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 font-serif text-4xl font-semibold">This page is not on our shelves</h1>
      <p className="mt-4 text-soft">The address may be mistyped, or the book may have been removed from the demo.</p>
      <Link to="/" className="btn-primary mt-8">Back to the Library</Link>
    </div>
  )
}
