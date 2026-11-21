import type { ComponentType } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Briefcase,
  Building2,
  Clock,
  FileText,
  Gavel,
  Globe,
  Handshake,
  HelpCircle,
  ImageOff,
  Landmark,
  Lightbulb,
  Scale,
  ScrollText,
  Shield,
  Stamp,
  Users,
  type LucideProps,
} from 'lucide-react'
import type { Block, BlockAlign, IconColor } from '../data/types'
import { useImageSrc } from '../store/imageStore'
import { RichText } from './ChapterBlocks'

/* ---------------- shared registries ---------------- */

export const ICONS: { id: string; label: string; keywords: string; Icon: ComponentType<LucideProps> }[] = [
  { id: 'scale', label: 'Scale', keywords: 'justice law balance', Icon: Scale },
  { id: 'gavel', label: 'Gavel', keywords: 'court judge verdict', Icon: Gavel },
  { id: 'landmark', label: 'Landmark', keywords: 'state government court building', Icon: Landmark },
  { id: 'book', label: 'Book', keywords: 'textbook reading code', Icon: BookOpen },
  { id: 'document', label: 'Document', keywords: 'file contract paper', Icon: FileText },
  { id: 'scroll', label: 'Scroll', keywords: 'statute decree charter', Icon: ScrollText },
  { id: 'stamp', label: 'Stamp', keywords: 'notary seal approval', Icon: Stamp },
  { id: 'shield', label: 'Shield', keywords: 'protection rights security', Icon: Shield },
  { id: 'people', label: 'People', keywords: 'parties persons citizens users', Icon: Users },
  { id: 'handshake', label: 'Handshake', keywords: 'agreement contract deal', Icon: Handshake },
  { id: 'briefcase', label: 'Briefcase', keywords: 'business company work', Icon: Briefcase },
  { id: 'building', label: 'Building', keywords: 'company legal entity office', Icon: Building2 },
  { id: 'globe', label: 'Globe', keywords: 'international world treaty', Icon: Globe },
  { id: 'clock', label: 'Clock', keywords: 'time deadline limitation period', Icon: Clock },
  { id: 'warning', label: 'Warning', keywords: 'alert caution risk', Icon: AlertTriangle },
  { id: 'lightbulb', label: 'Lightbulb', keywords: 'idea tip insight', Icon: Lightbulb },
  { id: 'question', label: 'Question', keywords: 'help ask quiz', Icon: HelpCircle },
]

export const ICON_COLORS: Record<IconColor, { label: string; value: string }> = {
  ink: { label: 'Ink', value: 'var(--r-text)' },
  forest: { label: 'Green', value: 'var(--r-accent)' },
  wine: { label: 'Burgundy', value: 'var(--r-wine)' },
  ochre: { label: 'Ochre', value: '#9A6B21' },
  muted: { label: 'Grey', value: 'var(--r-muted)' },
}

/** Returns a normalised http(s) link on lex.uz (or a subdomain), or null. A missing scheme gets https://. */
export function normalizeLexUrl(value: string): string | null {
  const raw = value.trim()
  if (!raw) return null
  const withScheme = /^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const u = new URL(withScheme)
    const ok = (u.protocol === 'https:' || u.protocol === 'http:') && (u.hostname === 'lex.uz' || u.hostname.endsWith('.lex.uz'))
    return ok ? u.href : null
  } catch {
    return null
  }
}

export const isLexUrl = (value: string) => normalizeLexUrl(value) !== null

const alignClass: Record<BlockAlign, string> = { left: 'mr-auto', center: 'mx-auto', right: 'ml-auto' }
const textAlign: Record<BlockAlign, string> = { left: 'text-left', center: 'text-center', right: 'text-right' }

/* ---------------- law reference ---------------- */

export function LawRefView({ block: b }: { block: Extract<Block, { type: 'lawref' }> }) {
  const valid = isLexUrl(b.url)
  let display = ''
  if (valid) {
    const u = new URL(b.url)
    display = (u.hostname + u.pathname).replace(/\/$/, '')
  }
  return (
    <aside className="r-border my-[1.8em] border-y py-[1em]" aria-label="Law reference">
      <div className="flex items-start gap-3 font-sans">
        <Scale size={15} className="r-accent mt-[3px] shrink-0" strokeWidth={1.6} />
        <div className="min-w-0 flex-1">
          <p className="text-[0.78em] font-semibold leading-snug">
            {b.title || 'Untitled act'}
            {b.article && <span className="r-soft font-normal">, {b.article}</span>}
          </p>
          <p className="r-muted mt-0.5 text-[0.62em] uppercase tracking-[0.12em]">Entered by the author · not verified against Lex.uz</p>
        </div>
      </div>
      {b.excerpt && (
        <blockquote className="mt-[0.8em] pl-[1.9rem] font-serif text-[0.92em] leading-[1.65]">
          <span className="r-muted mr-1 font-sans text-[0.8em]">§</span>
          {b.excerpt}
        </blockquote>
      )}
      {b.explanation && (
        <p className="r-soft mt-[0.7em] pl-[1.9rem] font-serif text-[0.86em] italic leading-[1.6]">
          <span className="r-muted not-italic">Author’s note — </span>
          <RichText text={b.explanation} />
        </p>
      )}
      {valid && (
        <a href={b.url} target="_blank" rel="noreferrer" className="r-accent mt-[0.8em] ml-[1.9rem] inline-flex max-w-[calc(100%-1.9rem)] items-center gap-1 font-sans text-[0.7em] font-medium hover:underline">
          <span className="truncate">{display}</span>
          <ArrowUpRight size={12} className="shrink-0" />
        </a>
      )}
    </aside>
  )
}

/* ---------------- image ---------------- */

export function ImageView({ block: b }: { block: Extract<Block, { type: 'image' }> }) {
  const { url, missing } = useImageSrc(b.src)
  const width = b.size === 'full' ? '100%' : b.size === 'medium' ? '66%' : '40%'
  const float = b.size !== 'full' && b.align !== 'center' && b.size === 'small'
  return (
    <figure
      className={`my-[1.6em] ${float ? (b.align === 'left' ? 'float-left mr-[1.4em] mt-[0.4em]' : 'float-right ml-[1.4em] mt-[0.4em]') : alignClass[b.align]}`}
      style={{ width: float ? width : b.size === 'full' ? '100%' : `min(100%, ${width})` }}
    >
      {url ? (
        <img src={url} alt={b.caption || (b.illustration ? 'Illustration' : 'Image')} className={`block w-full ${b.illustration ? '' : 'r-border rounded-[2px] border'}`} loading="lazy" />
      ) : (
        <div className="r-border r-muted flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 border border-dashed font-sans text-[0.7em]">
          <ImageOff size={20} strokeWidth={1.4} />
          {missing ? 'Image not available on this device' : 'Loading image…'}
        </div>
      )}
      {b.caption && <figcaption className={`r-muted mt-2 font-sans text-[0.72em] leading-relaxed ${textAlign[b.align]}`}>{b.caption}</figcaption>}
    </figure>
  )
}

/* ---------------- table ---------------- */

export function TableView({ block: b }: { block: Extract<Block, { type: 'table' }> }) {
  const head = b.header ? b.rows[0] : null
  const body = b.header ? b.rows.slice(1) : b.rows
  return (
    <figure className="my-[1.8em] clear-both">
      {b.caption && <figcaption className="r-muted mb-2 font-sans text-[0.72em] leading-relaxed">{b.caption}</figcaption>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-sans text-[0.78em] leading-snug" style={{ borderTop: '1.5px solid var(--r-text)', borderBottom: '1.5px solid var(--r-text)' }}>
          {head && (
            <thead>
              <tr style={{ borderBottom: '1px solid var(--r-text)' }}>
                {head.map((c, i) => (
                  <th key={i} className="px-3 py-2 text-left font-semibold align-bottom">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {body.map((row, r) => (
              <tr key={r} className="r-border border-b last:border-b-0">
                {row.map((c, i) => (
                  <td key={i} className="px-3 py-2 align-top">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  )
}

/* ---------------- icon ---------------- */

export function IconView({ block: b }: { block: Extract<Block, { type: 'icon' }> }) {
  const entry = ICONS.find(i => i.id === b.icon) ?? ICONS[0]
  const px = b.size === 'small' ? 28 : b.size === 'medium' ? 44 : 64
  return (
    <figure className={`my-[1.6em] clear-both flex flex-col ${b.align === 'left' ? 'items-start' : b.align === 'right' ? 'items-end' : 'items-center'}`}>
      <entry.Icon size={px} strokeWidth={1.25} style={{ color: ICON_COLORS[b.color]?.value }} aria-hidden={!b.caption} aria-label={b.caption || entry.label} />
      {b.caption && <figcaption className={`r-muted mt-2 max-w-[24em] font-sans text-[0.72em] leading-relaxed ${textAlign[b.align]}`}>{b.caption}</figcaption>}
    </figure>
  )
}

/* ---------------- diagrams ---------------- */

export function DiagramView({ block: b }: { block: Extract<Block, { type: 'diagram' }> }) {
  return (
    <figure className="my-[2em] clear-both font-sans">
      {b.title && <figcaption className="r-muted mb-3 text-[0.72em] font-semibold uppercase tracking-[0.12em]">{b.title}</figcaption>}
      {b.variant === 'process' && (
        <ol className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-stretch">
          {b.items.map((it, i) => (
            <li key={i} className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="r-border flex-1 rounded-[3px] border px-3 py-2.5" style={{ background: i === b.items.length - 1 ? 'var(--r-accent-soft)' : undefined }}>
                <p className="r-accent text-[0.62em] font-semibold uppercase tracking-[0.14em]">Step {i + 1}</p>
                <p className="mt-0.5 font-serif text-[0.9em] font-semibold leading-snug">{it.label}</p>
                {it.text && <p className="r-soft mt-1 text-[0.7em] leading-relaxed">{it.text}</p>}
              </div>
              {i < b.items.length - 1 && <ArrowRight size={14} className="r-muted mx-auto shrink-0 rotate-90 sm:rotate-0" />}
            </li>
          ))}
        </ol>
      )}
      {b.variant === 'timeline' && (
        <ol className="relative ml-[0.4em] pl-[1.4em]" style={{ borderLeft: '1px solid var(--r-line)' }}>
          {b.items.map((it, i) => (
            <li key={i} className="relative pb-[1em] last:pb-0">
              <span className="absolute -left-[calc(1.4em+4.5px)] top-[0.35em] h-2 w-2 rounded-full" style={{ background: 'var(--r-accent)', boxShadow: '0 0 0 3px var(--r-bg)' }} />
              <p className="r-accent text-[0.72em] font-semibold tabular-nums">{it.label}</p>
              {it.text && <p className="mt-0.5 font-serif text-[0.88em] leading-snug">{it.text}</p>}
            </li>
          ))}
        </ol>
      )}
      {b.variant === 'comparison' && (
        <div className="r-border grid grid-cols-1 border-y sm:grid-cols-2">
          {b.items.slice(0, 2).map((it, i) => (
            <div key={i} className={`r-border px-4 py-3 ${i === 1 ? 'border-t sm:border-l sm:border-t-0' : ''}`}>
              <p className="font-serif text-[0.95em] font-semibold">{it.label}</p>
              {it.text && <p className="r-soft mt-1 whitespace-pre-line text-[0.74em] leading-relaxed">{it.text}</p>}
            </div>
          ))}
        </div>
      )}
    </figure>
  )
}
