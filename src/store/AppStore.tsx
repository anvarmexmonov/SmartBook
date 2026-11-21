import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { BOOKS, SEED_DRAFT } from '../data/books'
import type { Book, Category } from '../data/types'
import type { Role } from './Auth'

export type { Role } from './Auth'
export type ReaderTheme = 'paper' | 'sepia' | 'night'

export interface ReaderSettings {
  fontStep: number // 0..3
  theme: ReaderTheme
  family: 'serif' | 'sans'
}

export interface BookProgress {
  last: string
  done: string[]
  updatedAt: number
}

/** Belongs to one account: reading progress, shelf, answers, settings. */
interface Personal {
  saved: string[]
  progress: Record<string, BookProgress>
  bookmarks: Record<string, string[]>
  reader: ReaderSettings
  quiz: Record<string, number>
  plan: string[]
  interests: Category[]
}

/** Shared by every account in this browser: authored/published books and law reviews. */
interface Shared {
  customBooks: Record<string, Book>
  lexReviews: Record<string, 'approved' | 'dismissed'>
}

type PersistedState = Personal & Shared

const LEGACY_KEY = 'smartbook:v1'
const SHARED_KEY = 'smartbook:shared:v2'
const userKey = (id: string) => `smartbook:user:v2:${id}`
const DEMO_STUDENT_ID = 'student-demo'
const DAY = 86_400_000

const now = Date.now()
const SEED_PERSONAL: Personal = {
  saved: ['international-human-rights', 'corporate-governance', 'civil-law-fundamentals'],
  progress: {
    'civil-law-fundamentals': { last: 'clf-4', done: ['clf-1', 'clf-2', 'clf-3'], updatedAt: now - 2 * 3600_000 },
    'constitutional-law-uz': { last: 'con-1', done: [], updatedAt: now - 1 * DAY },
    'criminal-procedure': { last: 'crp-1', done: ['crp-1'], updatedAt: now - 4 * DAY },
    'legal-research-writing': { last: 'lrw-4', done: ['lrw-1', 'lrw-2', 'lrw-3', 'lrw-4'], updatedAt: now - 12 * DAY },
  },
  bookmarks: { 'civil-law-fundamentals': ['clf-3'] },
  reader: { fontStep: 1, theme: 'paper', family: 'serif' },
  quiz: { 'c4-quiz-1': 0 },
  plan: [],
  interests: ['Business Law', 'Civil Law'],
}
/** A newly registered account starts with an empty shelf. */
const EMPTY_PERSONAL: Personal = {
  saved: [],
  progress: {},
  bookmarks: {},
  reader: { fontStep: 1, theme: 'paper', family: 'serif' },
  quiz: {},
  plan: [],
  interests: [],
}
const SEED_SHARED: Shared = { customBooks: { [SEED_DRAFT.id]: SEED_DRAFT }, lexReviews: {} }

const readJSON = (key: string) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const seedFor = (userId: string | null) => (userId === DEMO_STUDENT_ID ? SEED_PERSONAL : EMPTY_PERSONAL)

function load(userId: string | null): PersistedState {
  const legacy = readJSON(LEGACY_KEY) // single-user data from earlier versions of the prototype
  const shared: Shared = { ...SEED_SHARED, ...(readJSON(SHARED_KEY) ?? (legacy ? { customBooks: legacy.customBooks, lexReviews: legacy.lexReviews } : {})) }
  const stored = userId ? readJSON(userKey(userId)) : null
  const personal: Personal = { ...seedFor(userId), ...(stored ?? (userId === DEMO_STUDENT_ID && legacy ? legacy : {})) }
  const { saved, progress, bookmarks, reader, quiz, plan, interests } = personal
  return { saved, progress, bookmarks, reader, quiz, plan, interests, ...shared }
}

interface Store extends PersistedState {
  role: Role
  books: Book[]
  getBook: (id: string) => Book | undefined
  toggleSaved: (id: string) => void
  openChapter: (bookId: string, chapterId: string) => void
  completeChapter: (bookId: string, chapterId: string) => void
  toggleBookmark: (bookId: string, chapterId: string) => void
  setReader: (patch: Partial<ReaderSettings>) => void
  answerQuiz: (blockId: string, option: number | null) => void
  saveBook: (book: Book) => void
  deleteBook: (id: string) => void
  reviewLex: (refId: string, decision: 'approved' | 'dismissed' | null) => void
  togglePlan: (id: string) => void
  toggleInterest: (c: Category) => void
  resetDemo: () => void
}

const Ctx = createContext<Store | null>(null)

/** Mount with `key={userId}` so each account gets its own state. */
export function AppStoreProvider({ children, userId, role }: { children: ReactNode; userId: string | null; role: Role }) {
  const [state, setState] = useState<PersistedState>(() => load(userId))

  useEffect(() => {
    if (!userId) return // logged-out visitors never write anything
    const { customBooks, lexReviews, ...personal } = state
    try {
      localStorage.setItem(SHARED_KEY, JSON.stringify({ customBooks, lexReviews }))
      localStorage.setItem(userKey(userId), JSON.stringify(personal))
    } catch {
      /* storage unavailable — keep in memory */
    }
  }, [state, userId])

  const books = useMemo(() => {
    const base = BOOKS.map(b => state.customBooks[b.id] ?? b)
    const extra = Object.values(state.customBooks).filter(b => !BOOKS.some(x => x.id === b.id))
    return [...base, ...extra]
  }, [state.customBooks])

  const getBook = useCallback((id: string) => books.find(b => b.id === id), [books])

  const patch = (fn: (s: PersistedState) => Partial<PersistedState>) => setState(s => ({ ...s, ...fn(s) }))

  const store: Store = {
    ...state,
    role,
    books,
    getBook,
    toggleSaved: id =>
      patch(s => ({ saved: s.saved.includes(id) ? s.saved.filter(x => x !== id) : [id, ...s.saved] })),
    openChapter: (bookId, chapterId) =>
      patch(s => {
        const p = s.progress[bookId] ?? { last: chapterId, done: [], updatedAt: 0 }
        return { progress: { ...s.progress, [bookId]: { ...p, last: chapterId, updatedAt: Date.now() } } }
      }),
    completeChapter: (bookId, chapterId) =>
      patch(s => {
        const p = s.progress[bookId] ?? { last: chapterId, done: [], updatedAt: 0 }
        if (p.done.includes(chapterId)) return {}
        return {
          progress: { ...s.progress, [bookId]: { ...p, done: [...p.done, chapterId], updatedAt: Date.now() } },
        }
      }),
    toggleBookmark: (bookId, chapterId) =>
      patch(s => {
        const list = s.bookmarks[bookId] ?? []
        const next = list.includes(chapterId) ? list.filter(x => x !== chapterId) : [...list, chapterId]
        return { bookmarks: { ...s.bookmarks, [bookId]: next } }
      }),
    setReader: p => patch(s => ({ reader: { ...s.reader, ...p } })),
    answerQuiz: (blockId, option) =>
      patch(s => {
        const quiz = { ...s.quiz }
        if (option === null) delete quiz[blockId]
        else quiz[blockId] = option
        return { quiz }
      }),
    saveBook: book => patch(s => ({ customBooks: { ...s.customBooks, [book.id]: book } })),
    deleteBook: id =>
      patch(s => {
        const customBooks = { ...s.customBooks }
        delete customBooks[id]
        return { customBooks, saved: s.saved.filter(x => x !== id) }
      }),
    reviewLex: (refId, decision) =>
      patch(s => {
        const lexReviews = { ...s.lexReviews }
        if (decision === null) delete lexReviews[refId]
        else lexReviews[refId] = decision
        return { lexReviews }
      }),
    togglePlan: id => patch(s => ({ plan: s.plan.includes(id) ? s.plan.filter(x => x !== id) : [...s.plan, id] })),
    toggleInterest: c =>
      patch(s => ({ interests: s.interests.includes(c) ? s.interests.filter(x => x !== c) : [...s.interests, c] })),
    resetDemo: () => setState({ ...seedFor(userId), ...SEED_SHARED }),
  }

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore must be used inside AppStoreProvider')
  return s
}

export function bookProgress(book: Book, p?: BookProgress) {
  if (!p || book.chapters.length === 0) return 0
  const done = p.done.filter(id => book.chapters.some(c => c.id === id)).length
  return Math.round((done / book.chapters.length) * 100)
}

export function timeAgo(ts: number) {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3600_000) return `${Math.round(diff / 60_000)} min ago`
  if (diff < DAY) return `${Math.round(diff / 3600_000)} h ago`
  const d = Math.round(diff / DAY)
  return d === 1 ? 'yesterday' : `${d} days ago`
}
