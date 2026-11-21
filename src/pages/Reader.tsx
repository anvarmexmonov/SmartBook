import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  BookX,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  HelpCircle,
  Lightbulb,
  PanelLeft,
  Send,
  Sparkles,
  Type,
  X,
} from 'lucide-react'
import ChapterBlocks, { RichText } from '../components/ChapterBlocks'
import { Logo } from '../components/Header'
import { useBookTransition } from '../components/BookTransition'
import { useStore, type ReaderTheme } from '../store/AppStore'
import { SUGGESTED_QUESTIONS, tutorRespond, type TutorAnswer, type TutorMode } from '../data/tutor'
import type { Block } from '../data/types'

const FONT_SIZES = [16, 18, 20, 22]
const THEMES: { id: ReaderTheme; label: string; bg: string; fg: string }[] = [
  { id: 'paper', label: 'Paper', bg: '#FCFAF5', fg: '#22201C' },
  { id: 'sepia', label: 'Sepia', bg: '#F4EAD7', fg: '#3A2E21' },
  { id: 'night', label: 'Night', bg: '#1B1C1E', fg: '#DCD6CA' },
]

interface TutorMessage {
  id: number
  mode: TutorMode
  quote?: string
  question?: string
  answer?: TutorAnswer
}

export default function Reader() {
  const { bookId = '', chapterId } = useParams()
  const [params] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const store = useStore()
  const { reader, setReader, bookmarks, toggleBookmark, progress, openChapter, completeChapter } = store
  const book = store.getBook(bookId)
  // `studioPreview`: opened from the Studio editor. Professors always read in preview mode:
  // nothing is recorded to a personal shelf and the AI Tutor (a student tool) is hidden.
  const studioPreview = params.get('preview') === '1'
  const preview = studioPreview || store.role === 'professor'
  const tutorAvailable = store.role === 'student'

  const chapterIndex = Math.max(0, book?.chapters.findIndex(c => c.id === chapterId) ?? 0)
  const chapter = book?.chapters[chapterIndex]

  const [navOpen, setNavOpen] = useState(() => window.innerWidth >= 1024)
  const [tutorOpen, setTutorOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [scrollPct, setScrollPct] = useState(0)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [selection, setSelection] = useState<{ text: string; context: string; x: number; y: number } | null>(null)
  const [messages, setMessages] = useState<TutorMessage[]>([])
  const [thinking, setThinking] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const articleRef = useRef<HTMLElement>(null)
  const msgId = useRef(0)
  const { closeBook } = useBookTransition()
  const [turn, setTurn] = useState<'next' | 'prev' | null>(null)
  const lastIndex = useRef<number | null>(null)

  // direction of the page turn when moving between chapters
  useLayoutEffect(() => {
    if (!chapter) return
    if (lastIndex.current !== null && lastIndex.current !== chapterIndex) setTurn(chapterIndex > lastIndex.current ? 'next' : 'prev')
    lastIndex.current = chapterIndex
  }, [chapter?.id])

  // ← / → turn chapters, unless the student is typing
  useEffect(() => {
    if (!book) return
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return
      if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return
      const target = e.key === 'ArrowRight' ? book.chapters[chapterIndex + 1] : e.key === 'ArrowLeft' ? book.chapters[chapterIndex - 1] : undefined
      if (!target) return
      e.preventDefault()
      navigate(`/read/${book.id}/${target.id}${studioPreview ? '?preview=1' : ''}`, { replace: true })
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [book, chapterIndex, studioPreview])

  // redirect /read/:book to its last or first chapter
  useEffect(() => {
    if (book && (!chapterId || !book.chapters.some(c => c.id === chapterId))) {
      const target = progress[book.id]?.last ?? book.chapters.find(c => c.blocks)?.id ?? book.chapters[0]?.id
      if (target) navigate(`/read/${book.id}/${target}${location.search}`, { replace: true })
    }
  }, [book, chapterId])

  useEffect(() => {
    if (book && chapter && !preview) openChapter(book.id, chapter.id)
    setActiveSection(null)
    setSelection(null)
  }, [book?.id, chapter?.id])

  // scroll to top or to hash anchor when chapter changes
  useLayoutEffect(() => {
    const hash = location.hash.slice(1)
    if (hash) {
      requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ block: 'start' }))
    } else window.scrollTo(0, 0)
  }, [chapter?.id, location.hash])

  // reading progress
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const pct = max <= 0 ? 1 : window.scrollY / max
      setScrollPct(Math.min(1, Math.max(0, pct)))
      setSelection(null)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [chapter?.id])

  useEffect(() => {
    if (book && chapter?.blocks && !preview && scrollPct > 0.97) completeChapter(book.id, chapter.id)
  }, [scrollPct > 0.97])

  // active section tracking
  useEffect(() => {
    const heads = Array.from(document.querySelectorAll<HTMLElement>('[data-section]'))
    if (!heads.length) return
    const obs = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveSection(visible[0].target.id)
      },
      { rootMargin: '-80px 0px -65% 0px' },
    )
    heads.forEach(h => obs.observe(h))
    return () => obs.disconnect()
  }, [chapter?.id, reader.fontStep])

  // text selection → floating toolbar
  useEffect(() => {
    const onUp = () => {
      setTimeout(() => {
        const sel = window.getSelection()
        const text = sel?.toString().trim() ?? ''
        if (!sel || text.length < 3 || !articleRef.current || !sel.rangeCount) return
        const range = sel.getRangeAt(0)
        if (!articleRef.current.contains(range.commonAncestorContainer)) return
        const rect = range.getBoundingClientRect()
        const blockEl = (range.startContainer.parentElement as HTMLElement | null)?.closest('[data-block-id]')
        setSelection({
          text: text.slice(0, 600),
          context: blockEl?.textContent ?? text,
          x: rect.left + rect.width / 2,
          y: rect.top,
        })
      }, 10)
    }
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-selection-toolbar]')) setSelection(null)
    }
    document.addEventListener('mouseup', onUp)
    document.addEventListener('touchend', onUp)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('touchend', onUp)
      document.removeEventListener('mousedown', onDown)
    }
  }, [])

  const flash = (t: string) => {
    setToast(t)
    window.setTimeout(() => setToast(null), 2200)
  }

  const ask = useCallback(
    (mode: TutorMode, opts: { quote?: string; question?: string; context?: string }) => {
      if (!chapter) return
      setTutorOpen(true)
      setSelection(null)
      window.getSelection()?.removeAllRanges()
      const id = ++msgId.current
      setMessages(m => [...m, { id, mode, quote: opts.quote, question: opts.question }])
      setThinking(true)
      const input = mode === 'ask' ? `${opts.question ?? ''} ${opts.quote ?? ''}` : mode === 'explain' ? `${opts.quote} ${opts.context ?? ''}` : opts.quote ?? ''
      window.setTimeout(() => {
        setMessages(m => m.map(x => (x.id === id ? { ...x, answer: tutorRespond(mode, input, chapter.title) } : x)))
        setThinking(false)
      }, 700 + Math.random() * 500)
    },
    [chapter],
  )

  if (!book) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ivory px-6 text-center">
        <p className="eyebrow">Not found</p>
        <h1 className="mt-3 font-serif text-3xl font-semibold">This book is not available</h1>
        <Link to="/" className="btn-primary mt-6">Back to the Library</Link>
      </div>
    )
  }
  if (!chapter) return null

  const bookmarked = (bookmarks[book.id] ?? []).includes(chapter.id)
  const done = progress[book.id]?.done ?? []
  const sections = (chapter.blocks ?? []).filter((b): b is Extract<Block, { type: 'h2' }> => b.type === 'h2')
  const prev = book.chapters[chapterIndex - 1]
  const next = book.chapters[chapterIndex + 1]
  const q = studioPreview ? '?preview=1' : ''
  // replace, not push: Back always leaves the book (with the closing animation) instead of stepping through chapters
  const goChapter = (id: string) => navigate(`/read/${book.id}/${id}${q}`, { replace: true })
  const exit = () => (studioPreview ? navigate(`/studio/${book.id}`) : closeBook(book.id, chapter.id))
  const isDone = done.includes(chapter.id)

  return (
    <div className="reader min-h-screen font-serif" data-theme={reader.theme}>
      {/* Top bar */}
      <header className="r-bg r-border sticky top-0 z-40 border-b font-sans">
        {preview && (
          <div className="flex items-center justify-center gap-3 bg-ochre-100 px-4 py-1.5 text-[12px] text-[#5b4214]">
            {studioPreview ? (
              <>
                Student preview{book.status === 'draft' ? ' of an unpublished draft' : ''} — exercises are not recorded.
                <Link to={`/studio/${book.id}`} className="font-semibold underline">Back to Studio</Link>
              </>
            ) : (
              <>Professor preview — you see this book as students do. Progress and answers are not recorded.</>
            )}
          </div>
        )}
        <div className="flex h-14 items-center gap-1 px-2 sm:px-4">
          <button className="icon-btn !text-[color:var(--r-soft)]" onClick={exit} aria-label={studioPreview ? 'Back to Studio' : 'Close book'}>
            <ArrowLeft size={18} />
          </button>
          <Link to={store.role === 'professor' ? '/studio' : '/'} className="mr-2 hidden sm:block" aria-label="SmartBook home">
            <Logo compact />
          </Link>
          <button className="icon-btn !text-[color:var(--r-soft)]" onClick={() => setNavOpen(o => !o)} aria-label="Toggle contents" aria-pressed={navOpen}>
            <PanelLeft size={18} />
          </button>
          <div className="mx-2 min-w-0 flex-1">
            <p className="truncate font-serif text-[15px] font-semibold leading-tight">{book.title}</p>
            <p className="r-muted truncate text-[12px] leading-tight">
              Chapter {chapterIndex + 1} · {chapter.title}
            </p>
          </div>
          <button
            className="icon-btn !text-[color:var(--r-soft)]"
            onClick={() => {
              toggleBookmark(book.id, chapter.id)
              flash(bookmarked ? 'Bookmark removed' : 'Chapter bookmarked')
            }}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark chapter'}
            aria-pressed={bookmarked}
          >
            {bookmarked ? <BookmarkCheck size={18} className="r-wine" fill="currentColor" fillOpacity={0.15} /> : <Bookmark size={18} />}
          </button>
          <div className="relative">
            <button className="icon-btn !text-[color:var(--r-soft)]" onClick={() => setSettingsOpen(o => !o)} aria-label="Reading settings" aria-expanded={settingsOpen}>
              <Type size={18} />
            </button>
            {settingsOpen && (
              <>
                <button className="fixed inset-0 z-0 cursor-default" aria-label="Close settings" onClick={() => setSettingsOpen(false)} />
                <div className="r-bg r-border absolute right-0 top-11 z-10 w-72 animate-fadeUp rounded-md border p-4 shadow-panel">
                  <p className="r-muted text-[11px] font-semibold uppercase tracking-[0.14em]">Text size</p>
                  <div className="r-border mt-2 flex items-center rounded-md border">
                    <button className="r-hover h-9 flex-1 text-[13px] disabled:opacity-30" disabled={reader.fontStep === 0} onClick={() => setReader({ fontStep: reader.fontStep - 1 })} aria-label="Smaller text">
                      A−
                    </button>
                    <span className="r-border flex h-9 flex-[1.4] items-center justify-center gap-1 border-x">
                      {FONT_SIZES.map((_, i) => (
                        <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: i <= reader.fontStep ? 'var(--r-accent)' : 'var(--r-line)' }} />
                      ))}
                    </span>
                    <button className="r-hover h-9 flex-1 text-[17px] disabled:opacity-30" disabled={reader.fontStep === FONT_SIZES.length - 1} onClick={() => setReader({ fontStep: reader.fontStep + 1 })} aria-label="Larger text">
                      A+
                    </button>
                  </div>
                  <p className="r-muted mt-4 text-[11px] font-semibold uppercase tracking-[0.14em]">Theme</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {THEMES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setReader({ theme: t.id })}
                        className="flex h-14 flex-col items-center justify-center rounded-md border text-[12px]"
                        style={{ background: t.bg, color: t.fg, borderColor: reader.theme === t.id ? 'var(--r-accent)' : 'var(--r-line)', boxShadow: reader.theme === t.id ? '0 0 0 1px var(--r-accent)' : undefined }}
                        aria-pressed={reader.theme === t.id}
                      >
                        <span className="font-serif text-[16px]">Aa</span>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <p className="r-muted mt-4 text-[11px] font-semibold uppercase tracking-[0.14em]">Typeface</p>
                  <div className="r-border mt-2 grid grid-cols-2 overflow-hidden rounded-md border text-[13px]">
                    {(['serif', 'sans'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setReader({ family: f })}
                        className={`h-9 ${f === 'serif' ? 'font-serif' : 'font-sans'}`}
                        style={{ background: reader.family === f ? 'var(--r-accent-soft)' : undefined, color: reader.family === f ? 'var(--r-accent)' : undefined }}
                        aria-pressed={reader.family === f}
                      >
                        {f === 'serif' ? 'Serif' : 'Sans-serif'}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <button
            onClick={exit}
            className="r-soft r-hover ml-1 inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium sm:px-2.5"
            aria-label={studioPreview ? 'Exit preview' : 'Close book'}
          >
            <BookX size={16} /> <span className="hidden sm:inline">{studioPreview ? 'Exit preview' : 'Close book'}</span>
          </button>
          {tutorAvailable && (
          <button
            onClick={() => setTutorOpen(o => !o)}
            className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-[13px] font-medium transition-colors"
            style={{
              borderColor: tutorOpen ? 'var(--r-accent)' : 'var(--r-line)',
              background: tutorOpen ? 'var(--r-accent-soft)' : 'transparent',
              color: tutorOpen ? 'var(--r-accent)' : 'var(--r-soft)',
            }}
            aria-pressed={tutorOpen}
          >
            <Sparkles size={15} /> <span className="hidden sm:inline">AI Tutor</span>
          </button>
          )}
        </div>
      </header>

      <div className="flex">
        {/* Contents */}
        {navOpen && (
          <>
            <button className="fixed inset-0 z-20 bg-black/25 lg:hidden" aria-label="Close contents" onClick={() => setNavOpen(false)} />
            <nav
              className="r-bg r-border scroll-thin fixed bottom-12 left-0 top-14 z-30 w-[290px] animate-fadeIn overflow-y-auto border-r px-3 py-6 font-sans lg:sticky lg:z-0 lg:h-[calc(100vh-3.5rem-3rem)] lg:shrink-0"
              aria-label="Chapters"
            >
              <p className="r-muted px-3 text-[11px] font-semibold uppercase tracking-[0.14em]">Contents</p>
              <ol className="mt-3 space-y-0.5">
                {book.chapters.map((c, i) => {
                  const active = c.id === chapter.id
                  const isBm = (bookmarks[book.id] ?? []).includes(c.id)
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => {
                          goChapter(c.id)
                          if (window.innerWidth < 1024) setNavOpen(false)
                        }}
                        className={`r-hover flex w-full items-start gap-2.5 rounded-md px-3 py-2 text-left text-[13.5px] leading-snug ${active ? '' : 'r-soft'}`}
                        style={active ? { background: 'var(--r-accent-soft)', color: 'var(--r-text)' } : undefined}
                        aria-current={active ? 'page' : undefined}
                      >
                        <span className="r-muted w-4 shrink-0 tabular-nums">{i + 1}</span>
                        <span className={`flex-1 ${active ? 'font-medium' : ''}`}>
                          {c.title}
                          {!c.blocks && <span className="r-muted block text-[11px]">Not in demo edition</span>}
                        </span>
                        {isBm && <Bookmark size={12} className="r-wine mt-0.5 shrink-0" fill="currentColor" />}
                        {done.includes(c.id) && <Check size={13} className="r-accent mt-0.5 shrink-0" aria-label="Completed" />}
                      </button>
                      {active && sections.length > 0 && (
                        <ul className="r-border mb-2 ml-[22px] mt-1 border-l">
                          {sections.map(s => (
                            <li key={s.id}>
                              <a
                                href={`#${s.id}`}
                                onClick={e => {
                                  e.preventDefault()
                                  document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' })
                                  if (window.innerWidth < 1024) setNavOpen(false)
                                }}
                                className={`-ml-px block border-l-2 py-1.5 pl-3 pr-2 text-[12.5px] leading-snug transition-colors ${activeSection === s.id ? 'r-text' : 'r-muted border-transparent hover:text-[color:var(--r-text)]'}`}
                                style={activeSection === s.id ? { borderColor: 'var(--r-accent)' } : undefined}
                              >
                                {s.text}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                })}
              </ol>
              <p className="r-muted mt-8 px-3 text-[11px] leading-relaxed">
                {book.author} · {book.edition ?? book.year}
                <br />
                Fictional demo textbook.
              </p>
            </nav>
          </>
        )}

        {/* Page */}
        <main className="min-w-0 flex-1 px-5 pb-32 pt-12 sm:px-8 md:pt-16">
          {turn && <div key={`sweep-${chapter.id}`} aria-hidden className={`page-sweep page-sweep-${turn}`} />}
          <article
            key={chapter.id}
            ref={articleRef}
            className={`mx-auto max-w-[40rem] ${reader.family === 'sans' ? 'font-sans' : 'font-serif'} ${turn ? `page-turn-${turn}` : ''}`}
            style={{ fontSize: FONT_SIZES[reader.fontStep] }}
          >
            <header className="r-border mb-10 border-b pb-8 font-sans">
              <p className="r-muted text-[12px] font-semibold uppercase tracking-[0.18em]">Chapter {chapterIndex + 1}</p>
              <h1 className="mt-3 font-serif text-[2.1em] font-semibold leading-[1.08] tracking-[-0.02em]" style={{ textWrap: 'balance' } as React.CSSProperties}>
                {chapter.title}
              </h1>
              <p className="r-muted mt-4 text-[13px]">
                {chapter.minutes} min read
                {sections.length > 0 && ` · ${sections.length} sections`}
                {isDone && (
                  <span className="r-accent ml-2 inline-flex items-center gap-1">
                    <Check size={13} /> Completed
                  </span>
                )}
              </p>
              {chapter.blocks && !preview && (
                <p className="r-muted mt-5 flex items-center gap-2 text-[12px]">
                  <Lightbulb size={13} /> Select any passage to ask the tutor to explain or summarise it.
                </p>
              )}
            </header>

            {chapter.blocks && chapter.blocks.length > 0 ? (
              <>
                <ChapterBlocks blocks={chapter.blocks} preview={preview} />
                <footer className="r-border mt-16 border-t pt-8 font-sans">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    {isDone ? (
                      <p className="r-accent flex items-center gap-2 text-[14px] font-medium">
                        <Check size={16} /> You have finished this chapter.
                      </p>
                    ) : (
                      <button
                        onClick={() => !preview && completeChapter(book.id, chapter.id)}
                        disabled={preview}
                        className="r-border inline-flex h-10 items-center gap-2 rounded-md border px-4 text-[14px] disabled:opacity-40"
                      >
                        <Check size={16} /> Mark chapter as read
                      </button>
                    )}
                    {next && (
                      <button
                        onClick={() => goChapter(next.id)}
                        className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-[14px] font-medium"
                        style={{ background: 'var(--r-accent)', color: 'var(--r-bg)' }}
                      >
                        Next: {next.title} <ChevronRight size={16} />
                      </button>
                    )}
                  </div>
                </footer>
              </>
            ) : (
              <div className="r-border rounded-md border border-dashed px-6 py-14 text-center font-sans">
                <FileText size={28} className="r-muted mx-auto" strokeWidth={1.4} />
                <p className="mt-4 font-serif text-[1.15em]">This chapter is not included in the demo edition.</p>
                <p className="r-muted mx-auto mt-2 max-w-sm text-[14px]">
                  {book.chapters.some(c => c.blocks?.length)
                    ? 'Only selected chapters of each book have been typeset for the prototype.'
                    : 'The author has not added content to this chapter yet.'}
                </p>
                {book.chapters.find(c => c.blocks?.length && c.id !== chapter.id) && (
                  <button
                    onClick={() => goChapter(book.chapters.find(c => c.blocks?.length && c.id !== chapter.id)!.id)}
                    className="r-accent mt-6 text-[14px] font-medium hover:underline"
                  >
                    Read “{book.chapters.find(c => c.blocks?.length && c.id !== chapter.id)!.title}” instead →
                  </button>
                )}
              </div>
            )}
          </article>
        </main>

        {/* AI Tutor */}
        {tutorAvailable && tutorOpen && (
          <TutorPanel
            messages={messages}
            thinking={thinking}
            chapterTitle={chapter.title}
            hasContent={Boolean(chapter.blocks?.length)}
            onClose={() => setTutorOpen(false)}
            onAsk={question => ask('ask', { question })}
            onClear={() => setMessages([])}
          />
        )}
      </div>

      {/* Selection toolbar */}
      {tutorAvailable && selection && (
        <div
          data-selection-toolbar
          className="fixed z-50 flex -translate-x-1/2 -translate-y-full animate-fadeIn items-center gap-0.5 rounded-md bg-[#1F1D1A] p-1 font-sans text-[13px] text-[#F3EEE4] shadow-xl"
          style={{ left: Math.min(Math.max(selection.x, 150), window.innerWidth - 150), top: Math.max(selection.y - 10, 70) }}
        >
          <ToolbarBtn icon={<Lightbulb size={14} />} label="Explain" onClick={() => ask('explain', { quote: selection.text, context: selection.context })} />
          <ToolbarBtn icon={<FileText size={14} />} label="Summarize" onClick={() => ask('summarize', { quote: selection.text.length > 120 ? selection.text : selection.context })} />
          <ToolbarBtn icon={<HelpCircle size={14} />} label="Ask AI" onClick={() => ask('ask', { quote: selection.text, question: `What does this mean: “${selection.text.slice(0, 80)}${selection.text.length > 80 ? '…' : ''}”?` })} />
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-16 left-1/2 z-50 -translate-x-1/2 animate-fadeUp rounded-md bg-[#1F1D1A] px-4 py-2 font-sans text-[13px] text-[#F3EEE4] shadow-lg" role="status">
          {toast}
        </div>
      )}

      {/* Bottom progress */}
      <footer className="r-bg r-border fixed inset-x-0 bottom-0 z-40 h-12 border-t font-sans">
        <div className="absolute inset-x-0 top-[-1px] h-[2px]">
          <div className="h-full transition-[width] duration-150" style={{ width: `${scrollPct * 100}%`, background: 'var(--r-accent)' }} />
        </div>
        <div className="flex h-full items-center justify-between gap-2 px-2 sm:px-4">
          <button
            disabled={!prev}
            onClick={() => prev && goChapter(prev.id)}
            className="r-soft r-hover inline-flex h-9 min-w-0 items-center gap-1 rounded-md px-2 text-[13px] disabled:opacity-30"
          >
            <ChevronLeft size={16} className="shrink-0" /> <span className="hidden truncate sm:inline">{prev ? prev.title : 'Previous'}</span>
          </button>
          <span className="r-muted shrink-0 text-[12px] tabular-nums">
            Chapter {chapterIndex + 1} of {book.chapters.length} · {Math.round(scrollPct * 100)}%
          </span>
          <button
            disabled={!next}
            onClick={() => next && goChapter(next.id)}
            className="r-soft r-hover inline-flex h-9 min-w-0 items-center gap-1 rounded-md px-2 text-[13px] disabled:opacity-30"
          >
            <span className="hidden truncate sm:inline">{next ? next.title : 'Next'}</span> <ChevronRight size={16} className="shrink-0" />
          </button>
        </div>
      </footer>
    </div>
  )
}

function ToolbarBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onMouseDown={e => e.preventDefault()} onClick={onClick} className="flex h-8 items-center gap-1.5 rounded-[4px] px-2.5 hover:bg-white/10">
      {icon}
      {label}
    </button>
  )
}

/* ---------------- Tutor panel ---------------- */

function TutorPanel({
  messages,
  thinking,
  chapterTitle,
  hasContent,
  onClose,
  onAsk,
  onClear,
}: {
  messages: TutorMessage[]
  thinking: boolean
  chapterTitle: string
  hasContent: boolean
  onClose: () => void
  onAsk: (q: string) => void
  onClear: () => void
}) {
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [messages, thinking])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || thinking) return
    onAsk(input.trim())
    setInput('')
  }

  return (
    <aside
      className="r-bg r-border fixed inset-x-0 bottom-12 z-30 flex h-[70vh] animate-fadeUp flex-col border-t font-sans shadow-2xl lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem-3rem)] lg:w-[360px] lg:shrink-0 lg:animate-slideIn lg:border-l lg:border-t-0 lg:shadow-none"
      aria-label="AI Tutor"
    >
      <div className="r-border flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="flex items-center gap-1.5 text-[14px] font-semibold">
            <Sparkles size={15} className="r-accent" /> AI Tutor
          </p>
          <p className="r-muted text-[11px]">Simulated · pre-written answers for this chapter</p>
        </div>
        <div className="flex items-center">
          {messages.length > 0 && (
            <button onClick={onClear} className="r-muted r-hover rounded-md px-2 py-1 text-[12px]">
              Clear
            </button>
          )}
          <button className="icon-btn !text-[color:var(--r-soft)]" onClick={onClose} aria-label="Close tutor">
            <X size={17} />
          </button>
        </div>
      </div>

      <div className="scroll-thin flex-1 space-y-5 overflow-y-auto px-4 py-5">
        {messages.length === 0 && (
          <div className="animate-fadeIn">
            <p className="font-serif text-[16px] leading-snug">
              {hasContent ? `Questions about “${chapterTitle}”?` : 'This chapter has no demo content yet.'}
            </p>
            <p className="r-muted mt-2 text-[13px] leading-relaxed">
              Select a passage in the text and choose <em>Explain</em>, <em>Summarize</em> or <em>Ask AI</em> — or start with one of these:
            </p>
            <div className="mt-4 space-y-2">
              {SUGGESTED_QUESTIONS.map(q => (
                <button key={q} onClick={() => onAsk(q)} className="r-border r-hover block w-full rounded-md border px-3 py-2.5 text-left text-[13px] leading-snug">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(m => (
          <div key={m.id} className="animate-fadeUp space-y-3">
            <div className="ml-6 rounded-md px-3 py-2.5 text-[13px] leading-snug" style={{ background: 'var(--r-panel)' }}>
              <p className="r-muted mb-1 text-[10.5px] font-semibold uppercase tracking-[0.12em]">
                {m.mode === 'explain' ? 'Explain' : m.mode === 'summarize' ? 'Summarize' : 'Question'}
              </p>
              {m.quote && m.mode !== 'ask' ? <p className="font-serif italic">“{m.quote.length > 220 ? m.quote.slice(0, 220) + '…' : m.quote}”</p> : <p>{m.question}</p>}
            </div>
            {m.answer ? (
              <div className="text-[13.5px] leading-[1.65]">
                <p className="r-accent mb-1.5 text-[12px] font-semibold">{m.answer.title}</p>
                {m.answer.paragraphs.map((p, i) => (
                  <p key={i} className={i ? 'mt-2' : ''}>
                    <RichText text={p} />
                  </p>
                ))}
                {m.answer.example && (
                  <div className="mt-3 border-l-2 pl-3" style={{ borderColor: 'var(--r-wine)' }}>
                    <p className="r-wine text-[11px] font-semibold uppercase tracking-[0.12em]">Example</p>
                    <p className="r-soft mt-0.5 font-serif">{m.answer.example}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 py-1" aria-label="Tutor is preparing an answer">
                {[0, 1, 2].map(i => (
                  <span key={i} className="h-1.5 w-1.5 animate-pulseDot rounded-full" style={{ background: 'var(--r-muted)', animationDelay: `${i * 0.18}s` }} />
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="r-border border-t p-3">
        <div className="r-border flex items-center rounded-md border focus-within:border-[color:var(--r-accent)]">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about this chapter…"
            className="h-10 min-w-0 flex-1 bg-transparent px-3 text-[13px] placeholder:text-[color:var(--r-muted)] focus:outline-none"
          />
          <button type="submit" disabled={!input.trim() || thinking} className="icon-btn !text-[color:var(--r-accent)]" aria-label="Send question">
            <Send size={15} />
          </button>
        </div>
        <p className="r-muted mt-2 text-[10.5px] leading-snug">No AI model is connected in this prototype. Answers are prepared explanations matched to the chapter.</p>
      </form>
    </aside>
  )
}
