export type Category =
  | 'Civil Law'
  | 'Criminal Law'
  | 'Constitutional Law'
  | 'Business Law'
  | 'International Law'
  | 'Legal Skills'

export const CATEGORIES: Category[] = [
  'Civil Law',
  'Criminal Law',
  'Constitutional Law',
  'Business Law',
  'International Law',
  'Legal Skills',
]

export type CoverPalette = 'forest' | 'wine' | 'navy' | 'ochre' | 'slate' | 'linen' | 'teal' | 'plum'
export type CoverMotif = 'frame' | 'band' | 'column' | 'grid' | 'seal' | 'rule'

export interface CoverStyle {
  palette: CoverPalette
  motif: CoverMotif
}

export type Block =
  | { id: string; type: 'h2'; text: string }
  | { id: string; type: 'h3'; text: string }
  | { id: string; type: 'p'; text: string }
  | { id: string; type: 'list'; items: string[] }
  | { id: string; type: 'quote'; text: string; source?: string }
  | { id: string; type: 'note'; text: string }
  | {
      id: string
      type: 'lex'
      refId: string
      act: string
      article: string
      title: string
      excerpt: string
    }
  | { id: string; type: 'figure'; figure: 'formation' | 'essentials'; caption: string }
  | {
      id: string
      type: 'quiz'
      question: string
      options: string[]
      correct: number
      explanation: string
    }
  | { id: string; type: 'case'; title: string; facts: string; question: string; analysis: string }
  /** Law reference entered manually by the author; not retrieved or verified. */
  | { id: string; type: 'lawref'; url: string; title: string; article: string; excerpt: string; explanation: string }
  /** `src` is an `idb:<key>` reference into the local image store. */
  | { id: string; type: 'image'; src: string; caption: string; align: BlockAlign; size: 'small' | 'medium' | 'full'; illustration?: boolean }
  | { id: string; type: 'table'; rows: string[][]; header: boolean; caption: string }
  | { id: string; type: 'icon'; icon: string; size: 'small' | 'medium' | 'large'; color: IconColor; align: BlockAlign; caption: string }
  | { id: string; type: 'diagram'; variant: 'process' | 'timeline' | 'comparison'; title: string; items: { label: string; text: string }[] }

export type BlockAlign = 'left' | 'center' | 'right'
export type IconColor = 'ink' | 'forest' | 'wine' | 'ochre' | 'muted'

export type BlockType = Block['type']

export interface Chapter {
  id: string
  title: string
  minutes: number
  blocks?: Block[]
}

export interface Book {
  id: string
  title: string
  subtitle?: string
  author: string
  authorRole: string
  category: Category
  year: number
  pages: number
  description: string
  chapters: Chapter[]
  cover: CoverStyle
  edition?: string
  ownerId?: string
  status: 'published' | 'draft'
  tags?: string[]
}

export interface LexReference {
  id: string
  act: string
  article: string
  title: string
  currentText: string
  hasNotice: boolean
  notice?: {
    received: string
    summary: string
    proposedText: string
    affectedBook: string
    affectedChapter: string
  }
}
