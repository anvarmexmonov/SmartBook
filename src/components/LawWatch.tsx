import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Check, ChevronDown, CircleDot, Eye, Loader2, RefreshCw, Scale, X } from 'lucide-react'
import { authedApi, ApiError } from '../store/Auth'
import { useStore } from '../store/AppStore'
import type { Block, Book } from '../data/types'

/* Mirrors the FastAPI responses in backend/main.py (/api/law-watch). */
interface Ref {
  id: string
  book_id: string
  block_id: string
  act_title: string
  act_url: string
  cited_article: number
  topic: string
  status: 'unchecked' | 'current' | 'attention' | 'repealed'
  checked_at: number | null
}
interface Proposal {
  id: number
  ref_id: string
  book_id: string
  block_id: string
  act_title: string
  act_url: string
  topic: string
  kind: 'renumber' | 'amended' | 'repealed' | 'missing'
  summary: string
  cited_article: number
  cited_title: string | null
  found_article: number | null
  found_title: string | null
  new_text: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: number
  decided_by: string | null
  decided_at: number | null
}
interface Step {
  t: number
  kind: 'info' | 'ok' | 'warn' | 'error' | 'done'
  text: string
}
interface State {
  refs: Ref[]
  proposals: Proposal[]
  last_run: { started_at: number; finished_at: number | null; checked: number; issues: number; error: string | null; steps: Step[] } | null
}
interface Update {
  book_id: string
  block_id: string
  kind: Proposal['kind']
  article: number | null
  official_title: string | null
  official_text: string | null
  source_url: string
  approved_by: string
  approved_at: number
}

const KIND_LABEL: Record<Proposal['kind'], string> = {
  renumber: 'Article number changed',
  amended: 'Wording changed',
  repealed: 'No longer in force',
  missing: 'Article not found',
}

const when = (ts: number) =>
  new Date(ts * 1000).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Applies an approved proposal to the matching Lex.uz block of the book. */
function applyUpdate(book: Book, u: Update): Book {
  const patch = (b: Block): Block => {
    if (b.id !== u.block_id || b.type !== 'lex') return b
    return {
      ...b,
      article: u.article ? `Art. ${u.article}` : b.article,
      official:
        u.official_text && u.official_title
          ? { title: u.official_title, text: u.official_text, sourceUrl: u.source_url, approvedBy: u.approved_by, approvedAt: u.approved_at }
          : b.official,
    }
  }
  return { ...book, chapters: book.chapters.map(c => (c.blocks ? { ...c, blocks: c.blocks.map(patch) } : c)) }
}

export default function LawWatch() {
  const { getBook, saveBook } = useStore()
  const [state, setState] = useState<State | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [showSteps, setShowSteps] = useState(false)

  const fail = (e: unknown) => setError(e instanceof ApiError ? e.message : 'Something went wrong.')

  useEffect(() => {
    authedApi<State>('/law-watch').then(setState, fail)
  }, [])

  const run = async () => {
    setRunning(true)
    setError(null)
    try {
      const s = await authedApi<State>('/law-watch/run', { method: 'POST' })
      setState(s)
      setShowSteps(true)
    } catch (e) {
      fail(e)
    } finally {
      setRunning(false)
    }
  }

  const decide = useCallback(
    async (p: Proposal, decision: 'approve' | 'reject') => {
      setBusyId(p.id)
      setError(null)
      try {
        const res = await authedApi<State & { update?: Update }>(`/law-watch/proposals/${p.id}/${decision}`, { method: 'POST' })
        if (res.update) {
          const book = getBook(res.update.book_id)
          if (book) saveBook(applyUpdate(book, res.update))
        }
        setState(res)
      } catch (e) {
        fail(e)
      } finally {
        setBusyId(null)
      }
    },
    [getBook, saveBook],
  )

  const pending = state?.proposals.filter(p => p.status === 'pending') ?? []
  const decided = state?.proposals.filter(p => p.status !== 'pending').slice(0, 3) ?? []
  const run_ = state?.last_run

  return (
    <aside className="self-start rounded-md border border-line bg-paper">
      <div className="border-b border-line px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-serif text-lg font-semibold">
            <Scale size={17} className="text-forest" /> Law Watch
          </p>
          <span className="rounded-sm bg-forest-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-forest">Agent</span>
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">
          Reads the live Lex.uz text of every article your books cite and checks that the number, topic and wording still match. Nothing in a book changes until you approve it.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <button className="btn-primary btn-sm" onClick={run} disabled={running || !state}>
            {running ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {running ? 'Checking Lex.uz…' : 'Run check now'}
          </button>
          {run_?.finished_at && (
            <span className="text-[11.5px] leading-tight text-muted">
              Last run {when(run_.finished_at)}
              <br />
              {run_.checked} checked · {run_.issues ? <span className="text-wine">{run_.issues} need attention</span> : 'all up to date'}
            </span>
          )}
        </div>
      </div>

      {error && (
        <p className="flex items-start gap-2 border-b border-line bg-wine-50 px-5 py-3 text-[12.5px] text-wine">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}
      {!state && !error && (
        <p className="flex items-center gap-2 px-5 py-6 text-[13px] text-muted">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </p>
      )}

      {/* agent log */}
      {run_ && run_.steps.length > 0 && (
        <div className="border-b border-line px-5 py-3">
          <button onClick={() => setShowSteps(s => !s)} className="flex w-full items-center justify-between text-[12px] font-medium text-soft hover:text-ink" aria-expanded={showSteps}>
            What the agent did
            <ChevronDown size={14} className={`transition-transform ${showSteps ? 'rotate-180' : ''}`} />
          </button>
          {showSteps && (
            <ol className="mt-2 space-y-1.5 border-l border-line pl-3">
              {run_.steps.map((s, i) => (
                <li key={i} className="relative animate-fadeIn text-[11.5px] leading-snug" style={{ animationDelay: `${i * 60}ms` }}>
                  <span className="absolute -left-[17px] top-[3px] rounded-full bg-paper">
                    {s.kind === 'ok' ? (
                      <Check size={9} className="text-forest" />
                    ) : s.kind === 'warn' || s.kind === 'error' ? (
                      <AlertTriangle size={9} className="text-wine" />
                    ) : (
                      <CircleDot size={9} className="text-muted" />
                    )}
                  </span>
                  <span className={s.kind === 'warn' || s.kind === 'error' ? 'text-wine' : s.kind === 'done' ? 'font-medium text-ink' : 'text-soft'}>{s.text}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* proposals awaiting the professor */}
      {pending.map(p => (
        <div key={p.id} className="animate-fadeUp border-b border-line px-5 py-5">
          <span className="demo-tag !border-solid !border-wine/40 !text-wine">{KIND_LABEL[p.kind]}</span>
          <p className="mt-2 text-[13px] leading-relaxed text-soft">{p.summary}</p>
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 text-[12px]">
            <div className="rounded-sm border border-line bg-ivory/60 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Your book cites</p>
              <p className="mt-1 font-medium">Art. {p.cited_article}</p>
              {p.cited_title && <p className="text-muted">On Lex.uz now: {p.cited_title}</p>}
            </div>
            <ArrowRight size={14} className="self-center text-muted" />
            <div className="rounded-sm border border-forest/25 bg-forest-50 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-forest">Lex.uz today</p>
              <p className="mt-1 font-medium">{p.found_article ? `Art. ${p.found_article}` : '—'}</p>
              {p.found_title && <p className="text-forest/80">{p.found_title}</p>}
            </div>
          </div>
          {p.new_text && (
            <details className="mt-3 rounded-sm border border-line bg-ivory/40 px-3 py-2 text-[12.5px]">
              <summary className="cursor-pointer text-soft">Official text (Russian, from Lex.uz)</summary>
              <p className="mt-2 whitespace-pre-line font-serif leading-relaxed">{p.new_text}</p>
            </details>
          )}
          <p className="mt-3 text-[11px] text-muted">
            Found {when(p.created_at)} ·{' '}
            <a href={p.act_url} target="_blank" rel="noreferrer" className="underline hover:text-ink">
              source
            </a>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-primary btn-sm" disabled={busyId === p.id} onClick={() => decide(p, 'approve')}>
              {busyId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve &amp; update book
            </button>
            <button className="btn-secondary btn-sm" disabled={busyId === p.id} onClick={() => decide(p, 'reject')}>
              <X size={14} /> Reject
            </button>
            <Link
              to={`/read/${p.book_id}/${getBook(p.book_id)?.chapters.find(c => c.blocks?.some(bl => bl.id === p.block_id))?.id ?? ''}?preview=1#${p.block_id}`}
              className="btn-ghost btn-sm"
            >
              <Eye size={14} /> View in chapter
            </Link>
          </div>
        </div>
      ))}

      {state && pending.length === 0 && (
        <p className="border-b border-line px-5 py-4 text-[13px] text-muted">
          {state.refs.length === 0 ? 'No Lex.uz references are tracked for your books yet.' : run_ ? 'No changes waiting for your approval.' : 'Run a check to compare your citations with Lex.uz.'}
        </p>
      )}

      {/* tracked references */}
      {state && state.refs.length > 0 && (
        <div className="px-5 py-4">
          <p className="eyebrow mb-2">Tracked references</p>
          <ul className="space-y-1.5 text-[12.5px]">
            {state.refs.map(r => (
              <li key={r.id} className="flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${r.status === 'current' ? 'bg-forest' : r.status === 'unchecked' ? 'bg-rule' : 'bg-wine'}`}
                  aria-label={r.status}
                />
                <span className="w-14 shrink-0 tabular-nums text-soft">Art. {r.cited_article}</span>
                <span className="truncate">{r.topic}</span>
              </li>
            ))}
          </ul>
          {decided.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-line pt-3 text-[11.5px] text-muted">
              {decided.map(p => (
                <li key={p.id}>
                  {p.status === 'approved' ? '✓ Approved' : '✕ Rejected'}: Art. {p.cited_article}
                  {p.found_article && p.status === 'approved' ? ` → ${p.found_article}` : ''} · {p.decided_by}, {p.decided_at ? when(p.decided_at) : ''}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-muted">{state.refs[0]?.act_title} · lex.uz/ru/docs/111181</p>
        </div>
      )}
    </aside>
  )
}
