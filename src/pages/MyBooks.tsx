import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Bookmark, BookOpen, LayoutGrid, Library as LibraryIcon, List, Rows3 } from 'lucide-react'
import BookCover from '../components/BookCover'
import BookSpine from '../components/BookSpine'
import BookCard from '../components/BookCard'
import { useBookModal } from '../components/BookDetails'
import { useBookTransition } from '../components/BookTransition'
import { bookProgress, timeAgo, useStore } from '../store/AppStore'
import type { Book } from '../data/types'

type Tab = 'reading' | 'saved' | 'completed'
type View = 'shelf' | 'grid' | 'list'

export default function MyBooks() {
  const { books, progress, saved, quiz, bookmarks } = useStore()
  const { openBook } = useBookModal()
  const { openBook: openReader } = useBookTransition()
  const [tab, setTab] = useState<Tab>('reading')
  const [view, setView] = useState<View>('shelf')

  const visible = books.filter(b => b.status === 'published')
  const pct = (b: Book) => bookProgress(b, progress[b.id])
  const reading = visible.filter(b => progress[b.id] && pct(b) < 100).sort((a, b) => progress[b.id].updatedAt - progress[a.id].updatedAt)
  const completed = visible.filter(b => pct(b) === 100)
  const savedBooks = saved.map(id => visible.find(b => b.id === id)).filter(Boolean) as Book[]

  const lists: Record<Tab, Book[]> = { reading, saved: savedBooks, completed }
  const current = lists[tab]

  const chaptersDone = Object.entries(progress).reduce((a, [id, p]) => a + (visible.some(b => b.id === id) ? p.done.length : 0), 0)
  const exercises = Object.keys(quiz).length
  const bookmarkCount = Object.values(bookmarks).reduce((a, l) => a + l.length, 0)

  const TABS: { id: Tab; label: string }[] = [
    { id: 'reading', label: 'Continue reading' },
    { id: 'saved', label: 'Saved' },
    { id: 'completed', label: 'Completed' },
  ]

  // split into shelves of up to 9 books
  const shelves: Book[][] = []
  for (let i = 0; i < current.length; i += 9) shelves.push(current.slice(i, i + 9))

  return (
    <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8 border-b border-ink/80 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Personal bookshelf</p>
          <h1 className="mt-3 font-serif text-[44px] font-semibold leading-none tracking-[-0.02em]">My Books</h1>
        </div>
        <dl className="grid grid-cols-2 gap-x-10 gap-y-4 sm:grid-cols-4">
          <Stat label="Reading now" value={reading.length} />
          <Stat label="Chapters finished" value={chaptersDone} />
          <Stat label="Exercises answered" value={exercises} />
          <Stat label="Bookmarks" value={bookmarkCount} />
        </dl>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div role="tablist" className="flex gap-6">
          {TABS.map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`relative pb-2 text-[15px] transition-colors ${tab === t.id ? 'text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-forest' : 'text-muted hover:text-ink'}`}
            >
              {t.label} <span className="ml-1 text-[12px] tabular-nums text-muted">{lists[t.id].length}</span>
            </button>
          ))}
        </div>
        <div className="flex rounded-md border border-rule bg-paper p-0.5" role="radiogroup" aria-label="View">
          {(
            [
              { id: 'shelf', icon: <Rows3 size={15} />, label: 'Shelf' },
              { id: 'grid', icon: <LayoutGrid size={15} />, label: 'Grid' },
              { id: 'list', icon: <List size={15} />, label: 'List' },
            ] as const
          ).map(v => (
            <button
              key={v.id}
              role="radio"
              aria-checked={view === v.id}
              onClick={() => setView(v.id)}
              className={`flex h-8 items-center gap-1.5 rounded-[5px] px-3 text-[13px] ${view === v.id ? 'bg-ink/[0.07] text-ink' : 'text-muted hover:text-ink'}`}
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 min-h-[300px]">
        {current.length === 0 ? (
          <Empty tab={tab} />
        ) : view === 'shelf' ? (
          <div className="space-y-10">
            {shelves.map((row, i) => (
              <div key={i} className="relative">
                <div className="shelf-back flex min-h-[230px] items-end gap-[3px] overflow-x-auto rounded-t-[3px] px-6 pt-6">
                  {row.map(b => (
                    <BookSpine key={b.id} book={b} progress={tab === 'reading' ? pct(b) : undefined} onClick={() => openBook(b.id)} />
                  ))}
                  {/* bookend */}
                  <div aria-hidden className="ml-1 flex shrink-0 items-end">
                    <div className="h-[118px] w-[10px] rounded-tr-[3px] bg-gradient-to-r from-[#3b3a37] to-[#55534e] shadow-[2px_0_4px_rgba(0,0,0,.25)]" />
                    <div className="h-[8px] w-[34px] bg-[#45443f]" />
                  </div>
                </div>
                <div className="shelf-board h-5 rounded-b-[2px]" />
              </div>
            ))}
            {tab === 'reading' && (
              <p className="flex items-center gap-2 text-[12px] text-muted">
                <span className="inline-block h-3 w-1.5 rounded-b-[1px] bg-wine" /> A ribbon marks books you are in the middle of.
              </p>
            )}
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-5">
            {current.map(b => (
              <div key={b.id}>
                <BookCard book={b} onOpen={openBook} note={progress[b.id] ? `${pct(b)}% read · ${timeAgo(progress[b.id].updatedAt)}` : undefined} />
                {progress[b.id] && pct(b) < 100 && (
                  <div className="mt-2 h-[3px] rounded-full bg-line">
                    <div className="h-full rounded-full bg-forest" style={{ width: `${Math.max(pct(b), 3)}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {current.map(b => {
              const p = progress[b.id]
              const ch = p ? b.chapters.find(c => c.id === p.last) : undefined
              return (
                <li key={b.id} className="flex items-center gap-5 py-4">
                  <button onClick={() => openBook(b.id)} aria-label={`Details: ${b.title}`}>
                    <BookCover book={b} size="xs" className="!w-12" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <button onClick={() => openBook(b.id)} className="truncate text-left font-serif text-[17px] font-semibold hover:text-forest">
                      {b.title}
                    </button>
                    <p className="truncate text-[13px] text-soft">
                      {b.author} · {b.category}
                    </p>
                  </div>
                  <div className="hidden w-56 md:block">
                    {p ? (
                      <>
                        <div className="flex justify-between text-[12px] text-muted">
                          <span className="truncate">{ch ? `Ch. ${b.chapters.indexOf(ch) + 1}: ${ch.title}` : ''}</span>
                          <span className="ml-2 tabular-nums">{pct(b)}%</span>
                        </div>
                        <div className="mt-1.5 h-[3px] rounded-full bg-line">
                          <div className="h-full rounded-full bg-forest" style={{ width: `${Math.max(pct(b), 2)}%` }} />
                        </div>
                      </>
                    ) : (
                      <span className="text-[12px] text-muted">Not started</span>
                    )}
                  </div>
                  <button className="btn-secondary btn-sm shrink-0" onClick={e => openReader({ bookId: b.id, chapterId: p?.last, from: e.currentTarget })}>
                    <BookOpen size={14} /> {p ? (pct(b) === 100 ? 'Reread' : 'Resume') : 'Start'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {tab === 'reading' && reading[0] && (
        <section className="mt-16 grid items-center gap-8 rounded-md border border-line bg-paper p-6 sm:p-8 md:grid-cols-[auto_1fr_auto]">
          <BookCover book={reading[0]} size="sm" />
          <div>
            <p className="eyebrow">Last opened · {timeAgo(progress[reading[0].id].updatedAt)}</p>
            <h2 className="mt-2 font-serif text-2xl font-semibold">{reading[0].title}</h2>
            <p className="mt-1 font-serif text-[16px] text-soft">
              {(() => {
                const c = reading[0].chapters.find(x => x.id === progress[reading[0].id].last)
                return c ? `Chapter ${reading[0].chapters.indexOf(c) + 1} — ${c.title}` : ''
              })()}
            </p>
            <div className="mt-4 flex max-w-md gap-1">
              {reading[0].chapters.map(c => (
                <span
                  key={c.id}
                  title={c.title}
                  className={`h-1.5 flex-1 rounded-full ${progress[reading[0].id].done.includes(c.id) ? 'bg-forest' : c.id === progress[reading[0].id].last ? 'bg-forest/40' : 'bg-line'}`}
                />
              ))}
            </div>
            <p className="mt-2 text-[12px] text-muted">
              {progress[reading[0].id].done.length} of {reading[0].chapters.length} chapters finished
            </p>
          </div>
          <button className="btn-primary" onClick={e => openReader({ bookId: reading[0].id, chapterId: progress[reading[0].id].last, from: e.currentTarget })}>
            Continue reading <ArrowRight size={16} />
          </button>
        </section>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className="font-serif text-[28px] font-semibold tabular-nums leading-tight">{value}</dd>
    </div>
  )
}

function Empty({ tab }: { tab: Tab }) {
  const text = {
    reading: { icon: <BookOpen size={26} strokeWidth={1.4} />, title: 'You are not reading anything right now', body: 'Open any book in the Library and it will appear here with your progress.' },
    saved: { icon: <Bookmark size={26} strokeWidth={1.4} />, title: 'No saved books yet', body: 'Use “Save” on a book’s page to keep it on this shelf for later.' },
    completed: { icon: <LibraryIcon size={26} strokeWidth={1.4} />, title: 'No finished books yet', body: 'A book moves here once every chapter is marked as read.' },
  }[tab]
  return (
    <div className="shelf-back rounded-md px-6 py-16 text-center">
      <span className="mx-auto flex justify-center text-muted">{text.icon}</span>
      <p className="mt-4 font-serif text-xl">{text.title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{text.body}</p>
      <Link to="/" className="btn-secondary mt-6">
        Browse the Library
      </Link>
    </div>
  )
}
