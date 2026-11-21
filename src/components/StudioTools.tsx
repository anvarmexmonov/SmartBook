import { useRef, useState, type ReactNode } from 'react'
import { AlignCenter, AlignLeft, AlignRight, Image as ImageIcon, Minus, Plus, Scale, Search, Shapes, Table2, Upload, X } from 'lucide-react'
import type { Block, BlockAlign, IconColor } from '../data/types'
import { ICON_COLORS, ICONS, isLexUrl, normalizeLexUrl } from './RichBlocks'
import { prepareImage, saveImage, useImageSrc } from '../store/imageStore'

const uid = () => Math.random().toString(36).slice(2, 9)

type Tool = 'law' | 'image' | 'table' | 'visual'
type Rich<T extends Block['type']> = Extract<Block, { type: T }>

/* ================= Insert bar extension ================= */

/** Renders the existing insert buttons (children) followed by Law / Image / Table / Visual and their compact panels. */
export function RichInsert({ children, onInsert }: { children: ReactNode; onInsert: (b: Block) => void }) {
  const [tool, setTool] = useState<Tool | null>(null)
  const insert = (b: Block) => {
    onInsert(b)
    setTool(null)
  }
  const btn = (t: Tool, icon: ReactNode, label: string) => (
    <button
      onClick={() => setTool(cur => (cur === t ? null : t))}
      aria-expanded={tool === t}
      className={`btn-secondary btn-sm ${tool === t ? '!border-forest !bg-forest-50 !text-forest' : ''}`}
    >
      {icon} {label}
    </button>
  )
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {children}
        <span className="mx-0.5 hidden w-px self-stretch bg-line sm:block" aria-hidden />
        {btn('law', <Scale size={15} />, 'Law')}
        {btn('image', <ImageIcon size={15} />, 'Image')}
        {btn('table', <Table2 size={15} />, 'Table')}
        {btn('visual', <Shapes size={15} />, 'Visual')}
      </div>
      {tool && (
        <div className="mt-3 animate-fadeIn border-t border-line pt-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-serif text-[16px] font-semibold">
              {{ law: 'Law reference', image: 'Image', table: 'Table', visual: 'Visual' }[tool]}
            </p>
            <button className="icon-btn !h-7 !w-7" onClick={() => setTool(null)} aria-label="Close panel">
              <X size={15} />
            </button>
          </div>
          {tool === 'law' && <LawInsert onInsert={insert} />}
          {tool === 'image' && <ImageInsert onInsert={insert} />}
          {tool === 'table' && <TableInsert onInsert={insert} />}
          {tool === 'visual' && <VisualInsert onInsert={insert} />}
        </div>
      )}
    </>
  )
}

/* ================= small controls ================= */

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: ReactNode; title?: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-rule bg-paper p-0.5">
      {options.map(o => (
        <button
          key={o.id}
          role="radio"
          aria-checked={value === o.id}
          title={o.title}
          onClick={() => onChange(o.id)}
          className={`flex h-7 items-center rounded-[4px] px-2 text-[12px] ${value === o.id ? 'bg-ink/[0.08] font-medium text-ink' : 'text-muted hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

const ALIGN_OPTS: { id: BlockAlign; label: ReactNode; title: string }[] = [
  { id: 'left', label: <AlignLeft size={14} />, title: 'Left' },
  { id: 'center', label: <AlignCenter size={14} />, title: 'Centre' },
  { id: 'right', label: <AlignRight size={14} />, title: 'Right' },
]

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] leading-snug">{hint}</span>}
    </label>
  )
}

/* ================= Law reference ================= */

const LAW_EMPTY = { url: '', title: '', article: '', excerpt: '', explanation: '' }

function LawFields({ value, onChange, urlError }: { value: typeof LAW_EMPTY; onChange: (p: Partial<typeof LAW_EMPTY>) => void; urlError?: string | null }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field
          label="Lex.uz document URL"
          hint={urlError ? <span className="text-wine">{urlError}</span> : <span className="text-muted">Paste the link from your browser, e.g. https://lex.uz/docs/…</span>}
        >
          <input
            className={`field ${urlError ? '!border-wine/60' : ''}`}
            value={value.url}
            onChange={e => onChange({ url: e.target.value })}
            placeholder="https://lex.uz/docs/…"
            inputMode="url"
            spellCheck={false}
          />
        </Field>
      </div>
      <Field label="Law or document title (optional)">
        <input className="field" value={value.title} onChange={e => onChange({ title: e.target.value })} placeholder="e.g. Civil Code of the Republic of Uzbekistan" />
      </Field>
      <Field label="Article or provision">
        <input className="field" value={value.article} onChange={e => onChange({ article: e.target.value })} placeholder="e.g. Art. 365" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Excerpt">
          <textarea className="field resize-y font-serif" rows={3} value={value.excerpt} onChange={e => onChange({ excerpt: e.target.value })} placeholder="Copy the relevant wording from Lex.uz" />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Your explanation (optional)">
          <textarea className="field resize-y" rows={2} value={value.explanation} onChange={e => onChange({ explanation: e.target.value })} placeholder="What should students notice in this provision?" />
        </Field>
      </div>
    </div>
  )
}

const lawUrlError = (url: string) => (!url.trim() ? null : isLexUrl(url) ? null : 'Only links to lex.uz are accepted.')

function LawInsert({ onInsert }: { onInsert: (b: Block) => void }) {
  const [v, setV] = useState(LAW_EMPTY)
  const err = lawUrlError(v.url)
  const ready = isLexUrl(v.url) && v.excerpt.trim().length > 0 && v.article.trim().length > 0
  return (
    <div>
      <LawFields value={v} onChange={p => setV(s => ({ ...s, ...p }))} urlError={err} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-sm text-[11px] leading-snug text-muted">
          Nothing is fetched from Lex.uz. The reference is shown to students as entered by you and marked as not verified.
        </p>
        <button
          className="btn-primary btn-sm"
          disabled={!ready}
          title={ready ? undefined : 'A valid Lex.uz link, an article and an excerpt are required'}
          onClick={() => onInsert({ id: uid(), type: 'lawref', ...v, url: normalizeLexUrl(v.url)! })}
        >
          Insert into Book
        </button>
      </div>
    </div>
  )
}

function LawEdit({ block, set }: { block: Rich<'lawref'>; set: (p: Partial<Rich<'lawref'>>) => void }) {
  // keep the typed URL locally; only a valid Lex.uz link is written to the book
  const [url, setUrl] = useState(block.url)
  const err = url !== block.url ? lawUrlError(url) ?? (url.trim() ? null : 'A Lex.uz link is required.') : null
  return (
    <LawFields
      value={{ ...block, url }}
      urlError={err}
      onChange={p => {
        if (p.url !== undefined) {
          setUrl(p.url)
          const ok = normalizeLexUrl(p.url)
          if (ok) set({ url: ok })
        } else set(p)
      }}
    />
  )
}

/* ================= Image ================= */

function useImagePicker() {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pick = (onData: (dataUrl: string) => void) => (
    <input
      ref={input}
      type="file"
      accept="image/*"
      className="sr-only"
      onChange={async e => {
        const el = e.target
        const f = el.files?.[0]
        if (!f) return
        setBusy(true)
        setError(null)
        try {
          onData(await prepareImage(f))
        } catch (err) {
          setError(err instanceof Error ? err.message : 'The image could not be used.')
        } finally {
          setBusy(false)
          el.value = '' // allow choosing the same file again (only after it has been read)
        }
      }}
    />
  )
  return { open: () => input.current?.click(), pick, busy, error }
}

function ImageOptions({ caption, align, size, onChange }: { caption: string; align: BlockAlign; size: Rich<'image'>['size']; onChange: (p: Partial<Rich<'image'>>) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Caption">
        <input className="field" value={caption} onChange={e => onChange({ caption: e.target.value })} placeholder="Figure 1. What the image shows" />
      </Field>
      <div className="flex flex-wrap gap-4">
        <div>
          <span className="label">Alignment</span>
          <Seg label="Alignment" value={align} options={ALIGN_OPTS} onChange={a => onChange({ align: a })} />
        </div>
        <div>
          <span className="label">Width</span>
          <Seg
            label="Width"
            value={size}
            options={[
              { id: 'small', label: 'Small' },
              { id: 'medium', label: 'Medium' },
              { id: 'full', label: 'Full' },
            ]}
            onChange={s => onChange({ size: s })}
          />
        </div>
      </div>
    </div>
  )
}

function ImageInsert({ onInsert, illustration }: { onInsert: (b: Block) => void; illustration?: boolean }) {
  const [data, setData] = useState<string | null>(null)
  const [opts, setOpts] = useState<{ caption: string; align: BlockAlign; size: Rich<'image'>['size'] }>({ caption: '', align: 'center', size: illustration ? 'medium' : 'full' })
  const [saving, setSaving] = useState(false)
  const picker = useImagePicker()
  return (
    <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
      {picker.pick(setData)}
      <button
        onClick={picker.open}
        className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md border border-dashed border-rule bg-ivory/60 text-[12px] text-muted hover:border-soft"
      >
        {data ? (
          <img src={data} alt="Selected file preview" className="h-full w-full object-contain" />
        ) : (
          <span className="flex flex-col items-center gap-1.5 px-3 text-center">
            <Upload size={18} /> {picker.busy ? 'Preparing…' : `Choose ${illustration ? 'an illustration' : 'an image'}`}
          </span>
        )}
      </button>
      <div>
        <ImageOptions {...opts} onChange={p => setOpts(o => ({ ...o, ...p }))} />
        {picker.error && <p className="mt-2 text-[12px] text-wine">{picker.error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {data && (
            <button className="btn-ghost btn-sm" onClick={picker.open}>
              Choose another
            </button>
          )}
          <button
            className="btn-primary btn-sm ml-auto"
            disabled={!data || saving}
            onClick={async () => {
              if (!data) return
              setSaving(true)
              const src = await saveImage(data)
              onInsert({ id: uid(), type: 'image', src, ...opts, illustration })
            }}
          >
            Insert into Book
          </button>
        </div>
      </div>
    </div>
  )
}

function ImageEdit({ block, set }: { block: Rich<'image'>; set: (p: Partial<Rich<'image'>>) => void }) {
  const { url, missing } = useImageSrc(block.src)
  const picker = useImagePicker()
  return (
    <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
      {picker.pick(async d => set({ src: await saveImage(d) }))}
      <div>
        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-sm border border-line bg-ivory/60 text-[11px] text-muted">
          {url ? <img src={url} alt="" className="h-full w-full object-contain" /> : missing ? 'Image missing' : 'Loading…'}
        </div>
        <button className="mt-2 text-[12px] font-medium text-forest hover:underline" onClick={picker.open}>
          {picker.busy ? 'Preparing…' : 'Replace image'}
        </button>
        {picker.error && <p className="mt-1 text-[11px] text-wine">{picker.error}</p>}
      </div>
      <ImageOptions caption={block.caption} align={block.align} size={block.size} onChange={set} />
    </div>
  )
}

/* ================= Table ================= */

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="inline-flex items-center rounded-md border border-rule bg-paper">
        <button className="icon-btn !h-8 !w-8" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`Fewer ${label.toLowerCase()}`}>
          <Minus size={13} />
        </button>
        <span className="w-8 text-center text-[13px] tabular-nums">{value}</span>
        <button className="icon-btn !h-8 !w-8" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`More ${label.toLowerCase()}`}>
          <Plus size={13} />
        </button>
      </div>
    </div>
  )
}

function TableInsert({ onInsert }: { onInsert: (b: Block) => void }) {
  const [rows, setRows] = useState(3)
  const [cols, setCols] = useState(3)
  const [header, setHeader] = useState(true)
  return (
    <div className="flex flex-wrap items-end gap-5">
      <Stepper label="Rows" value={rows} min={1} max={12} onChange={setRows} />
      <Stepper label="Columns" value={cols} min={1} max={6} onChange={setCols} />
      <label className="flex h-8 items-center gap-2 text-[13px] text-soft">
        <input type="checkbox" checked={header} onChange={e => setHeader(e.target.checked)} className="accent-forest" /> First row is a header
      </label>
      <button
        className="btn-primary btn-sm ml-auto"
        onClick={() => onInsert({ id: uid(), type: 'table', header, caption: '', rows: Array.from({ length: rows }, () => Array.from({ length: cols }, () => '')) })}
      >
        Insert into Book
      </button>
    </div>
  )
}

function TableEdit({ block, set }: { block: Rich<'table'>; set: (p: Partial<Rich<'table'>>) => void }) {
  const cols = block.rows[0]?.length ?? 0
  const setCell = (r: number, c: number, v: string) => set({ rows: block.rows.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)) })
  return (
    <div className="space-y-3">
      <input className="field !h-8 !py-1 text-[13px]" value={block.caption} onChange={e => set({ caption: e.target.value })} placeholder="Caption (optional), e.g. Table 4.1. Offer and invitation compared" />
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c} className="border border-line p-0">
                    <input
                      value={cell}
                      onChange={e => setCell(r, c, e.target.value)}
                      aria-label={`Row ${r + 1}, column ${c + 1}`}
                      placeholder={block.header && r === 0 ? `Heading ${c + 1}` : ''}
                      className={`w-full min-w-[90px] bg-transparent px-2 py-1.5 focus:bg-forest-50 focus:outline-none ${block.header && r === 0 ? 'font-semibold' : ''}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px]">
        <span className="flex items-center gap-1 text-muted">
          Rows
          <button className="icon-btn !h-7 !w-7" disabled={block.rows.length <= 1} onClick={() => set({ rows: block.rows.slice(0, -1) })} aria-label="Remove last row">
            <Minus size={12} />
          </button>
          <button className="icon-btn !h-7 !w-7" disabled={block.rows.length >= 30} onClick={() => set({ rows: [...block.rows, Array.from({ length: cols }, () => '')] })} aria-label="Add row">
            <Plus size={12} />
          </button>
        </span>
        <span className="flex items-center gap-1 text-muted">
          Columns
          <button className="icon-btn !h-7 !w-7" disabled={cols <= 1} onClick={() => set({ rows: block.rows.map(r => r.slice(0, -1)) })} aria-label="Remove last column">
            <Minus size={12} />
          </button>
          <button className="icon-btn !h-7 !w-7" disabled={cols >= 8} onClick={() => set({ rows: block.rows.map(r => [...r, '']) })} aria-label="Add column">
            <Plus size={12} />
          </button>
        </span>
        <label className="flex items-center gap-2 text-soft">
          <input type="checkbox" checked={block.header} onChange={e => set({ header: e.target.checked })} className="accent-forest" /> First row is a header
        </label>
      </div>
    </div>
  )
}

/* ================= Visual ================= */

function IconGrid({ value, onPick }: { value?: string; onPick: (id: string) => void }) {
  const [q, setQ] = useState('')
  const list = ICONS.filter(i => !q.trim() || `${i.label} ${i.keywords}`.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <div>
      <div className="mb-2 flex items-center rounded-md border border-rule bg-paper focus-within:border-forest">
        <Search size={14} className="ml-2.5 text-muted" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search icons — court, contract, time…" className="h-8 min-w-0 flex-1 bg-transparent px-2 text-[13px] focus:outline-none" />
      </div>
      {list.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-1.5">
          {list.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => onPick(id)}
              title={label}
              aria-pressed={value === id}
              className={`flex flex-col items-center gap-1 rounded-md border px-1 py-2 text-[10.5px] ${value === id ? 'border-forest bg-forest-50 text-forest' : 'border-line bg-paper text-soft hover:border-rule hover:text-ink'}`}
            >
              <Icon size={20} strokeWidth={1.5} />
              {label}
            </button>
          ))}
        </div>
      ) : (
        <p className="py-4 text-center text-[12px] text-muted">No icon matches “{q}”.</p>
      )}
    </div>
  )
}

const DIAGRAMS: { id: Rich<'diagram'>['variant']; label: string; hint: string; make: () => Rich<'diagram'> }[] = [
  {
    id: 'process',
    label: 'Process',
    hint: 'Step 1 → Step 2 → Step 3',
    make: () => ({ id: uid(), type: 'diagram', variant: 'process', title: '', items: [1, 2, 3].map(() => ({ label: '', text: '' })) }),
  },
  {
    id: 'timeline',
    label: 'Timeline',
    hint: 'Events in chronological order',
    make: () => ({ id: uid(), type: 'diagram', variant: 'timeline', title: '', items: [1, 2, 3].map(n => ({ label: `Date ${n}`, text: 'Event' })) }),
  },
  {
    id: 'comparison',
    label: 'Comparison',
    hint: 'Two concepts side by side',
    make: () => ({ id: uid(), type: 'diagram', variant: 'comparison', title: '', items: [{ label: 'Concept A', text: '' }, { label: 'Concept B', text: '' }] }),
  },
]

function DiagramThumb({ id }: { id: Rich<'diagram'>['variant'] }) {
  const s = 'fill-none stroke-current'
  return (
    <svg viewBox="0 0 90 34" className="h-8 w-[90px] text-soft" aria-hidden>
      {id === 'process' && (
        <g className={s} strokeWidth="1.2">
          <rect x="1" y="9" width="22" height="16" rx="2" />
          <rect x="34" y="9" width="22" height="16" rx="2" />
          <rect x="67" y="9" width="22" height="16" rx="2" />
          <path d="M24 17h8M57 17h8" />
        </g>
      )}
      {id === 'timeline' && (
        <g className={s} strokeWidth="1.2">
          <path d="M6 3v28" />
          <circle cx="6" cy="7" r="2.2" className="fill-current" />
          <circle cx="6" cy="17" r="2.2" className="fill-current" />
          <circle cx="6" cy="27" r="2.2" className="fill-current" />
          <path d="M14 7h40M14 17h55M14 27h32" opacity=".5" />
        </g>
      )}
      {id === 'comparison' && (
        <g className={s} strokeWidth="1.2">
          <path d="M2 3h86M2 31h86M45 3v28" />
          <path d="M8 11h28M8 18h22M54 11h28M54 18h20" opacity=".5" />
        </g>
      )}
    </svg>
  )
}

function VisualInsert({ onInsert }: { onInsert: (b: Block) => void }) {
  const [tab, setTab] = useState<'icons' | 'diagrams' | 'illustration'>('icons')
  return (
    <div>
      <div role="tablist" className="mb-3 flex gap-5 border-b border-line text-[13px]">
        {(
          [
            ['icons', 'Icons'],
            ['diagrams', 'Diagrams'],
            ['illustration', 'Illustration'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 pb-2 ${tab === id ? 'border-forest text-ink' : 'border-transparent text-muted hover:text-ink'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'icons' && <IconGrid onPick={icon => onInsert({ id: uid(), type: 'icon', icon, size: 'medium', color: 'forest', align: 'center', caption: '' })} />}
      {tab === 'diagrams' && (
        <div className="grid gap-2 sm:grid-cols-3">
          {DIAGRAMS.map(d => (
            <button key={d.id} onClick={() => onInsert(d.make())} className="flex flex-col items-start gap-2 rounded-md border border-line bg-paper p-3 text-left hover:border-forest/50">
              <DiagramThumb id={d.id} />
              <span>
                <span className="block font-serif text-[15px] font-semibold">{d.label}</span>
                <span className="text-[11.5px] text-muted">{d.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {tab === 'illustration' && <ImageInsert onInsert={onInsert} illustration />}
    </div>
  )
}

function IconEdit({ block, set }: { block: Rich<'icon'>; set: (p: Partial<Rich<'icon'>>) => void }) {
  const [changing, setChanging] = useState(false)
  const entry = ICONS.find(i => i.id === block.icon) ?? ICONS[0]
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <span className="label">Icon</span>
          <button onClick={() => setChanging(c => !c)} className="flex h-8 items-center gap-2 rounded-md border border-rule bg-paper px-2.5 text-[13px]" aria-expanded={changing}>
            <entry.Icon size={16} strokeWidth={1.5} /> {entry.label} <span className="text-[11px] text-forest">{changing ? 'Done' : 'Change'}</span>
          </button>
        </div>
        <div>
          <span className="label">Size</span>
          <Seg
            label="Size"
            value={block.size}
            options={[
              { id: 'small', label: 'S' },
              { id: 'medium', label: 'M' },
              { id: 'large', label: 'L' },
            ]}
            onChange={size => set({ size })}
          />
        </div>
        <div>
          <span className="label">Colour</span>
          <div className="flex h-8 items-center gap-1.5" role="radiogroup" aria-label="Colour">
            {(Object.keys(ICON_COLORS) as IconColor[]).map(c => (
              <button
                key={c}
                role="radio"
                aria-checked={block.color === c}
                aria-label={ICON_COLORS[c].label}
                title={ICON_COLORS[c].label}
                onClick={() => set({ color: c })}
                className={`h-5 w-5 rounded-full ${block.color === c ? 'ring-2 ring-forest ring-offset-2 ring-offset-paper' : ''}`}
                style={{ background: { ink: '#1F1D1A', forest: '#23432F', wine: '#7A2431', ochre: '#9A6B21', muted: '#8A8373' }[c] }}
              />
            ))}
          </div>
        </div>
        <div>
          <span className="label">Alignment</span>
          <Seg label="Alignment" value={block.align} options={ALIGN_OPTS} onChange={align => set({ align })} />
        </div>
      </div>
      {changing && (
        <IconGrid
          value={block.icon}
          onPick={icon => {
            set({ icon })
            setChanging(false)
          }}
        />
      )}
      <input className="field !h-8 !py-1 text-[13px]" value={block.caption} onChange={e => set({ caption: e.target.value })} placeholder="Caption (optional)" />
    </div>
  )
}

function DiagramEdit({ block, set }: { block: Rich<'diagram'>; set: (p: Partial<Rich<'diagram'>>) => void }) {
  const flexible = block.variant !== 'comparison'
  const label = block.variant === 'process' ? 'Step' : block.variant === 'timeline' ? 'Date' : 'Concept'
  const update = (i: number, p: Partial<{ label: string; text: string }>) => set({ items: block.items.map((it, j) => (j === i ? { ...it, ...p } : it)) })
  return (
    <div className="space-y-2">
      <input className="field !h-8 !py-1 text-[13px]" value={block.title} onChange={e => set({ title: e.target.value })} placeholder="Diagram title (optional)" />
      {block.items.map((it, i) => (
        <div key={i} className={`grid gap-2 ${block.variant === 'comparison' ? 'sm:grid-cols-1' : 'sm:grid-cols-[160px_1fr_auto]'}`}>
          <input className="field !h-8 !py-1 text-[13px] font-medium" value={it.label} onChange={e => update(i, { label: e.target.value })} placeholder={block.variant === 'process' ? `Step ${i + 1} — short name` : `${label} ${i + 1}`} aria-label={`${label} ${i + 1}`} />
          {block.variant === 'comparison' ? (
            <textarea className="field resize-y text-[13px]" rows={3} value={it.text} onChange={e => update(i, { text: e.target.value })} placeholder="Key features, one per line" />
          ) : (
            <input className="field !h-8 !py-1 text-[13px]" value={it.text} onChange={e => update(i, { text: e.target.value })} placeholder={block.variant === 'timeline' ? 'What happened' : 'Short description (optional)'} />
          )}
          {flexible && (
            <button className="icon-btn !h-8 !w-8" disabled={block.items.length <= 2} onClick={() => set({ items: block.items.filter((_, j) => j !== i) })} aria-label={`Remove ${label.toLowerCase()} ${i + 1}`}>
              <Minus size={13} />
            </button>
          )}
        </div>
      ))}
      {flexible && block.items.length < 6 && (
        <button className="text-[12px] text-forest hover:underline" onClick={() => set({ items: [...block.items, { label: block.variant === 'process' ? '' : `${label} ${block.items.length + 1}`, text: '' }] })}>
          + Add {label.toLowerCase()}
        </button>
      )}
    </div>
  )
}

/* ================= block editor entry point ================= */

export const RICH_LABELS: Partial<Record<Block['type'], { label: string; icon: ReactNode }>> = {
  lawref: { label: 'Law reference', icon: <Scale size={13} /> },
  image: { label: 'Image', icon: <ImageIcon size={13} /> },
  table: { label: 'Table', icon: <Table2 size={13} /> },
  icon: { label: 'Icon', icon: <Shapes size={13} /> },
  diagram: { label: 'Diagram', icon: <Shapes size={13} /> },
}

/** Inline editor for the new block types; returns null for the original ones. */
export function RichBlockFields({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  const set = (p: object) => onChange({ ...block, ...p } as Block)
  switch (block.type) {
    case 'lawref':
      return <LawEdit block={block} set={set} />
    case 'image':
      return <ImageEdit block={block} set={set} />
    case 'table':
      return <TableEdit block={block} set={set} />
    case 'icon':
      return <IconEdit block={block} set={set} />
    case 'diagram':
      return <DiagramEdit block={block} set={set} />
    default:
      return null
  }
}

export const isRichBlock = (b: Block) => b.type in RICH_LABELS
