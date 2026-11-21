import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Plus, RotateCcw, Search, X } from 'lucide-react'
import BookCover from '../components/BookCover'
import BookCard from '../components/BookCard'
import { useBookModal } from '../components/BookDetails'
import { useBookTransition } from '../components/BookTransition'
import { bookProgress, timeAgo, useStore } from '../store/AppStore'
import { CATEGORIES, type Category } from '../data/types'

const FEATURED = ['civil-law-fundamentals', 'constitutional-law-uz', 'international-human-rights']

export default function Library() {
  const { books, progress, interests, toggleInterest, quiz, role } = useStore()
  const isStudent = role === 'student'
  const { openBook } = useBookModal()
  const { openBook: openReader } = useBookTransition()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'All'>('All')
  const [addingInterest, setAddingInterest] = useState(false)
  const catalogRef = useRef<HTMLDivElement>(null)

  const published = books.filter(b => b.status === 'published')
  const q = query.trim().toLowerCase()
  const filtering = q.length > 0 || category !== 'All'

  const results = useMemo(
    () =>
      published.filter(
        b =>
          (category === 'All' || b.category === category) &&
          (!q ||
            [b.title, b.subtitle ?? '', b.author, b.category, b.description, ...b.chapters.map(c => c.title)]
              .join(' ')
              .toLowerCase()
              .includes(q)),
      ),
    [published, q, category],
  )

  const reading = published
    .filter(b => progress[b.id] && bookProgress(b, progress[b.id]) < 100)
    .sort((a, b) => progress[b.id].updatedAt - progress[a.id].updatedAt)

  const recommended = published
    .filter(b => interests.includes(b.category) && !progress[b.id])
    .slice(0, 4)

  // Revision suggestion: contract exercises answered incorrectly
  const contractQuizzes = { 'c4-quiz-1': 1, 'c4-quiz-2': 2 } as Record<string, number>
  const missed = Object.entries(contractQuizzes).filter(([id, correct]) => quiz[id] !== undefined && quiz[id] !== correct)

  const featured = FEATURED.map(id => published.find(b => b.id === id)).filter(Boolean) as typeof published

  const pickCategory = (c: Category | 'All') => {
    setCategory(c)
    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-14 pt-12 sm:px-6 md:pt-16 lg:grid-cols-[1.1fr_1fr] lg:px-8">
          <div className="flex flex-col justify-center">
            <p className="eyebrow">Faculty library · Autumn semester 2026</p>
            <h1 className="mt-4 max-w-xl font-serif text-[40px] font-semibold leading-[1.06] tracking-[-0.02em] text-ink sm:text-[54px]">
              Textbooks that read like books and teach like seminars.
            </h1>
            <p className="mt-5 max-w-lg font-serif text-[18px] leading-relaxed text-soft">
              Course books written by the faculty, with exercises, a reading tutor and references to the legislation they rely on.
            </p>
            <form
              className="mt-8 max-w-xl"
              onSubmit={e => {
                e.preventDefault()
                catalogRef.current?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              <label htmlFor="search" className="sr-only">Search the library</label>
              <div className="flex items-center rounded-md border border-rule bg-paper shadow-panel focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/15">
                <Search size={18} className="ml-4 shrink-0 text-muted" />
                <input
                  id="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search titles, authors, topics — e.g. “offer”, “Senate”"
                  className="h-14 min-w-0 flex-1 bg-transparent px-3 text-[15px] placeholder:text-muted/70 focus:outline-none"
                />
                {query && (
                  <button type="button" className="icon-btn mr-1" onClick={() => setQuery('')} aria-label="Clear search">
                    <X size={16} />
                  </button>
                )}
                <button type="submit" className="btn-primary mr-2 hidden sm:inline-flex">Search</button>
              </div>
            </form>
          </div>

          {/* Featured trio on a ledge */}
          <div className="relative hidden items-end justify-center lg:flex">
            <div className="relative flex items-end gap-6 pb-6">
              {featured.map((b, i) => (
                <button
                  key={b.id}
                  onClick={() => openBook(b.id)}
                  className="group transition-transform duration-300 hover:-translate-y-2"
                  style={{ marginBottom: i === 1 ? 18 : 0 }}
                  aria-label={`Open ${b.title}`}
                >
                  <BookCover book={b} size={i === 1 ? 'lg' : 'md'} className="group-hover:shadow-book-hover" />
                </button>
              ))}
              <div className="absolute inset-x-[-24px] bottom-0 h-6 rounded-[2px] shelf-board" />
            </div>
          </div>
        </div>
      </section>

      {/* Category bar */}
      <div className="border-b border-line bg-paper/60">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
          {(['All', ...CATEGORIES] as const).map(c => {
            const count = c === 'All' ? published.length : published.filter(b => b.category === c).length
            const active = category === c
            return (
              <button
                key={c}
                onClick={() => pickCategory(c)}
                className={`chip shrink-0 ${active ? 'border-forest bg-forest text-paper' : 'border-rule bg-paper text-soft hover:border-soft/50 hover:text-ink'}`}
              >
                {c}
                <span className={`text-[11px] tabular-nums ${active ? 'text-paper/70' : 'text-muted'}`}>{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {!filtering && (
          <>
            {isStudent && reading.length > 0 && (
              <section className="pt-14">
                <SectionHead title="Continue reading" action={role === 'student' ? { label: 'My Books', onClick: () => navigate('/my-books') } : undefined} />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {reading.slice(0, 3).map(b => {
                    const p = progress[b.id]
                    const chapter = b.chapters.find(c => c.id === p.last)
                    const idx = b.chapters.findIndex(c => c.id === p.last)
                    const pct = bookProgress(b, p)
                    return (
                      <div key={b.id} className="flex min-w-0 gap-4 rounded-md border border-line bg-paper p-4 transition-shadow hover:shadow-panel">
                        <button onClick={() => openBook(b.id)} aria-label={`Details: ${b.title}`}>
                          <BookCover book={b} size="xs" className="!w-16" />
                        </button>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <p className="truncate font-serif text-[16px] font-semibold">{b.title}</p>
                          <p className="truncate text-[13px] text-soft">
                            Ch. {idx + 1} · {chapter?.title}
                          </p>
                          <div className="mt-auto pt-3">
                            <div className="h-[3px] rounded-full bg-line">
                              <div className="h-full rounded-full bg-forest" style={{ width: `${Math.max(pct, 3)}%` }} />
                            </div>
                            <div className="mt-2 flex items-center justify-between text-[12px] text-muted">
                              <span>{pct}% · {timeAgo(p.updatedAt)}</span>
                              <button
                                className="flex items-center gap-1 font-medium text-forest hover:underline"
                                onClick={e => openReader({ bookId: b.id, chapterId: p.last, from: e.currentTarget })}
                              >
                                Resume <ArrowRight size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Personalised (students only) */}
            {isStudent && (
            <section className="pt-16">
              <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
                <div>
                  <SectionHead title="Recommended for you" />
                  <div className="-mt-3 mb-6 flex flex-wrap items-center gap-2 text-[13px] text-muted">
                    <span>Based on your interests:</span>
                    {interests.map(c => (
                      <button
                        key={c}
                        onClick={() => toggleInterest(c)}
                        className="chip h-7 border-forest/30 bg-forest-50 text-forest hover:border-forest/60"
                        aria-label={`Remove interest ${c}`}
                      >
                        {c} <X size={12} />
                      </button>
                    ))}
                    {addingInterest ? (
                      CATEGORIES.filter(c => !interests.includes(c)).map(c => (
                        <button
                          key={c}
                          onClick={() => {
                            toggleInterest(c)
                            setAddingInterest(false)
                          }}
                          className="chip h-7 border-dashed border-rule text-soft hover:border-soft"
                        >
                          <Plus size={12} /> {c}
                        </button>
                      ))
                    ) : (
                      <button onClick={() => setAddingInterest(true)} className="chip h-7 border-dashed border-rule text-soft hover:border-soft">
                        <Plus size={12} /> Add interest
                      </button>
                    )}
                  </div>
                  {recommended.length > 0 ? (
                    <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
                      {recommended.map(b => (
                        <BookCard key={b.id} book={b} onOpen={openBook} note={`Because you follow ${b.category}`} />
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-md border border-dashed border-rule px-6 py-10 text-center font-serif text-soft">
                      {interests.length === 0
                        ? 'Add an interest to see books chosen for you.'
                        : 'You have already started every book in these subjects. Try adding another interest.'}
                    </p>
                  )}
                </div>

                <aside className="self-start rounded-md border border-line bg-paper p-6">
                  <p className="eyebrow flex items-center gap-1.5 text-wine">
                    <RotateCcw size={12} /> Revise before your next exercise
                  </p>
                  {missed.length > 0 ? (
                    <>
                      <p className="mt-3 font-serif text-[17px] leading-snug">
                        You missed {missed.length === 1 ? 'one exercise' : `${missed.length} exercises`} in “Formation of Contracts”.
                      </p>
                      <p className="mt-2 text-[13px] leading-relaxed text-soft">
                        These short readings cover the same ideas from a different angle.
                      </p>
                      <ul className="mt-4 divide-y divide-line border-y border-line">
                        <RevisionItem title="§4.2 Essential terms" meta="Civil Law Fundamentals · 8 min" onClick={e => openReader({ bookId: 'civil-law-fundamentals', chapterId: 'clf-4', hash: 'c4-h-2', from: e.currentTarget })} />
                        <RevisionItem title="§4.3 Offer and acceptance" meta="Civil Law Fundamentals · 10 min" onClick={e => openReader({ bookId: 'civil-law-fundamentals', chapterId: 'clf-4', hash: 'c4-h-3', from: e.currentTarget })} />
                        <RevisionItem title="Ch. 3 Obligations and their performance" meta="Civil Law Fundamentals · 18 min" onClick={e => openReader({ bookId: 'civil-law-fundamentals', chapterId: 'clf-3', from: e.currentTarget })} />
                      </ul>
                    </>
                  ) : (
                    <p className="mt-3 font-serif text-[16px] leading-snug text-soft">
                      Nothing to revise — your recent contract exercises are all correct.
                    </p>
                  )}
                </aside>
              </div>
            </section>

            )}

            {/* Featured */}
            <section className="pt-20">
              <SectionHead title="Editor’s selection" subtitle="Three books the faculty recommends for this semester." />
              <div className="grid gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-3">
                {featured.map(b => (
                  <button key={b.id} onClick={() => openBook(b.id)} className="group flex gap-5 bg-paper p-6 text-left transition-colors hover:bg-white">
                    <BookCover book={b} size="sm" className="shrink-0 transition-transform duration-300 group-hover:-translate-y-1" />
                    <div className="min-w-0">
                      <p className="eyebrow">{b.category}</p>
                      <h3 className="mt-2 font-serif text-[19px] font-semibold leading-tight group-hover:text-forest">{b.title}</h3>
                      <p className="mt-1 text-[13px] text-soft">{b.author}</p>
                      <p className="mt-3 line-clamp-4 font-serif text-[14px] leading-relaxed text-soft">{b.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Catalogue */}
        <section ref={catalogRef} className="scroll-mt-24 pt-20">
          <SectionHead
            title={filtering ? (q ? `Results for “${query.trim()}”` : category) : 'The catalogue'}
            subtitle={filtering ? `${results.length} ${results.length === 1 ? 'book' : 'books'}${category !== 'All' && q ? ` in ${category}` : ''}` : `${published.length} books across ${CATEGORIES.length} subjects`}
            action={filtering ? { label: 'Clear filters', onClick: () => { setQuery(''); setCategory('All') } } : undefined}
          />
          {results.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-5">
              {results.map(b => (
                <BookCard key={b.id} book={b} onOpen={openBook} />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-rule px-6 py-16 text-center">
              <p className="font-serif text-xl">No books match this search.</p>
              <p className="mt-2 text-sm text-muted">Try a broader term such as “contract”, “rights” or an author’s surname.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function SectionHead({ title, subtitle, action }: { title: string; subtitle?: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="mb-7 flex items-end justify-between gap-4 border-b border-ink/80 pb-3">
      <div>
        <h2 className="font-serif text-[26px] font-semibold tracking-[-0.01em]">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {action && (
        <button onClick={action.onClick} className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-forest hover:underline">
          {action.label} <ArrowRight size={14} />
        </button>
      )}
    </div>
  )
}

function RevisionItem({ title, meta, onClick }: { title: string; meta: string; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void }) {
  return (
    <li>
      <button onClick={onClick} className="group flex w-full items-center justify-between gap-3 py-3 text-left">
        <span>
          <span className="block font-serif text-[15px] group-hover:text-forest">{title}</span>
          <span className="text-[12px] text-muted">{meta}</span>
        </span>
        <ArrowRight size={15} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-forest" />
      </button>
    </li>
  )
}
