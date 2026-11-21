import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { PROFESSOR_ID, PROFESSOR_NAME } from '../data/books'

/**
 * Authentication against the SmartBook FastAPI backend (see /backend).
 *
 * The backend stores users and sessions in SQLite. The browser keeps only the signed-in
 * user and a session token in localStorage, so a refresh keeps you logged in.
 * Role checks in the UI are for demonstration; this is not production-grade security.
 */

export type Role = 'student' | 'professor'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
  demo?: boolean
}

interface Session extends SessionUser {
  token: string
}

/** Shown on the log-in page; the backend creates these accounts on start-up. */
export const DEMO_ACCOUNTS: (SessionUser & { password: string })[] = [
  { id: 'student-demo', name: 'Aziza Karimova', email: 'student@smartbook.demo', password: 'student-demo', role: 'student', demo: true },
  { id: PROFESSOR_ID, name: PROFESSOR_NAME, email: 'professor@smartbook.demo', password: 'professor-demo', role: 'professor', demo: true },
]

export const homeFor = (role: Role) => (role === 'professor' ? '/studio' : '/')

/** Where to go after signing in: the requested page if this role may open it, otherwise the role's home. */
export function destinationFor(next: string | null, role: Role) {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/login') || next.startsWith('/signup')) return homeFor(role)
  const studentOnly = next.startsWith('/my-books')
  const professorOnly = next.startsWith('/studio') || next.startsWith('/radar')
  if ((role === 'student' && professorOnly) || (role === 'professor' && studentOnly)) return homeFor(role)
  return next
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const SESSION_KEY = 'smartbook:session:v2'

const readSession = (): Session | null => {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null')
    return s && typeof s.token === 'string' ? s : null
  } catch {
    return null
  }
}
const writeSession = (s: Session | null) => {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* storage unavailable: the session lasts until reload */
  }
}

/* ---------- API ---------- */

type Field = 'name' | 'email' | 'password' | 'confirm' | 'role'

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public field?: Field,
  ) {
    super(message)
  }
}

const OFFLINE = 'Cannot reach the SmartBook server. Make sure the backend is running (see README).'

async function api<T>(path: string, init: { method?: string; body?: unknown; token?: string } = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method: init.method ?? 'GET',
      headers: { 'Content-Type': 'application/json', ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}) },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
  } catch {
    throw new ApiError(OFFLINE, 0)
  }
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => null)
  if (res.ok) return data as T
  // our own errors: { detail: { error, field } }; FastAPI validation errors: { detail: [{ loc, msg }] }
  const detail = data?.detail
  if (Array.isArray(detail) && detail[0]) {
    const loc = detail[0].loc?.[detail[0].loc.length - 1]
    throw new ApiError(String(detail[0].msg).replace(/^Value error, /, ''), res.status, loc as Field)
  }
  if (detail?.error) throw new ApiError(detail.error, res.status, detail.field ?? undefined)
  throw new ApiError(res.status >= 500 ? OFFLINE : `Request failed (${res.status}).`, res.status)
}

/* ---------- context ---------- */

type Result = { ok: true; user: SessionUser } | { ok: false; error: string; field?: Field }

interface AuthCtx {
  user: SessionUser | null
  signUp: (input: { name: string; email: string; password: string; role: Role }) => Promise<Result>
  logIn: (email: string, password: string) => Promise<Result>
  logOut: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

const toUser = ({ id, name, email, role, demo }: Session | SessionUser): SessionUser => ({ id, name, email, role, demo })
const fail = (e: unknown): Result =>
  e instanceof ApiError ? { ok: false, error: e.message, field: e.field } : { ok: false, error: 'Something went wrong. Please try again.' }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readSession)

  // confirm a stored session with the server; an expired or unknown token logs the user out
  useEffect(() => {
    const s = readSession()
    if (!s) return
    api<{ user: SessionUser }>('/auth/me', { token: s.token })
      .then(({ user }) => {
        const fresh = { ...user, token: s.token }
        writeSession(fresh)
        setSession(fresh)
      })
      .catch(e => {
        if (e instanceof ApiError && e.status === 401) {
          writeSession(null)
          setSession(null)
        }
        // server unreachable: keep the cached session so reading still works offline
      })
  }, [])

  // keep tabs in sync: logging out in one tab logs out the others
  useEffect(() => {
    const onStorage = (e: StorageEvent) => e.key === SESSION_KEY && setSession(readSession())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const signUp: AuthCtx['signUp'] = async input => {
    try {
      const { user } = await api<{ user: SessionUser }>('/auth/signup', { method: 'POST', body: input })
      return { ok: true, user }
    } catch (e) {
      return fail(e)
    }
  }

  const logIn: AuthCtx['logIn'] = async (email, password) => {
    try {
      const { token, user } = await api<{ token: string; user: SessionUser }>('/auth/login', { method: 'POST', body: { email, password } })
      const s = { ...user, token }
      writeSession(s)
      setSession(s)
      return { ok: true, user }
    } catch (e) {
      return fail(e)
    }
  }

  const logOut = () => {
    const s = readSession()
    if (s) api('/auth/logout', { method: 'POST', token: s.token }).catch(() => {})
    writeSession(null)
    setSession(null)
  }

  const user = useMemo(() => (session ? toUser(session) : null), [session])
  return <Ctx.Provider value={{ user, signUp, logIn, logOut }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth must be used inside AuthProvider')
  return c
}
