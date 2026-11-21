import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../store/Auth'
import { Bookmark, BookmarkCheck, BookOpen, Check, Clock, PenLine, X } from 'lucide-react'
import BookCover from './BookCover'
import { useBookTransition } from './BookTransition'
import { bookProgress, useStore } from '../store/AppStore'

export function useBookModal() {
  const [params, setParams] = useSearchParams()
  return {
    openBook: (id: string) => {
      const next = new URLSearchParams(params)
      next.set('book', id)
      setParams(next)
    },
    closeBook: () => {
      const next = new URLSearchParams(params)
      next.delete('book')
      setParams(next, { replace: true })
    },
    bookId: params.get('book'),
  }
}

export default function BookDetails() {
  const { bookId, closeBook } = useBookModal()
  const { getBook, saved, toggleSaved, progress: myProgress, role } = useStore()
  const { user } = useAuth()
  // professors have no personal reading progress; they preview books as a student would
  const progress = role === 'professor' ? {} : myProgress
  const { openBook } = useBookTransition()
  const coverRef = useRef<HTMLDivElement>(null)
  const book = bookId ? getBook(bookId) : undefined

  useEffect(() => {
    if (!book) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeBook()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [book])

  if (!book) return null

  const isSaved = saved.includes(book.id)
  const isProfessor = role === 'professor'
  const p = progress[book.id]
  const pct = bookProgress(book, p)
  const startChapter = p?.last ?? book.chapters.find(c => c.blocks)?.id ?? book.chapters[0]?.id
  const totalMin = book.chapters.reduce((a, c) => a + c.minutes, 0)

  const read = (chapterId?: string) => openBook({ bookId: book.id, chapterId: chapterId ?? startChapter, from: coverRef.current })

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={book.title}>
      <button aria-label="Close" className="absolute inset-0 animate-fadeIn bg-ink/30" onClick={closeBook} />
      <div className="scroll-thin relative flex h-full w-full max-w-2xl animate-slideIn flex-col overflow-y-auto bg-paper shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper/95 px-6 py-3 backdrop-blur">
          <span className="eyebrow">{book.category}</span>
          <button className="icon-btn" onClick={closeBook} aria-label="Close details">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-10 pt-8 sm:px-10">
          <div className="flex flex-col gap-8 sm:flex-row">
            <div ref={coverRef} className="shrink-0 self-center sm:self-start">
              <BookCover book={book} size="lg" />
            </div>
            <div className="min-w-0 flex-1">
              {book.status === 'draft' && <span className="demo-tag mb-3">Draft preview</span>}
              <h2 className="font-serif text-[32px] font-semibold leading-[1.1] tracking-[-0.015em]">{book.title}</h2>
              {book.subtitle && <p className="mt-2 font-serif text-lg italic text-soft">{book.subtitle}</p>}
              <p className="mt-4 text-sm text-ink">{book.author}</p>
              <p className="text-[13px] text-muted">{book.authorRole}</p>

              <dl className="mt-6 grid grid-cols-3 gap-4 border-y border-line py-4 text-[13px]">
                <div>
                  <dt className="text-muted">Chapters</dt>
                  <dd className="mt-0.5 font-medium">{book.chapters.length}</dd>
                </div>
                <div>
                  <dt className="text-muted">Pages</dt>
                  <dd className="mt-0.5 font-medium">{book.pages}</dd>
                </div>
                <div>
                  <dt className="text-muted">Edition</dt>
                  <dd className="mt-0.5 font-medium">{book.edition ?? book.year}</dd>
                </div>
              </dl>

              <div className="mt-6 flex flex-wrap gap-2">
                <button className="btn-primary" onClick={() => read()}>
                  <BookOpen size={16} />
                  {isProfessor ? 'Preview as student' : p ? (pct === 100 ? 'Read again' : 'Continue reading') : 'Start reading'}
                </button>
                {isProfessor ? (
                  book.ownerId === user?.id && (
                    <Link to={`/studio/${book.id}`} className="btn-secondary">
                      <PenLine size={15} /> Edit in Studio
                    </Link>
                  )
                ) : (
                  <button className={isSaved ? 'btn-secondary border-forest/40 text-forest' : 'btn-secondary'} onClick={() => toggleSaved(book.id)}>
                    {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                    {isSaved ? 'Saved to My Books' : 'Save'}
                  </button>
                )}
              </div>
              {p && (
                <div className="mt-5">
                  <div className="flex justify-between text-[12px] text-muted">
                    <span>Your progress</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-line">
                    <div className="h-full rounded-full bg-forest transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="mt-10 font-serif text-[17px] leading-[1.65] text-soft">{book.description}</p>

          <div className="mt-10">
            <div className="flex items-baseline justify-between border-b border-ink/80 pb-2">
              <h3 className="font-serif text-xl font-semibold">Contents</h3>
              <span className="flex items-center gap-1 text-[12px] text-muted">
                <Clock size={13} /> about {Math.round(totalMin / 6) / 10} h of reading
              </span>
            </div>
            <ol>
              {book.chapters.map((c, i) => {
                const done = p?.done.includes(c.id)
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => read(c.id)}
                      className="group flex w-full items-baseline gap-4 border-b border-line py-3 text-left transition-colors hover:bg-ivory/70"
                    >
                      <span className="w-6 shrink-0 font-serif text-sm tabular-nums text-muted">{i + 1}</span>
                      <span className="flex-1 font-serif text-[16px] group-hover:text-forest">{c.title}</span>
                      {!c.blocks && <span className="hidden text-[11px] text-muted sm:inline">Not in demo edition</span>}
                      {done && <Check size={14} className="text-forest" aria-label="Completed" />}
                      <span className="w-12 shrink-0 text-right text-[12px] tabular-nums text-muted">{c.minutes} min</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>

          <p className="mt-8 text-[11px] leading-relaxed text-muted">
            Fictional demo textbook prepared for LexHackathon. Authors, editions and page counts are illustrative.
          </p>
        </div>
      </div>
    </div>
  )
}
