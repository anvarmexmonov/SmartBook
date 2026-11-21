import type { Book } from '../data/types'
import BookCover from './BookCover'

interface Props {
  book: Book
  onOpen: (id: string) => void
  note?: string
}

export default function BookCard({ book, onOpen, note }: Props) {
  return (
    <button onClick={() => onOpen(book.id)} className="group flex w-full flex-col text-left">
      <div className="relative flex items-end justify-center rounded-sm bg-[#EFE9DC] px-[14%] pb-[10%] pt-[12%] transition-colors group-hover:bg-[#EAE2D1]">
        <div className="w-full transition-transform duration-300 ease-out group-hover:-translate-y-1.5 [&>div]:transition-shadow [&>div]:duration-300 group-hover:[&>div]:shadow-book-hover">
          <BookCover book={book} fluid />
        </div>
      </div>
      <div className="mt-3.5">
        <h3 className="font-serif text-[17px] font-semibold leading-snug tracking-[-0.005em] group-hover:text-forest">{book.title}</h3>
        <p className="mt-0.5 text-[13px] text-soft">{book.author}</p>
        <p className="mt-1 text-[12px] text-muted">
          {note ?? `${book.category} · ${book.chapters.length} chapters`}
        </p>
      </div>
    </button>
  )
}
