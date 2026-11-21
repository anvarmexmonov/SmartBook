import type { CSSProperties } from 'react'
import type { Book, CoverPalette, CoverStyle } from '../data/types'

export const PALETTES: Record<CoverPalette, { bg: string; ink: string; accent: string; deep: string; name: string }> = {
  forest: { bg: '#24432F', ink: '#F3EBD8', accent: '#C9A86A', deep: '#18301F', name: 'Forest' },
  wine: { bg: '#6E1F2B', ink: '#F5E9DC', accent: '#D7B27A', deep: '#4D121C', name: 'Burgundy' },
  navy: { bg: '#1E2D45', ink: '#EFE8D8', accent: '#C3A469', deep: '#121D30', name: 'Navy' },
  ochre: { bg: '#C08A35', ink: '#2A1D0E', accent: '#2A1D0E', deep: '#9A6B21', name: 'Ochre' },
  slate: { bg: '#4A5257', ink: '#F1EDE4', accent: '#D9C9A3', deep: '#343A3E', name: 'Slate' },
  linen: { bg: '#E9E0CC', ink: '#2A2620', accent: '#7A2431', deep: '#D3C7AE', name: 'Linen' },
  teal: { bg: '#21514F', ink: '#EEF0E6', accent: '#E2B866', deep: '#163937', name: 'Teal' },
  plum: { bg: '#4B2E43', ink: '#F2E7E1', accent: '#CFA77C', deep: '#331E2D', name: 'Plum' },
}

type Size = 'xs' | 'sm' | 'md' | 'lg'

const SIZES: Record<Size, { w: string; title: string; author: string; pad: string }> = {
  xs: { w: 'w-14', title: 'text-[7px]', author: 'text-[4.5px]', pad: 'p-1.5' },
  sm: { w: 'w-28', title: 'text-[12px]', author: 'text-[7px]', pad: 'p-2.5' },
  md: { w: 'w-40', title: 'text-[16px]', author: 'text-[8.5px]', pad: 'p-3.5' },
  lg: { w: 'w-56', title: 'text-[22px]', author: 'text-[10px]', pad: 'p-5' },
}

interface Props {
  book: Pick<Book, 'title' | 'subtitle' | 'author' | 'category'> & { cover: CoverStyle; id?: string }
  size?: Size
  className?: string
  fluid?: boolean
}

export default function BookCover({ book, size = 'md', className = '', fluid }: Props) {
  const p = PALETTES[book.cover.palette]
  const s = SIZES[size]
  const motif = book.cover.motif
  const short = book.author.replace(/^(Prof\.|Dr\.)\s*/, '')

  return (
    <div
      className={`grain relative aspect-[2/3] overflow-hidden rounded-[2px_4px_4px_2px] shadow-book ${fluid ? 'w-full' : s.w} ${className}`}
      style={{ background: p.bg, color: p.ink, containerType: 'inline-size' }}
      aria-label={`Cover of ${book.title}`}
      data-book-cover={book.id}
      role="img"
    >
      {/* spine hinge */}
      <div
        className="absolute inset-y-0 left-0 w-[7%]"
        style={{
          background: 'linear-gradient(90deg, rgba(0,0,0,.28), rgba(0,0,0,.05) 55%, rgba(255,255,255,.12) 80%, rgba(0,0,0,.08))',
        }}
      />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(115deg, rgba(255,255,255,.08), transparent 40%, rgba(0,0,0,.12))' }} />

      <Motif motif={motif} accent={p.accent} deep={p.deep} />

      {size !== 'xs' && (
      <div className={`relative flex h-full flex-col pl-[12%] ${s.pad}`}>
        <div
          className={`font-sans font-semibold uppercase tracking-[0.18em] opacity-80 ${s.author}`}
          style={fluid ? { fontSize: 'max(5px, 4.6cqw)' } : undefined}
        >
          {book.category}
        </div>
        <div className={`mt-auto ${motif === 'band' ? 'mb-[34%]' : motif === 'seal' ? 'mb-[8%]' : ''}`}>
          <h3
            className={`font-serif font-semibold leading-[1.08] tracking-[-0.01em] ${s.title}`}
            style={{ textWrap: 'balance', ...(fluid ? { fontSize: 'max(8px, 11cqw)' } : {}) } as CSSProperties}
          >
            {book.title}
          </h3>
          {book.subtitle && (
            <p
              className={`mt-[0.5em] font-serif italic leading-snug opacity-80 ${s.author}`}
              style={{ fontSize: fluid ? 'max(5px, 5.4cqw)' : size === 'lg' ? '12px' : size === 'md' ? '9.5px' : '7.5px' }}
            >
              {book.subtitle}
            </p>
          )}
          <div className="my-[7%] h-px w-[30%]" style={{ background: p.accent }} />
          <p
            className={`font-sans font-medium uppercase tracking-[0.12em] opacity-90 ${s.author}`}
            style={fluid ? { fontSize: 'max(5px, 4.6cqw)' } : undefined}
          >
            {short}
          </p>
        </div>
      </div>
      )}
    </div>
  )
}

function Motif({ motif, accent, deep }: { motif: CoverStyle['motif']; accent: string; deep: string }) {
  switch (motif) {
    case 'frame':
      return <div className="absolute inset-[6%] left-[10%] border" style={{ borderColor: accent, opacity: 0.55 }} />
    case 'band':
      return (
        <div className="absolute inset-x-0 bottom-[10%] h-[18%]" style={{ background: deep }}>
          <div className="absolute inset-x-0 top-[12%] h-px" style={{ background: accent, opacity: 0.6 }} />
          <div className="absolute inset-x-0 bottom-[12%] h-px" style={{ background: accent, opacity: 0.6 }} />
        </div>
      )
    case 'column':
      return (
        <svg className="absolute right-[8%] top-[14%] h-[42%] opacity-40" viewBox="0 0 40 100" fill="none" stroke={accent} strokeWidth="1.4">
          <path d="M4 8h32M7 13h26M10 13v74M16 13v74M24 13v74M30 13v74M7 87h26M4 92h32" />
        </svg>
      )
    case 'grid':
      return (
        <div
          className="absolute right-0 top-0 h-[46%] w-[60%] opacity-30"
          style={{
            backgroundImage: `linear-gradient(${accent} 1px, transparent 1px), linear-gradient(90deg, ${accent} 1px, transparent 1px)`,
            backgroundSize: '12% 12%',
            maskImage: 'linear-gradient(225deg, #000 30%, transparent 85%)',
            WebkitMaskImage: 'linear-gradient(225deg, #000 30%, transparent 85%)',
          }}
        />
      )
    case 'seal':
      return (
        <svg className="absolute left-1/2 top-[18%] w-[46%] -translate-x-[40%] opacity-50" viewBox="0 0 100 100" fill="none" stroke={accent}>
          <circle cx="50" cy="50" r="46" strokeWidth="1.2" />
          <circle cx="50" cy="50" r="38" strokeWidth="0.8" strokeDasharray="2 3" />
          <path d="M50 22v56M30 34h40M30 34l-8 18h16zM70 34l-8 18h16z" strokeWidth="1.4" />
        </svg>
      )
    case 'rule':
      return (
        <div className="absolute inset-x-[12%] top-[22%] space-y-[3px] opacity-60">
          <div className="h-[2px]" style={{ background: accent }} />
          <div className="h-px" style={{ background: accent }} />
        </div>
      )
  }
}
