import type { Book } from '../data/types'
import { PALETTES } from './BookCover'

interface Props {
  book: Book
  progress?: number
  onClick: () => void
}

/** A book standing on a shelf. Spine width follows page count; height varies slightly by id. */
export default function BookSpine({ book, progress, onClick }: Props) {
  const p = PALETTES[book.cover.palette]
  const width = Math.round(30 + Math.min(book.pages, 450) / 16)
  const heights = [184, 196, 172, 204, 188, 178]
  const height = heights[book.id.length % heights.length]

  return (
    <button
      onClick={onClick}
      title={`${book.title} — ${book.author}`}
      data-book-cover={book.id}
      className="group relative shrink-0 origin-bottom rounded-t-[2px] text-left transition-transform duration-200 ease-out hover:-translate-y-2 focus-visible:-translate-y-2"
      style={{ width, height }}
    >
      <span
        className="grain absolute inset-0 overflow-hidden rounded-t-[2px]"
        style={{
          background: `linear-gradient(90deg, rgba(0,0,0,.22), rgba(255,255,255,.08) 22%, rgba(255,255,255,0) 45%, rgba(0,0,0,.18)), ${p.bg}`,
          color: p.ink,
          boxShadow: '1px 0 0 rgba(0,0,0,.25), inset -1px 0 0 rgba(255,255,255,.06)',
        }}
      >
        <span className="absolute inset-x-0 top-3 h-px" style={{ background: p.accent, opacity: 0.6 }} />
        <span className="absolute inset-x-0 top-[15px] h-px" style={{ background: p.accent, opacity: 0.35 }} />
        <span
          className="absolute inset-x-0 top-7 bottom-12 flex items-center justify-center font-serif text-[13px] font-semibold leading-tight"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          <span className="line-clamp-2 px-1 text-center">{book.title}</span>
        </span>
        <span className="absolute inset-x-0 bottom-3 text-center font-sans text-[8px] font-semibold uppercase tracking-wider opacity-75">
          {book.author.split(' ').pop()?.slice(0, 4)}
        </span>
        <span className="absolute inset-x-0 bottom-8 h-px" style={{ background: p.accent, opacity: 0.5 }} />
      </span>
      {progress !== undefined && progress > 0 && progress < 100 && (
        <span
          className="absolute -top-0.5 right-1.5 h-5 w-2 rounded-b-[1px] bg-wine shadow-sm"
          title={`${progress}% read`}
          aria-label={`${progress}% read`}
        />
      )}
    </button>
  )
}
