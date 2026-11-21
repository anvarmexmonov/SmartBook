import { Fragment, useState, type ReactNode } from 'react'
import { AlertTriangle, ArrowUpRight, Check, CheckCircle2, ChevronDown, Info, RotateCcw, Scale, XCircle } from 'lucide-react'
import type { Block } from '../data/types'
import { LEX_DISCLAIMER, LEX_REFS } from '../data/lex'
import { useStore } from '../store/AppStore'
import { DiagramView, IconView, ImageView, LawRefView, TableView } from './RichBlocks'

/** Minimal inline formatting: **bold** and *italic*. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>
        return <Fragment key={i}>{part}</Fragment>
      })}
    </>
  )
}

interface Props {
  blocks: Block[]
  /** Interactive features (quiz persistence) are disabled in the studio preview. */
  preview?: boolean
}

export default function ChapterBlocks({ blocks, preview }: Props) {
  const firstP = blocks.findIndex(b => b.type === 'p')
  return (
    <div className="reader-prose">
      {blocks.map((b, i) => (
        <div key={b.id} data-block-id={b.id}>
          <BlockView block={b} dropCap={i === firstP} preview={preview} />
        </div>
      ))}
      <div className="clear-both" />
    </div>
  )
}

function BlockView({ block: b, dropCap, preview }: { block: Block; dropCap: boolean; preview?: boolean }) {
  switch (b.type) {
    case 'h2':
      return (
        <h2 id={b.id} data-section className="clear-both scroll-mt-28 pb-1 pt-[2.2em] font-serif text-[1.45em] font-semibold leading-tight tracking-[-0.01em]">
          <RichText text={b.text} />
        </h2>
      )
    case 'h3':
      return (
        <h3 id={b.id} className="scroll-mt-28 pt-[1.6em] font-serif text-[1.15em] font-semibold leading-snug">
          <RichText text={b.text} />
        </h3>
      )
    case 'p':
      return (
        <p className={`mt-[0.9em] leading-[1.72] ${dropCap ? 'drop-cap' : ''}`}>
          <RichText text={b.text} />
        </p>
      )
    case 'list':
      return (
        <ul className="mt-[0.9em] space-y-[0.55em] leading-[1.65]">
          {b.items.map((it, i) => (
            <li key={i} className="relative pl-[1.4em]">
              <span className="r-accent absolute left-0 top-0 font-serif">—</span>
              <RichText text={it} />
            </li>
          ))}
        </ul>
      )
    case 'quote':
      return (
        <figure className="my-[1.8em] pl-[1.4em]" style={{ borderLeft: '2px solid var(--r-wine)' }}>
          <blockquote className="font-serif text-[1.12em] italic leading-[1.6]">
            <RichText text={b.text} />
          </blockquote>
          {b.source && <figcaption className="r-muted mt-2 font-sans text-[0.72em] not-italic">{b.source}</figcaption>}
        </figure>
      )
    case 'note':
      return (
        <aside className="my-[1.6em] rounded-[3px] px-5 py-4 font-sans text-[0.84em] leading-[1.65]" style={{ background: 'var(--r-accent-soft)' }}>
          <p className="r-accent mb-1 flex items-center gap-1.5 text-[0.82em] font-semibold uppercase tracking-[0.12em]">
            <Info size={13} /> Note
          </p>
          <RichText text={b.text} />
        </aside>
      )
    case 'figure':
      return (
        <figure className="my-[2em]">
          <div className="r-border overflow-x-auto rounded-[3px] border px-4 py-6">
            {b.figure === 'formation' ? <FormationFigure /> : <EssentialsFigure />}
          </div>
          <figcaption className="r-muted mt-2.5 font-sans text-[0.74em] leading-relaxed">{b.caption}</figcaption>
        </figure>
      )
    case 'lex':
      return <LexCard block={b} />
    case 'quiz':
      return <Quiz block={b} preview={preview} />
    case 'case':
      return <CaseStudy block={b} />
    case 'lawref':
      return <LawRefView block={b} />
    case 'image':
      return <ImageView block={b} />
    case 'table':
      return <TableView block={b} />
    case 'icon':
      return <IconView block={b} />
    case 'diagram':
      return <DiagramView block={b} />
  }
}

/* ---------------- Lex.uz reference ---------------- */

function LexCard({ block }: { block: Extract<Block, { type: 'lex' }> }) {
  const { lexReviews } = useStore()
  const [open, setOpen] = useState(false)
  const ref = LEX_REFS[block.refId]
  const review = lexReviews[block.refId]
  const pending = ref?.hasNotice && !review
  const approved = review === 'approved' && ref?.notice
  const text = approved ? ref.notice!.proposedText : block.excerpt

  return (
    <aside className="r-border my-[1.6em] rounded-[3px] border font-sans text-[0.8em]">
      <button onClick={() => setOpen(o => !o)} className="r-hover flex w-full items-start gap-3 px-4 py-3 text-left" aria-expanded={open}>
        <Scale size={16} className="r-accent mt-0.5 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="r-muted block text-[0.85em] font-medium uppercase tracking-[0.1em]">Lex.uz reference</span>
          <span className="mt-0.5 block font-medium">
            {block.act}, {block.article} — {block.title}
          </span>
        </span>
        {pending && (
          <span className="r-wine flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-0.5 text-[0.85em] font-medium" style={{ background: 'var(--r-wine-soft)' }}>
            <AlertTriangle size={12} /> Possible update
          </span>
        )}
        {review && (
          <span className="r-accent flex shrink-0 items-center gap-1 text-[0.85em] font-medium">
            <Check size={12} /> Reviewed
          </span>
        )}
        <ChevronDown size={16} className={`r-muted mt-0.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="r-border animate-fadeIn border-t px-4 pb-4 pt-3">
          <p className="font-serif text-[1.15em] leading-relaxed">“{text}”</p>
          {pending && ref?.notice && (
            <p className="r-wine mt-3 rounded-sm px-3 py-2 leading-relaxed" style={{ background: 'var(--r-wine-soft)' }}>
              <strong className="font-semibold">Demonstration notice ({ref.notice.received}).</strong> A linked provision may have changed. The author has
              been asked to review this passage; until then, check the current wording on Lex.uz.
            </p>
          )}
          {approved && (
            <p className="r-accent mt-3 leading-relaxed">Wording updated after the author reviewed a sample amendment notice (demo).</p>
          )}
          {review === 'dismissed' && <p className="r-muted mt-3">The author reviewed a sample notice and kept this passage unchanged (demo).</p>}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="r-muted max-w-md text-[0.9em] leading-snug">{LEX_DISCLAIMER}</span>
            <a href="https://lex.uz" target="_blank" rel="noreferrer" className="r-accent inline-flex items-center gap-1 font-medium hover:underline">
              Open Lex.uz <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
      )}
    </aside>
  )
}

/* ---------------- Quiz ---------------- */

function Quiz({ block, preview }: { block: Extract<Block, { type: 'quiz' }>; preview?: boolean }) {
  const store = useStore()
  const [localAnswer, setLocalAnswer] = useState<number | undefined>()
  const answered = preview ? localAnswer : store.quiz[block.id]
  const [choice, setChoice] = useState<number | null>(answered ?? null)
  const submitted = answered !== undefined
  const correct = answered === block.correct

  const submit = () => {
    if (choice === null) return
    if (preview) setLocalAnswer(choice)
    else store.answerQuiz(block.id, choice)
  }
  const retry = () => {
    setChoice(null)
    if (preview) setLocalAnswer(undefined)
    else store.answerQuiz(block.id, null)
  }

  return (
    <section className="r-panel my-[2em] rounded-[4px] px-5 py-5 font-sans sm:px-6" aria-label="Exercise">
      <p className="r-accent text-[0.68em] font-semibold uppercase tracking-[0.14em]">Check your understanding</p>
      <p className="mt-2 font-serif text-[1em] leading-[1.6]">{block.question}</p>
      <div className="mt-4 space-y-2" role="radiogroup">
        {block.options.map((opt, i) => {
          const isChoice = choice === i
          const showRight = submitted && i === block.correct
          const showWrong = submitted && isChoice && !correct
          return (
            <button
              key={i}
              role="radio"
              aria-checked={isChoice}
              disabled={submitted}
              onClick={() => setChoice(i)}
              className="r-border flex w-full items-start gap-3 rounded-[3px] border px-3.5 py-2.5 text-left text-[0.8em] leading-snug transition-colors disabled:cursor-default"
              style={{
                background: showRight ? 'var(--r-accent-soft)' : showWrong ? 'var(--r-wine-soft)' : isChoice ? 'var(--r-bg)' : 'transparent',
                borderColor: showRight ? 'var(--r-accent)' : showWrong ? 'var(--r-wine)' : isChoice ? 'var(--r-text)' : undefined,
              }}
            >
              <span
                className="mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold"
                style={{ borderColor: isChoice || showRight ? 'currentColor' : 'var(--r-line)' }}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{opt}</span>
              {showRight && <CheckCircle2 size={16} className="r-accent shrink-0" />}
              {showWrong && <XCircle size={16} className="r-wine shrink-0" />}
            </button>
          )
        })}
      </div>
      {submitted ? (
        <div className="mt-4 animate-fadeUp text-[0.8em] leading-relaxed">
          <p className={`font-semibold ${correct ? 'r-accent' : 'r-wine'}`}>{correct ? 'Correct.' : 'Not quite.'}</p>
          <p className="r-soft mt-1">{block.explanation}</p>
          <button onClick={retry} className="r-muted mt-3 inline-flex items-center gap-1.5 hover:underline">
            <RotateCcw size={13} /> Try again
          </button>
        </div>
      ) : (
        <button
          onClick={submit}
          disabled={choice === null}
          className="mt-4 inline-flex h-9 items-center rounded-[4px] px-4 text-[0.78em] font-medium transition-opacity disabled:opacity-40"
          style={{ background: 'var(--r-accent)', color: 'var(--r-bg)' }}
        >
          Check answer
        </button>
      )}
    </section>
  )
}

/* ---------------- Case study ---------------- */

function CaseStudy({ block }: { block: Extract<Block, { type: 'case' }> }) {
  const [open, setOpen] = useState(false)
  return (
    <section className="r-border my-[2em] border-y py-5" aria-label="Case study">
      <p className="r-wine font-sans text-[0.68em] font-semibold uppercase tracking-[0.14em]">Case study</p>
      <h4 className="mt-1.5 font-serif text-[1.1em] font-semibold">{block.title}</h4>
      <p className="r-soft mt-2 leading-[1.7]">{block.facts}</p>
      <p className="mt-3 font-serif italic leading-[1.6]">Question: {block.question}</p>
      {open ? (
        <div className="mt-4 animate-fadeUp rounded-[3px] px-4 py-3 font-sans text-[0.82em] leading-[1.65]" style={{ background: 'var(--r-accent-soft)' }}>
          <p className="r-accent mb-1 font-semibold">Suggested analysis</p>
          {block.analysis}
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="r-accent mt-3 font-sans text-[0.78em] font-medium hover:underline">
          Think it through, then reveal the analysis →
        </button>
      )}
    </section>
  )
}

/* ---------------- Figures ---------------- */

function Node({ x, y, w, label, sub, strong }: { x: number; y: number; w: number; label: string; sub?: string; strong?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={54} rx={3} fill={strong ? 'var(--r-accent-soft)' : 'var(--r-bg)'} stroke={strong ? 'var(--r-accent)' : 'var(--r-line)'} strokeWidth={strong ? 1.5 : 1.2} />
      <text x={x + w / 2} y={y + (sub ? 23 : 32)} textAnchor="middle" fontFamily="Source Serif 4, Georgia, serif" fontSize="15" fontWeight={600} fill="var(--r-text)">
        {label}
      </text>
      {sub && (
        <text x={x + w / 2} y={y + 41} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="10.5" fill="var(--r-muted)">
          {sub}
        </text>
      )}
    </g>
  )
}

function FormationFigure() {
  return (
    <svg viewBox="0 0 640 210" className="mx-auto block w-full min-w-[520px] max-w-[640px]" role="img" aria-label="Diagram: offer leads to acceptance and a concluded contract, or to a counter-offer that restarts the process">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="var(--r-muted)" />
        </marker>
      </defs>
      <Node x={10} y={20} w={140} label="Offer" sub="definite · addressed · binding" />
      <Node x={250} y={20} w={150} label="Acceptance" sub="full and unconditional" />
      <Node x={490} y={20} w={140} label="Contract" sub="on receipt of acceptance" strong />
      <Node x={250} y={140} w={150} label="Counter-offer" sub="reply on different terms" />
      <g stroke="var(--r-muted)" strokeWidth="1.3" fill="none">
        <path d="M150 47H246" markerEnd="url(#arr)" />
        <path d="M400 47H486" markerEnd="url(#arr)" />
        <path d="M110 74V167H246" markerEnd="url(#arr)" strokeDasharray="4 3" />
        <path d="M325 140V112H80V78" markerEnd="url(#arr)" />
      </g>
      <text x={200} y={40} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="10.5" fill="var(--r-muted)">“yes”</text>
      <text x={120} y={160} fontFamily="Inter, sans-serif" fontSize="10.5" fill="var(--r-muted)">“yes, but…”</text>
      <text x={200} y={106} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="10.5" fill="var(--r-muted)">becomes a new offer — roles swap</text>
    </svg>
  )
}

function EssentialsFigure() {
  const circles: { cx: number; label: string; sub: string }[] = [
    { cx: 150, label: 'Subject', sub: 'always essential' },
    { cx: 320, label: 'Named by law', sub: 'e.g. price of real estate' },
    { cx: 490, label: 'Insisted on', sub: 'declared necessary by a party' },
  ]
  return (
    <svg viewBox="0 0 640 200" className="mx-auto block w-full min-w-[480px] max-w-[640px]" role="img" aria-label="Diagram: three sources of essential terms — the subject, terms named by law, and terms one party insists on">
      {circles.map(c => (
        <g key={c.cx}>
          <circle cx={c.cx} cy={88} r={70} fill="var(--r-accent-soft)" stroke="var(--r-accent)" strokeWidth={1.2} fillOpacity={0.55} />
          <text x={c.cx} y={86} textAnchor="middle" fontFamily="Source Serif 4, Georgia, serif" fontSize="16" fontWeight={600} fill="var(--r-text)">
            {c.label}
          </text>
          <text x={c.cx} y={106} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="10.5" fill="var(--r-muted)">
            {c.sub}
          </text>
        </g>
      ))}
      <text x={320} y={188} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="11" fill="var(--r-soft)">
        Agreement on all three → the contract is concluded
      </text>
    </svg>
  )
}

export function Placeholder({ children }: { children: ReactNode }) {
  return <div className="r-muted py-10 text-center font-serif italic">{children}</div>
}
