import { useState, type ReactNode } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { ShieldAlert, X } from 'lucide-react'
import { destinationFor, homeFor, useAuth, type Role } from '../store/Auth'

/*
 * UI-level route guards for the demo. They decide what the interface shows;
 * they are not a security boundary (everything runs in the browser).
 */

export interface DeniedState {
  denied?: { path: string; needs: Role }
}

/** Signed-in users only; everyone else goes to Log In and comes back afterwards. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) {
    const next = location.pathname + location.search + location.hash
    return <Navigate to={next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`} replace />
  }
  return <>{children}</>
}

/** Routes for a single role; the other role is sent to its own home page with a short notice. */
export function RoleOnly({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  if (user && user.role !== role) {
    const state: DeniedState = { denied: { path: location.pathname, needs: role } }
    return <Navigate to={homeFor(user.role)} replace state={state} />
  }
  return <>{children}</>
}

/** Log In / Sign Up: signed-in users continue to the page they asked for, or their home page. */
export function PublicOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [params] = useSearchParams()
  if (user) return <Navigate to={destinationFor(params.get('next'), user.role)} replace />
  return <>{children}</>
}

const PAGE_NAMES: Record<string, string> = { '/studio': 'Professor Studio', '/radar': 'Learning Radar', '/my-books': 'My Books' }

/** Shown on the home page after a blocked navigation. */
export function DeniedNotice() {
  const location = useLocation()
  const { user } = useAuth()
  const denied = (location.state as DeniedState | null)?.denied
  const [hidden, setHidden] = useState<string | null>(null)
  if (!denied || !user || hidden === location.key) return null
  const base = '/' + denied.path.split('/')[1]
  const page = PAGE_NAMES[base] ?? 'That page'
  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8" role="status">
      <div className="flex animate-fadeUp items-start gap-3 rounded-md border border-wine/25 bg-wine-50 px-4 py-3 text-[13px] text-wine">
        <ShieldAlert size={16} className="mt-0.5 shrink-0" />
        <p className="flex-1 leading-relaxed">
          <strong className="font-semibold">{page}</strong> is available to {denied.needs === 'professor' ? 'professors' : 'students'} only. You are signed in as a{' '}
          {user.role === 'professor' ? 'professor' : 'student'}, so you have been taken to your home page.
        </p>
        <button onClick={() => setHidden(location.key)} className="shrink-0 opacity-70 hover:opacity-100" aria-label="Dismiss">
          <X size={15} />
        </button>
      </div>
    </div>
  )
}
