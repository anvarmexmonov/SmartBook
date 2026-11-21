import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ClipboardList,
  Eye,
  FileText,
  Heading2,
  Info,
  Pilcrow,
  Plus,
  Quote,
  Scale,
  Send,
  Trash2,
  Undo2,
} from 'lucide-react'
import BookCover, { PALETTES } from '../components/BookCover'
import ChapterBlocks from '../components/ChapterBlocks'
import { RICH_LABELS, RichBlockFields, RichInsert, isRichBlock } from '../components/StudioTools'
import { useStore } from '../store/AppStore'
import { PROFESSOR_ID, PROFESSOR_NAME } from '../data/books'
import { useAuth } from '../store/Auth'
import { LEX_REFS } from '../data/lex'
import { CATEGORIES, type Block, type BlockType, type Book, type Category, type CoverMotif, type CoverPalette } from '../data/types'

const uid = () => Math.random().toString(36).slice(2, 9)

// Only professors reach this page (see RoleOnly in App.tsx).
export default function Studio() {
  const { bookId } = useParams()
  return bookId ? <Editor bookId={bookId} /> : <StudioHome />
}

/** The signed-in professor; the demo professor owns the seeded books. */
function useAuthor() {
  const { user } = useAuth()
  return { id: user?.id ?? PROFESSOR_ID, name: user?.name ?? PROFESSOR_NAME }
}

/* ================= Studio home ================= */

function StudioHome() {
  const { books, saveBook } = useStore()
  const navigate = useNavigate()
  const author = useAuthor()
  const mine = books.filter(b => b.ownerId === author.id)
  const drafts = mine.filter(b => b.status === 'draft')
  const published = mine.filter(b => b.status === 'published')

  const create = () => {
    const id = `book-${uid()}`
    const book: Book = {
      id,
      title: 'Untitled textbook',
      author: author.name,
      authorRole: 'Department of Civil Law',
      category: 'Civil Law',
      year: 2026,
      pages: 0,
      description: '',
      cover: { palette: 'navy', motif: 'frame' },
      ownerId: author.id,
      status: 'draft',
      chapters: [{ id: `ch-${uid()}`, title: 'Introduction', minutes: 5, blocks: [{ id: uid(), type: 'p', text: '' }] }],
    }
    saveBook(book)
    navigate(`/studio/${id}`)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-ink/80 pb-8">
        <div>
          <p className="eyebrow">Professor Studio · {author.name}</p>
          <h1 className="mt-3 font-serif text-[44px] font-semibold leading-none tracking-[-0.02em]">Your books</h1>
        </div>
        <button className="btn-primary" onClick={create}>
          <Plus size={16} /> New book
        </button>
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_380px]">
        <div className="space-y-12">
          <BookGroup title="Drafts" books={drafts} empty="No drafts. Start a new book to see it here." />
          <BookGroup title="Published" books={published} empty="Nothing published yet." />
        </div>
        <LegalReferences />
      </div>
    </div>
  )
}

function BookGroup({ title, books, empty }: { title: string; books: Book[]; empty: string }) {
  const navigate = useNavigate()
  return (
    <section>
      <h2 className="mb-4 flex items-baseline gap-2 font-serif text-xl font-semibold">
        {title} <span className="font-sans text-[13px] font-normal text-muted">{books.length}</span>
      </h2>
      {books.length === 0 ? (
        <p className="rounded-md border border-dashed border-rule px-6 py-8 text-center text-sm text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {books.map(b => {
            const words = b.chapters.reduce(
              (a, c) => a + (c.blocks ?? []).reduce((x, bl) => x + ('text' in bl ? bl.text.split(/\s+/).filter(Boolean).length : 0), 0),
              0,
            )
            return (
              <li key={b.id}>
                <button onClick={() => navigate(`/studio/${b.id}`)} className="group flex w-full items-center gap-5 py-4 text-left">
                  <BookCover book={b} size="xs" className="!w-12 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-[17px] font-semibold group-hover:text-forest">{b.title}</p>
                    <p className="text-[13px] text-muted">
                      {b.category} · {b.chapters.length} {b.chapters.length === 1 ? 'chapter' : 'chapters'} · {words.toLocaleString()} words in demo
                    </p>
                  </div>
                  <span className={`demo-tag shrink-0 ${b.status === 'published' ? '!border-solid !border-forest/30 !text-forest' : ''}`}>{b.status}</span>
                  <span className="hidden text-[13px] font-medium text-forest group-hover:underline sm:inline">Edit</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function LegalReferences() {
  const { lexReviews, reviewLex, getBook } = useStore()
  const author = useAuthor()
  // only notices about provisions linked from this professor's own books
  const notices = Object.values(LEX_REFS).filter(r => r.hasNotice && r.notice && getBook(r.notice.affectedBook)?.ownerId === author.id)
  return (
    <aside className="self-start rounded-md border border-line bg-paper">
      <div className="border-b border-line px-5 py-4">
        <p className="flex items-center gap-2 font-serif text-lg font-semibold">
          <Scale size={17} className="text-forest" /> Legal references
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">
          Provisions of legislation linked from your chapters. When a linked provision may have changed, a notice appears here for review.
        </p>
      </div>
      {notices.length === 0 && <p className="px-5 py-6 text-[13px] text-muted">No notices for your books.</p>}
      {notices.map(r => {
        const n = r.notice!
        const decision = lexReviews[r.id]
        const book = getBook(n.affectedBook)
        const chapter = book?.chapters.find(c => c.id === n.affectedChapter)
        return (
          <div key={r.id} className="px-5 py-5">
            <div className="flex items-center justify-between gap-2">
              <span className="demo-tag !border-wine/40 !text-wine">Sample notice — not a real Lex.uz change</span>
            </div>
            <p className="mt-3 text-[14px] font-medium">
              {r.act}, {r.article} — {r.title}
            </p>
            <p className="mt-1 text-[12px] text-muted">
              Received {n.received} · used in “{chapter?.title}”, {book?.title}
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-soft">{n.summary}</p>

            <div className="mt-4 space-y-2 text-[13px] leading-relaxed">
              <div className="rounded-sm border border-line bg-ivory/60 p-3">
                <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">Text in your chapter</p>
                <p className="font-serif">{r.currentText}</p>
              </div>
              <div className="rounded-sm border border-forest/25 bg-forest-50 p-3">
                <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-forest">Proposed wording (demo)</p>
                <p className="font-serif">
                  <DiffText before={r.currentText} after={n.proposedText} />
                </p>
              </div>
            </div>

            {decision ? (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-sm bg-ivory px-3 py-2.5 text-[13px]">
                <span className="flex items-center gap-1.5 text-forest">
                  <Check size={14} /> {decision === 'approved' ? 'Update approved — students now see the new wording.' : 'Dismissed — chapter left unchanged.'}
                </span>
                <button onClick={() => reviewLex(r.id, null)} className="flex shrink-0 items-center gap-1 text-muted hover:text-ink">
                  <Undo2 size={13} /> Undo
                </button>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn-primary btn-sm" onClick={() => reviewLex(r.id, 'approved')}>
                  <Check size={14} /> Approve update
                </button>
                <button className="btn-secondary btn-sm" onClick={() => reviewLex(r.id, 'dismissed')}>
                  Keep current text
                </button>
                {book && chapter && (
                  <Link to={`/read/${book.id}/${chapter.id}#c4-h-3`} className="btn-ghost btn-sm">
                    <Eye size={14} /> View in chapter
                  </Link>
                )}
              </div>
            )}
          </div>
        )
      })}
      <p className="border-t border-line px-5 py-3 text-[11px] leading-relaxed text-muted">
        This prototype has no live connection to Lex.uz. Notices and wording are illustrative; verify every provision against the official database.
      </p>
    </aside>
  )
}

/** Highlights words that were added in `after` compared with `before` (simple word-level comparison). */
function DiffText({ before, after }: { before: string; after: string }) {
  const a = before.split(' ')
  const b = after.split(' ')
  let start = 0
  while (start < a.length && a[start] === b[start]) start++
  let endA = a.length - 1
  let endB = b.length - 1
  while (endA >= start && endB >= start && a[endA] === b[endB]) {
    endA--
    endB--
  }
  return (
    <>
      {b.slice(0, start).join(' ')}{' '}
      <mark className="rounded-[2px] bg-[#DCE8D8] px-0.5 text-forest">{b.slice(start, endB + 1).join(' ')}</mark>{' '}
      {b.slice(endB + 1).join(' ')}
    </>
  )
}

/* ================= Editor ================= */

const BLOCK_TEMPLATES: { type: BlockType; label: string; icon: ReactNode; make: () => Block }[] = [
  { type: 'h2', label: 'Section heading', icon: <Heading2 size={15} />, make: () => ({ id: uid(), type: 'h2', text: 'New section' }) },
  { type: 'p', label: 'Paragraph', icon: <Pilcrow size={15} />, make: () => ({ id: uid(), type: 'p', text: '' }) },
  { type: 'quote', label: 'Quotation', icon: <Quote size={15} />, make: () => ({ id: uid(), type: 'quote', text: '', source: '' }) },
  { type: 'note', label: 'Note', icon: <Info size={15} />, make: () => ({ id: uid(), type: 'note', text: '' }) },
  {
    type: 'quiz',
    label: 'Quiz',
    icon: <ClipboardList size={15} />,
    make: () => ({ id: uid(), type: 'quiz', question: '', options: ['', '', ''], correct: 0, explanation: '' }),
  },
  {
    type: 'case',
    label: 'Case study',
    icon: <FileText size={15} />,
    make: () => ({ id: uid(), type: 'case', title: 'Case study', facts: '', question: '', analysis: '' }),
  },
]

const MOTIFS: CoverMotif[] = ['frame', 'band', 'column', 'grid', 'seal', 'rule']

function Editor({ bookId }: { bookId: string }) {
  const { getBook, saveBook, deleteBook } = useStore()
  const author = useAuthor()
  const navigate = useNavigate()
  const original = getBook(bookId)
  const [book, setBook] = useState<Book | undefined>(original)
  const [chapterId, setChapterId] = useState(original?.chapters[0]?.id)
  const [tab, setTab] = useState<'content' | 'details'>('content')
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setBook(original)
    setChapterId(original?.chapters[0]?.id)
  }, [bookId])

  // autosave shortly after edits
  useEffect(() => {
    if (!book || book === original) return
    const t = window.setTimeout(() => {
      saveBook(book)
      setSavedAt(Date.now())
    }, 600)
    return () => window.clearTimeout(t)
  }, [book])

  if (!book || book.ownerId !== author.id) {
    return (
      <div className="mx-auto max-w-lg px-6 py-32 text-center">
        <h1 className="font-serif text-3xl font-semibold">Book not found in your Studio</h1>
        <Link to="/studio" className="btn-primary mt-8">Back to Studio</Link>
      </div>
    )
  }

  const chapter = book.chapters.find(c => c.id === chapterId) ?? book.chapters[0]
  const update = (patch: Partial<Book>) => setBook(b => (b ? { ...b, ...patch } : b))
  const updateChapters = (fn: (chs: Book['chapters']) => Book['chapters']) => setBook(b => (b ? { ...b, chapters: fn(b.chapters) } : b))
  const updateBlocks = (fn: (bl: Block[]) => Block[]) =>
    updateChapters(chs => chs.map(c => (c.id === chapter?.id ? { ...c, blocks: fn(c.blocks ?? []) } : c)))

  const addChapter = () => {
    const c = { id: `ch-${uid()}`, title: `Chapter ${book.chapters.length + 1}`, minutes: 5, blocks: [{ id: uid(), type: 'p', text: '' } as Block] }
    updateChapters(chs => [...chs, c])
    setChapterId(c.id)
  }
  const moveChapter = (i: number, d: -1 | 1) =>
    updateChapters(chs => {
      const next = [...chs]
      const j = i + d
      if (j < 0 || j >= next.length) return chs
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  const removeChapter = (id: string) => {
    if (book.chapters.length <= 1) return
    const rest = book.chapters.filter(c => c.id !== id)
    updateChapters(() => rest)
    if (chapterId === id) setChapterId(rest[0].id)
  }

  const persist = (patch: Partial<Book> = {}) => {
    const next = { ...book, ...patch }
    setBook(next)
    saveBook(next)
    setSavedAt(Date.now())
  }

  const blocks = chapter?.blocks ?? []
  const wordCount = blocks.reduce((a, b) => a + ('text' in b ? b.text.split(/\s+/).filter(Boolean).length : 0), 0)

  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-6 sm:px-6 lg:px-8">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line pb-4">
        <button className="icon-btn" onClick={() => navigate('/studio')} aria-label="Back to Studio">
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-xl font-semibold">{book.title || 'Untitled textbook'}</p>
          <p className="text-[12px] text-muted">
            <span className={book.status === 'published' ? 'text-forest' : ''}>{book.status === 'published' ? 'Published' : 'Draft'}</span>
            {' · '}
            {savedAt ? 'All changes saved locally' : 'Changes save automatically'}
          </p>
        </div>
        <button
          className="btn-secondary btn-sm"
          onClick={() => {
            persist()
            navigate(`/read/${book.id}/${chapter?.id}?preview=1`)
          }}
        >
          <Eye size={14} /> Preview as student
        </button>
        {book.status === 'draft' ? (
          <button className="btn-primary btn-sm" onClick={() => persist({ status: 'published' })} disabled={!book.title.trim()}>
            <Send size={14} /> Publish
          </button>
        ) : (
          <button className="btn-secondary btn-sm" onClick={() => persist({ status: 'draft' })}>
            Unpublish
          </button>
        )}
      </div>
      {book.status === 'published' && savedAt && (
        <p className="mt-3 flex items-center gap-2 rounded-sm bg-forest-50 px-3 py-2 text-[13px] text-forest">
          <Check size={14} /> Published in the demo library. Students see your changes immediately.
          <Link to={`/?book=${book.id}`} className="ml-auto font-medium underline">View in Library</Link>
        </p>
      )}

      <div className="mt-6 grid gap-8 xl:grid-cols-[260px_minmax(0,1fr)_minmax(0,0.9fr)] lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Outline */}
        <aside className="space-y-6 self-start lg:sticky lg:top-24">
          <div className="flex rounded-md border border-rule bg-paper p-0.5 text-[13px]">
            {(['content', 'details'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`h-8 flex-1 rounded-[5px] capitalize ${tab === t ? 'bg-ink/[0.07] font-medium text-ink' : 'text-muted'}`}>
                {t === 'content' ? 'Chapters' : 'Book details'}
              </button>
            ))}
          </div>

          {tab === 'content' ? (
            <div>
              <ol className="space-y-1">
                {book.chapters.map((c, i) => (
                  <li key={c.id} className={`group flex items-center gap-1 rounded-md ${c.id === chapter?.id ? 'bg-forest-50' : 'hover:bg-ink/[0.04]'}`}>
                    <button onClick={() => setChapterId(c.id)} className="flex min-w-0 flex-1 items-baseline gap-2 px-2.5 py-2 text-left text-[13.5px]">
                      <span className="w-4 shrink-0 text-[12px] tabular-nums text-muted">{i + 1}</span>
                      <span className={`truncate ${c.id === chapter?.id ? 'font-medium text-forest' : ''}`}>{c.title || 'Untitled chapter'}</span>
                    </button>
                    <span className="hidden shrink-0 pr-1 group-focus-within:flex group-hover:flex">
                      <button className="icon-btn !h-7 !w-7" disabled={i === 0} onClick={() => moveChapter(i, -1)} aria-label="Move chapter up">
                        <ArrowUp size={13} />
                      </button>
                      <button className="icon-btn !h-7 !w-7" disabled={i === book.chapters.length - 1} onClick={() => moveChapter(i, 1)} aria-label="Move chapter down">
                        <ArrowDown size={13} />
                      </button>
                      <button className="icon-btn !h-7 !w-7" disabled={book.chapters.length <= 1} onClick={() => removeChapter(c.id)} aria-label="Delete chapter">
                        <Trash2 size={13} />
                      </button>
                    </span>
                  </li>
                ))}
              </ol>
              <button onClick={addChapter} className="mt-2 flex w-full items-center gap-2 rounded-md border border-dashed border-rule px-3 py-2 text-[13px] text-soft hover:border-soft">
                <Plus size={14} /> Add chapter
              </button>
              {chapter && blocks.filter(b => b.type === 'h2').length > 0 && (
                <div className="mt-6">
                  <p className="eyebrow mb-2">Sections in this chapter</p>
                  <ul className="space-y-1 border-l border-line pl-3 text-[12.5px] text-soft">
                    {blocks.filter(b => b.type === 'h2').map(b => (
                      <li key={b.id}>
                        <a href={`#edit-${b.id}`} className="hover:text-ink">{'text' in b ? b.text : ''}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <BookDetailsForm book={book} update={update} />
          )}

          {book.status === 'draft' && (
            <div className="border-t border-line pt-4">
              {confirmDelete ? (
                <div className="text-[13px]">
                  <p className="text-soft">Delete this draft permanently?</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      className="btn-sm btn border border-wine/40 text-wine hover:bg-wine-50"
                      onClick={() => {
                        deleteBook(book.id)
                        navigate('/studio')
                      }}
                    >
                      Delete
                    </button>
                    <button className="btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button className="flex items-center gap-1.5 text-[13px] text-muted hover:text-wine" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={13} /> Delete draft
                </button>
              )}
            </div>
          )}
        </aside>

        {/* Block editor */}
        <section className="min-w-0">
          {chapter && (
            <>
              <label className="label" htmlFor="chapter-title">Chapter title</label>
              <input
                id="chapter-title"
                value={chapter.title}
                onChange={e => updateChapters(chs => chs.map(c => (c.id === chapter.id ? { ...c, title: e.target.value } : c)))}
                className="w-full border-b border-line bg-transparent pb-2 font-serif text-[28px] font-semibold tracking-[-0.01em] focus:border-forest focus:outline-none"
                placeholder="Chapter title"
              />
              <div className="mt-2 flex flex-wrap items-center gap-4 text-[12px] text-muted">
                <span>{wordCount} words</span>
                <label className="flex items-center gap-1.5">
                  Reading time
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={chapter.minutes}
                    onChange={e => updateChapters(chs => chs.map(c => (c.id === chapter.id ? { ...c, minutes: Math.max(1, Number(e.target.value) || 1) } : c)))}
                    className="field !h-7 !w-16 !px-2 !py-0 text-[12px]"
                  />
                  min
                </label>
                <span>Formatting: **bold**, *italic*</span>
              </div>

              <div className="mt-6 space-y-3">
                {blocks.length === 0 && <p className="rounded-md border border-dashed border-rule px-6 py-10 text-center text-sm text-muted">This chapter is empty. Add a block below.</p>}
                {blocks.map((b, i) => (
                  <BlockEditor
                    key={b.id}
                    block={b}
                    first={i === 0}
                    last={i === blocks.length - 1}
                    onChange={nb => updateBlocks(bl => bl.map(x => (x.id === b.id ? nb : x)))}
                    onMove={d =>
                      updateBlocks(bl => {
                        const next = [...bl]
                        const j = i + d
                        ;[next[i], next[j]] = [next[j], next[i]]
                        return next
                      })
                    }
                    onRemove={() => updateBlocks(bl => bl.filter(x => x.id !== b.id))}
                  />
                ))}
              </div>

              <div className="mt-5 rounded-md border border-line bg-paper p-3">
                <p className="eyebrow mb-2 px-1">Insert</p>
                <RichInsert onInsert={nb => updateBlocks(bl => [...bl, nb])}>
                  {BLOCK_TEMPLATES.map(t => (
                    <button key={t.type} onClick={() => updateBlocks(bl => [...bl, t.make()])} className="btn-secondary btn-sm">
                      {t.icon} {t.label}
                    </button>
                  ))}
                </RichInsert>
              </div>
            </>
          )}
        </section>

        {/* Live page preview */}
        <section className="hidden min-w-0 xl:block">
          <div className="sticky top-24">
            <div className="mb-2 flex items-center justify-between">
              <p className="eyebrow">Page preview</p>
              <span className="text-[11px] text-muted">As students will see it</span>
            </div>
            <div className="scroll-thin max-h-[calc(100vh-8rem)] overflow-y-auto rounded-[3px] border border-line shadow-panel">
              <div className="reader px-8 py-10 font-serif" data-theme="paper" style={{ fontSize: 15 }}>
                <p className="r-muted font-sans text-[10px] font-semibold uppercase tracking-[0.18em]">
                  Chapter {book.chapters.findIndex(c => c.id === chapter?.id) + 1}
                </p>
                <h1 className="mt-2 text-[1.9em] font-semibold leading-tight tracking-[-0.015em]">{chapter?.title || 'Untitled chapter'}</h1>
                <div className="r-border mb-4 mt-5 border-b" />
                {blocks.length ? <ChapterBlocks blocks={blocks.filter(b => !('text' in b) || b.text.trim() || b.type !== 'p')} preview /> : <p className="r-muted italic">Nothing to preview yet.</p>}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function BookDetailsForm({ book, update }: { book: Book; update: (p: Partial<Book>) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-center rounded-md bg-[#EFE9DC] py-6">
        <BookCover book={{ ...book, title: book.title || 'Untitled textbook' }} size="sm" />
      </div>
      <div>
        <label className="label" htmlFor="bk-title">Title</label>
        <input id="bk-title" className="field" value={book.title} onChange={e => update({ title: e.target.value })} />
      </div>
      <div>
        <label className="label" htmlFor="bk-sub">Subtitle</label>
        <input id="bk-sub" className="field" value={book.subtitle ?? ''} onChange={e => update({ subtitle: e.target.value || undefined })} placeholder="Optional" />
      </div>
      <div>
        <label className="label" htmlFor="bk-cat">Subject</label>
        <select id="bk-cat" className="field" value={book.category} onChange={e => update({ category: e.target.value as Category })}>
          {CATEGORIES.map(c => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="bk-desc">Description</label>
        <textarea id="bk-desc" rows={4} className="field resize-y" value={book.description} onChange={e => update({ description: e.target.value })} placeholder="What will students learn from this book?" />
      </div>
      <div>
        <p className="label">Cover colour</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PALETTES) as CoverPalette[]).map(p => (
            <button
              key={p}
              onClick={() => update({ cover: { ...book.cover, palette: p } })}
              title={PALETTES[p].name}
              aria-label={`Cover colour ${PALETTES[p].name}`}
              aria-pressed={book.cover.palette === p}
              className={`h-7 w-7 rounded-full border border-black/10 ${book.cover.palette === p ? 'ring-2 ring-forest ring-offset-2 ring-offset-ivory' : ''}`}
              style={{ background: PALETTES[p].bg }}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="label">Cover ornament</p>
        <div className="grid grid-cols-3 gap-1.5">
          {MOTIFS.map(m => (
            <button
              key={m}
              onClick={() => update({ cover: { ...book.cover, motif: m } })}
              aria-pressed={book.cover.motif === m}
              className={`h-8 rounded-md border text-[12px] capitalize ${book.cover.motif === m ? 'border-forest bg-forest-50 text-forest' : 'border-rule bg-paper text-soft'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------------- Block editor ---------------- */

function BlockEditor({
  block: b,
  first,
  last,
  onChange,
  onMove,
  onRemove,
}: {
  block: Block
  first: boolean
  last: boolean
  onChange: (b: Block) => void
  onMove: (d: -1 | 1) => void
  onRemove: () => void
}) {
  const meta = BLOCK_TEMPLATES.find(t => t.type === b.type) ?? RICH_LABELS[b.type]
  const label = meta?.label ?? (b.type === 'lex' ? 'Lex.uz reference' : b.type === 'figure' ? 'Figure' : b.type === 'list' ? 'List' : b.type)
  const set = (patch: Record<string, unknown>) => onChange({ ...b, ...patch } as Block)

  return (
    <div id={`edit-${b.id}`} className="group scroll-mt-24 rounded-md border border-line bg-paper transition-colors focus-within:border-forest/50">
      <div className="flex items-center justify-between border-b border-line/70 px-3 py-1.5">
        <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
          {meta?.icon ?? (b.type === 'lex' ? <Scale size={13} /> : <FileText size={13} />)} {label}
        </span>
        <span className="flex">
          <button className="icon-btn !h-7 !w-7" disabled={first} onClick={() => onMove(-1)} aria-label="Move up"><ArrowUp size={13} /></button>
          <button className="icon-btn !h-7 !w-7" disabled={last} onClick={() => onMove(1)} aria-label="Move down"><ArrowDown size={13} /></button>
          <button className="icon-btn !h-7 !w-7 hover:!text-wine" onClick={onRemove} aria-label="Delete block"><Trash2 size={13} /></button>
        </span>
      </div>
      <div className="p-3">
        {b.type === 'h2' || b.type === 'h3' ? (
          <input value={b.text} onChange={e => set({ text: e.target.value })} className="w-full bg-transparent font-serif text-[19px] font-semibold focus:outline-none" placeholder="Section heading" />
        ) : b.type === 'p' || b.type === 'note' ? (
          <AutoText value={b.text} onChange={v => set({ text: v })} placeholder={b.type === 'p' ? 'Write a paragraph…' : 'A short note for students…'} />
        ) : b.type === 'quote' ? (
          <>
            <AutoText value={b.text} onChange={v => set({ text: v })} placeholder="Quotation" italic />
            <input value={b.source ?? ''} onChange={e => set({ source: e.target.value })} className="field mt-2 !h-8 !py-1 text-[13px]" placeholder="Source" />
          </>
        ) : b.type === 'quiz' ? (
          <div className="space-y-2">
            <AutoText value={b.question} onChange={v => set({ question: v })} placeholder="Question" />
            {b.options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  onClick={() => set({ correct: i })}
                  aria-label={`Mark option ${i + 1} correct`}
                  aria-pressed={b.correct === i}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] ${b.correct === i ? 'border-forest bg-forest text-paper' : 'border-rule text-muted'}`}
                >
                  {b.correct === i ? <Check size={12} /> : String.fromCharCode(65 + i)}
                </button>
                <input value={o} onChange={e => set({ options: b.options.map((x, j) => (j === i ? e.target.value : x)) })} className="field !h-8 !py-1 text-[13px]" placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                <button
                  className="icon-btn !h-7 !w-7"
                  disabled={b.options.length <= 2}
                  onClick={() => set({ options: b.options.filter((_, j) => j !== i), correct: b.correct === i ? 0 : b.correct > i ? b.correct - 1 : b.correct })}
                  aria-label="Remove option"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {b.options.length < 5 && (
              <button className="text-[12px] text-forest hover:underline" onClick={() => set({ options: [...b.options, ''] })}>+ Add option</button>
            )}
            <AutoText value={b.explanation} onChange={v => set({ explanation: v })} placeholder="Explanation shown after answering" small />
            <p className="text-[11px] text-muted">Click a letter to mark the correct answer.</p>
          </div>
        ) : b.type === 'case' ? (
          <div className="space-y-2">
            <input value={b.title} onChange={e => set({ title: e.target.value })} className="w-full bg-transparent font-serif text-[16px] font-semibold focus:outline-none" placeholder="Case title" />
            <AutoText value={b.facts} onChange={v => set({ facts: v })} placeholder="Facts of the case" />
            <AutoText value={b.question} onChange={v => set({ question: v })} placeholder="Question for students" small />
            <AutoText value={b.analysis} onChange={v => set({ analysis: v })} placeholder="Suggested analysis (revealed on request)" small />
          </div>
        ) : b.type === 'lex' ? (
          <div className="text-[13px]">
            <p className="font-medium">{b.act}, {b.article} — {b.title}</p>
            <p className="mt-1 font-serif text-soft">{b.excerpt}</p>
            {LEX_REFS[b.refId]?.hasNotice && (
              <p className="mt-2 flex items-center gap-1.5 text-[12px] text-wine"><AlertTriangle size={12} /> Has a sample amendment notice — review it on the Studio page.</p>
            )}
          </div>
        ) : b.type === 'list' ? (
          <AutoText value={b.items.join('\n')} onChange={v => set({ items: v.split('\n') })} placeholder="One item per line" />
        ) : isRichBlock(b) ? (
          <RichBlockFields block={b} onChange={onChange} />
        ) : b.type === 'figure' ? (
          <p className="text-[13px] text-muted">{b.caption} (figures are edited by the design team)</p>
        ) : null}
      </div>
    </div>
  )
}

function AutoText({ value, onChange, placeholder, italic, small }: { value: string; onChange: (v: string) => void; placeholder: string; italic?: boolean; small?: boolean }) {
  return (
    <textarea
      value={value}
      onChange={e => {
        onChange(e.target.value)
        e.target.style.height = 'auto'
        e.target.style.height = e.target.scrollHeight + 'px'
      }}
      ref={el => {
        if (el) {
          el.style.height = 'auto'
          el.style.height = el.scrollHeight + 'px'
        }
      }}
      rows={small ? 1 : 2}
      placeholder={placeholder}
      className={`block w-full resize-none bg-transparent font-serif leading-relaxed placeholder:text-muted/60 focus:outline-none ${small ? 'text-[14px]' : 'text-[16px]'} ${italic ? 'italic' : ''}`}
    />
  )
}
