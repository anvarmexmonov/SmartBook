import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useStore } from '../store/AppStore'

export default function Footer() {
  const { resetDemo } = useStore()
  const [confirm, setConfirm] = useState(false)
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-[12px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          SmartBook prototype · LexHackathon, Tashkent State University of Law. All books, people and statistics are demo content.
        </p>
        {confirm ? (
          <span className="flex items-center gap-2">
            Reset saved books, progress and drafts?
            <button className="btn-secondary btn-sm" onClick={() => { resetDemo(); setConfirm(false) }}>Reset</button>
            <button className="btn-ghost btn-sm" onClick={() => setConfirm(false)}>Cancel</button>
          </span>
        ) : (
          <button className="flex items-center gap-1.5 hover:text-ink" onClick={() => setConfirm(true)}>
            <RotateCcw size={13} /> Reset demo data
          </button>
        )}
      </div>
    </footer>
  )
}
