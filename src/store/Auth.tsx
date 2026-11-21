import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { PROFESSOR_ID, PROFESSOR_NAME } from '../data/books'

/**
 * Local demo authentication — NOT secure and not production-ready.
 *
 * Accounts and the session live in this browser's localStorage. Passwords are never stored:
 * only a salted PBKDF2 hash (or, where Web Crypto is unavailable, a weaker salted fallback
 * hash). Anyone with access to the browser can still read or edit this data; it only exists
 * so the prototype can show role-specific experiences.
 */

export type Role = 'student' | 'professor'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
  demo?: boolean
}

interface Account extends SessionUser {
  salt: string
  hash: string
  algo: 'pbkdf2-sha256' | 'fnv-fallback'
  createdAt: number
}

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

const ACCOUNTS_KEY = 'smartbook:accounts:v1'
const SESSION_KEY = 'smartbook:session:v1'

/* ---------- storage ---------- */

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
const write = (key: string, value: unknown) => {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable: the session lasts until reload */
  }
}

/* ---------- hashing ---------- */

const hex = (buf: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('')
const newSalt = () => hex(crypto.getRandomValues(new Uint8Array(16)))
const hasSubtle = () => typeof crypto !== 'undefined' && !!crypto.subtle

async function derive(password: string, salt: string, algo: Account['algo']): Promise<string> {
  if (algo === 'pbkdf2-sha256') {
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 120_000, hash: 'SHA-256' }, key, 256)
    return hex(bits)
  }
  // Fallback for insecure contexts (e.g. opening the dev server by LAN IP): salted, iterated FNV-1a.
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  const s = `${salt}:${password}`
  for (let round = 0; round < 4000; round++) {
    for (let i = 0; i < s.length; i++) {
      h1 = Math.imul(h1 ^ s.charCodeAt(i), 0x01000193) >>> 0
      h2 = Math.imul(h2 ^ (s.charCodeAt(i) + round), 0x01000193) >>> 0
    }
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')
}

async function makeAccount(u: SessionUser, password: string): Promise<Account> {
  const salt = newSalt()
  const algo: Account['algo'] = hasSubtle() ? 'pbkdf2-sha256' : 'fnv-fallback'
  return { ...u, salt, algo, hash: await derive(password, salt, algo), createdAt: Date.now() }
}

const normEmail = (e: string) => e.trim().toLowerCase()
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/* ---------- context ---------- */

type Result = { ok: true; user: SessionUser } | { ok: false; error: string; field?: 'name' | 'email' | 'password' | 'confirm' | 'role' }

interface AuthCtx {
  user: SessionUser | null
  signUp: (input: { name: string; email: string; password: string; role: Role }) => Promise<Result>
  logIn: (email: string, password: string) => Promise<Result>
  logOut: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => read<SessionUser | null>(SESSION_KEY, null))
  const seeded = useRef<Promise<void> | null>(null)

  // make sure the two demo accounts exist (hashed on first run)
  const ensureDemo = useCallback(() => {
    if (!seeded.current) {
      seeded.current = (async () => {
        const accounts = read<Account[]>(ACCOUNTS_KEY, [])
        const missing = DEMO_ACCOUNTS.filter(d => !accounts.some(a => a.id === d.id))
        if (!missing.length) return
        const made = await Promise.all(missing.map(({ password, ...u }) => makeAccount(u, password)))
        write(ACCOUNTS_KEY, [...read<Account[]>(ACCOUNTS_KEY, []), ...made])
      })()
    }
    return seeded.current
  }, [])

  useEffect(() => {
    ensureDemo()
  }, [ensureDemo])

  // keep tabs in sync: logging out in one tab logs out the others
  useEffect(() => {
    const onStorage = (e: StorageEvent) => e.key === SESSION_KEY && setUser(read<SessionUser | null>(SESSION_KEY, null))
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const startSession = (a: SessionUser) => {
    const session: SessionUser = { id: a.id, name: a.name, email: a.email, role: a.role, demo: a.demo }
    write(SESSION_KEY, session)
    setUser(session)
    return session
  }

  const signUp: AuthCtx['signUp'] = async ({ name, email, password, role }) => {
    await ensureDemo()
    const accounts = read<Account[]>(ACCOUNTS_KEY, [])
    const e = normEmail(email)
    if (accounts.some(a => a.email === e)) return { ok: false, field: 'email', error: 'An account with this email already exists. Log in instead.' }
    const account = await makeAccount({ id: `user-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: name.trim().replace(/\s+/g, ' '), email: e, role }, password)
    write(ACCOUNTS_KEY, [...accounts, account])
    return { ok: true, user: account }
  }

  const logIn: AuthCtx['logIn'] = async (email, password) => {
    await ensureDemo()
    const account = read<Account[]>(ACCOUNTS_KEY, []).find(a => a.email === normEmail(email))
    if (!account) return { ok: false, field: 'email', error: 'No account uses this email in this browser. Check the spelling or create an account.' }
    let ok = false
    if (account.algo === 'pbkdf2-sha256' && !hasSubtle()) {
      // hash cannot be recomputed here; demo accounts still work with their published passwords
      ok = !!account.demo && DEMO_ACCOUNTS.some(d => d.id === account.id && d.password === password)
    } else {
      ok = (await derive(password, account.salt, account.algo)) === account.hash
    }
    if (!ok) return { ok: false, field: 'password', error: 'The password is incorrect.' }
    return { ok: true, user: startSession(account) }
  }

  const logOut = () => {
    write(SESSION_KEY, null)
    setUser(null)
  }

  return <Ctx.Provider value={{ user, signUp, logIn, logOut }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth must be used inside AuthProvider')
  return c
}
