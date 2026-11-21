import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MutableRefObject, type ReactNode, type RefObject } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import BookCover, { PALETTES } from './BookCover'
import { useStore, type ReaderTheme } from '../store/AppStore'
import type { Book } from '../data/types'

/**
 * Physical book transition between the library and the reader.
 *
 * Phases: closed → opening → reading → closing → closed
 *
 * A fixed overlay lives above the router so it survives route changes. Opening animates a
 * CSS-3D book from the clicked cover to the centre, swings the hardcover open around the
 * spine, turns a few pages and zooms into the spread before the reader is revealed.
 * Closing plays the same sequence in reverse and lands on the book's place in the library.
 */

export type BookPhase = 'closed' | 'opening' | 'reading' | 'closing'

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

interface Origin {
  bookId: string
  returnUrl: string
  scrollY: number
  idx: number | null
  rect: Rect | null
}

interface Geometry {
  vw: number
  vh: number
  W: number
  H: number
  T: number
  N: number
  cx: number
  cy: number
  Z: number
  k: number
}

interface Scene {
  id: number
  mode: 'open' | 'close'
  book: Book
  chapterNo: number
  chapterTitle: string
  g: Geometry
  from: Rect | null
  readUrl: string
  /** Close triggered from the reader UI: we still need to navigate back. */
  navigateBack: boolean
}

interface Ctx {
  phase: BookPhase
  openBook: (opts: { bookId: string; chapterId?: string; hash?: string; from?: Element | null }) => void
  closeBook: (bookId: string, chapterId?: string) => void
}

const BookTransitionContext = createContext<Ctx | null>(null)

export function useBookTransition() {
  const ctx = useContext(BookTransitionContext)
  if (!ctx) throw new Error('useBookTransition must be used inside BookTransitionProvider')
  return ctx
}

const ORIGIN_KEY = 'smartbook:origin'
const READER_BG: Record<ReaderTheme, string> = { paper: '#FCFAF5', sepia: '#F4EAD7', night: '#1B1C1E' }
const LIBRARY_BG = '#F7F3EA'
const PAPER = '#FBF8F1'

const reducedMotion = () =>
  typeof window === 'undefined' ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
  typeof document.body.animate !== 'function'

const frame = () => new Promise<void>(r => requestAnimationFrame(() => r()))
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))
const historyIdx = (): number | null => {
  const idx = (window.history.state as { idx?: number } | null)?.idx
  return typeof idx === 'number' ? idx : null
}

function geometry(): Geometry {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const mobile = vw < 640
  const W = Math.round(Math.min(mobile ? vw * 0.42 : 270, (vh * 0.64) / 1.5))
  const H = Math.round(W * 1.5)
  return {
    vw,
    vh,
    W,
    H,
    T: mobile ? 8 : 14,
    N: mobile ? 1 : 3,
    cx: vw / 2,
    cy: vh / 2,
    Z: Math.max(vw / (2 * W), vh / H) * 1.12,
    k: mobile ? 0.8 : 1,
  }
}

const toRect = (r: DOMRect): Rect => ({ x: r.left, y: r.top, w: r.width, h: r.height })

function visibleCovers(bookId: string) {
  return Array.from(document.querySelectorAll<HTMLElement>(`[data-book-cover="${CSS.escape(bookId)}"]`)).filter(el => {
    if (el.closest('[data-book-stage]')) return false
    const r = el.getBoundingClientRect()
    return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth
  })
}

function nearest(els: HTMLElement[], to: Rect | null) {
  if (!els.length) return null
  if (!to) return els[0]
  const d = (el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    return Math.hypot(r.left + r.width / 2 - (to.x + to.w / 2), r.top + r.height / 2 - (to.y + to.h / 2))
  }
  return [...els].sort((a, b) => d(a) - d(b))[0]
}

/** Find the cover the user clicked: the closest matching cover around the clicked element. */
function findSource(bookId: string, from?: Element | null): HTMLElement | null {
  const sel = `[data-book-cover="${CSS.escape(bookId)}"]`
  if (from) {
    const self = from.closest<HTMLElement>(sel)
    if (self) return self
    let node: Element | null = from
    for (let i = 0; i < 6 && node; i++) {
      const hit = node.querySelector<HTMLElement>(sel)
      if (hit && !hit.closest('[data-book-stage]')) return hit
      node = node.parentElement
    }
  }
  const fromRect = from ? toRect(from.getBoundingClientRect()) : null
  return nearest(visibleCovers(bookId), fromRect)
}

const tf = (x: number, y: number, sx = 1, sy = sx) => `translate3d(${x}px, ${y}px, 0px) scale(${sx}, ${sy})`

export function BookTransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { getBook, reader } = useStore()
  const [scene, setScene] = useState<Scene | null>(null)
  const [phase, setPhase] = useState<BookPhase>(() => (window.location.pathname.startsWith('/read/') ? 'reading' : 'closed'))
  const busy = useRef(false)
  const sceneId = useRef(0)
  const prevPath = useRef(location.pathname + location.search)
  const waiters = useRef<{ test: (p: string) => boolean; resolve: () => void }[]>([])
  const hidden = useRef<HTMLElement | null>(null)

  const readOrigin = (): Origin | null => {
    try {
      return JSON.parse(sessionStorage.getItem(ORIGIN_KEY) ?? 'null')
    } catch {
      return null
    }
  }
  const writeOrigin = (o: Origin) => {
    try {
      sessionStorage.setItem(ORIGIN_KEY, JSON.stringify(o))
    } catch {
      /* ignore */
    }
  }

  const waitForPath = (test: (p: string) => boolean, timeout = 900) =>
    new Promise<void>(resolve => {
      if (test(window.location.pathname)) return resolve()
      waiters.current.push({ test, resolve })
      setTimeout(resolve, timeout)
    })

  const unhide = () => {
    if (hidden.current) hidden.current.style.visibility = ''
    hidden.current = null
  }

  const chapterInfo = (book: Book, chapterId?: string) => {
    const idx = Math.max(0, book.chapters.findIndex(c => c.id === chapterId))
    return { chapterNo: idx + 1, chapterTitle: book.chapters[idx]?.title ?? '' }
  }

  /* ---------- open ---------- */
  const openBook: Ctx['openBook'] = useCallback(
    ({ bookId, chapterId, hash, from }) => {
      // ignore repeated clicks: one book at a time, and never open a book from inside the reader
      if (busy.current || window.location.pathname.startsWith('/read/')) return
      const book = getBook(bookId)
      if (!book) return
      const target = chapterId ?? book.chapters.find(c => c.blocks)?.id ?? book.chapters[0]?.id ?? ''
      const readUrl = `/read/${book.id}/${target}${hash ? `#${hash}` : ''}`

      const params = new URLSearchParams(window.location.search)
      params.delete('book')
      const qs = params.toString()
      const returnUrl = window.location.pathname + (qs ? `?${qs}` : '')
      const drawerOpen = new URLSearchParams(window.location.search).has('book')

      const source = findSource(book.id, from)
      const rect = source ? toRect(source.getBoundingClientRect()) : null
      writeOrigin({ bookId: book.id, returnUrl, scrollY: window.scrollY, idx: historyIdx(), rect })

      const go = () => {
        // drop the details drawer from history so Back / Close returns to the shelf itself
        if (drawerOpen) navigate(returnUrl, { replace: true })
        navigate(readUrl)
      }

      if (reducedMotion()) {
        busy.current = true
        go()
        setPhase('reading')
        requestAnimationFrame(() => (busy.current = false))
        return
      }

      busy.current = true
      setPhase('opening')
      if (source) {
        source.style.visibility = 'hidden'
        hidden.current = source
      }
      setScene({
        id: ++sceneId.current,
        mode: 'open',
        book,
        ...chapterInfo(book, target),
        g: geometry(),
        from: rect,
        readUrl,
        navigateBack: false,
      })
      // the actual navigation happens from the animation runner via `go`
      pendingGo.current = go
    },
    [getBook, navigate],
  )
  const pendingGo = useRef<(() => void) | null>(null)

  /* ---------- close ---------- */
  const startClose = (bookId: string, chapterId: string | undefined, navigateBack: boolean) => {
    const book = getBook(bookId)
    if (!book) return false
    busy.current = true
    setPhase('closing')
    setScene({
      id: ++sceneId.current,
      mode: 'close',
      book,
      ...chapterInfo(book, chapterId),
      g: geometry(),
      from: null,
      readUrl: '',
      navigateBack,
    })
    return true
  }

  const navigateOut = (bookId: string) => {
    const o = readOrigin()
    const idx = historyIdx()
    if (o && o.bookId === bookId && o.idx !== null && idx === o.idx + 1) navigate(-1)
    else navigate(o && o.bookId === bookId ? o.returnUrl : '/')
  }

  const restoreScroll = (bookId: string) => {
    const o = readOrigin()
    if (o && o.bookId === bookId) window.scrollTo(0, o.scrollY)
  }

  const closeBook: Ctx['closeBook'] = useCallback(
    (bookId, chapterId) => {
      if (busy.current) return
      if (reducedMotion() || !getBook(bookId)) {
        navigateOut(bookId)
        setPhase('closed')
        requestAnimationFrame(() => requestAnimationFrame(() => restoreScroll(bookId)))
        return
      }
      startClose(bookId, chapterId, true)
    },
    [getBook],
  )

  /* ---------- route watcher: resolves waiters, animates Browser Back out of the reader ---------- */
  useLayoutEffect(() => {
    const prev = prevPath.current
    const cur = location.pathname
    prevPath.current = location.pathname + location.search
    waiters.current = waiters.current.filter(w => {
      if (w.test(cur)) {
        w.resolve()
        return false
      }
      return true
    })
    if (busy.current) return
    const leftReader = prev.startsWith('/read/') && !cur.startsWith('/read/')
    if (cur.startsWith('/read/')) setPhase('reading')
    else if (leftReader) {
      const isPreview = prev.includes('preview=1')
      const [, , bookId, chapterId] = prev.split(/[?#]/)[0].split('/')
      if (isPreview || reducedMotion() || !startClose(bookId, chapterId, false)) setPhase('closed')
    }
  }, [location])

  /* ---------- animation runner ---------- */
  const stageRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<HTMLDivElement>(null)
  const coverRef = useRef<HTMLDivElement>(null)
  const coverShadeRef = useRef<HTMLDivElement>(null)
  const leftShadowRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const shadeRefs = useRef<(HTMLDivElement | null)[]>([])

  useLayoutEffect(() => {
    if (!scene) return
    const s = scene
    const { W, H, T, N, cx, cy, Z, k } = s.g
    const anims: Animation[] = []
    const A = (el: Element | null, kf: Keyframe[], o: KeyframeAnimationOptions) => {
      if (!el) return
      anims.push(el.animate(kf, { fill: 'both', ...o }))
    }
    const all = () => Promise.all(anims.map(a => a.finished)).then(() => undefined)
    const closedC = tf(cx - W / 2, cy - H / 2)
    const openC = tf(cx, cy - H / 2)
    const zoomed = tf(cx, cy - (Z * H) / 2, Z)
    const coverZ = T + 2
    const pageStartZ = (i: number) => T + 0.5 + (N - i) * 0.3
    const pageOpenZ = (i: number) => T + 3 + i
    const coverT = (deg: number) => `translateZ(${coverZ}px) rotateY(${deg}deg)`
    const pageT = (z: number, deg: number) => `translateZ(${z}px) rotateY(${deg}deg)`
    const shadeKf: Keyframe[] = [{ opacity: 0 }, { opacity: 0.32, offset: 0.5 }, { opacity: 0 }]
    let cancelled = false

    const finish = () => {
      // hide first so a cancelled animation can never flash its initial frame
      if (stageRef.current) stageRef.current.style.visibility = 'hidden'
      unhide()
      setScene(cur => (cur?.id === s.id ? null : cur))
      busy.current = false
    }

    const runOpen = async () => {
      const D = 1100 * k
      const start = s.from ? tf(s.from.x, s.from.y, s.from.w / W, s.from.h / H) : tf(cx - W * 0.3, cy - H * 0.3, 0.6)
      A(bookRef.current, [
        { transform: start, offset: 0, easing: 'cubic-bezier(.22,.8,.3,1)' },
        { transform: closedC, offset: 0.29, easing: 'cubic-bezier(.45,.05,.3,1)' },
        { transform: openC, offset: 0.72 },
        { transform: openC, offset: 0.8, easing: 'cubic-bezier(.6,0,.8,.35)' },
        { transform: zoomed, offset: 1 },
      ], { duration: D })
      A(backdropRef.current, [{ opacity: 0 }, { opacity: 0.94 }], { duration: 0.3 * D, easing: 'ease-out' })
      A(coverRef.current, [{ transform: coverT(0) }, { transform: coverT(-180) }], { delay: 0.27 * D, duration: 0.47 * D, easing: 'cubic-bezier(.4,.1,.25,1)' })
      A(coverShadeRef.current, shadeKf, { delay: 0.27 * D, duration: 0.47 * D })
      A(leftShadowRef.current, [{ opacity: 0 }, { opacity: 1 }], { delay: 0.5 * D, duration: 0.26 * D })
      for (let i = 0; i < N; i++) {
        const o = { delay: (0.37 + i * 0.065) * D, duration: 0.4 * D }
        A(pageRefs.current[i], [{ transform: pageT(pageStartZ(i), 0) }, { transform: pageT(pageOpenZ(i), -180) }], { ...o, easing: 'cubic-bezier(.35,.1,.25,1)' })
        A(shadeRefs.current[i], shadeKf, o)
      }
      A(fillRef.current, [{ opacity: 0 }, { opacity: 1 }], { delay: 0.82 * D, duration: 0.18 * D, easing: 'ease-in' })
      await all()
      if (cancelled) return
      pendingGo.current?.()
      pendingGo.current = null
      await waitForPath(p => p.startsWith('/read/'))
      await frame()
      await frame()
      unhide()
      if (stageRef.current) await stageRef.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: 'ease-out', fill: 'forwards' }).finished
      // the student may have pressed Back while the overlay was fading out
      setPhase(window.location.pathname.startsWith('/read/') ? 'reading' : 'closed')
    }

    const runClose = async () => {
      if (s.navigateBack) {
        navigateOut(s.book.id)
        await waitForPath(p => !p.startsWith('/read/'))
      }
      await frame()
      await frame()
      restoreScroll(s.book.id)
      await frame()
      if (cancelled) return
      const o = readOrigin()
      const target = nearest(visibleCovers(s.book.id), o && o.bookId === s.book.id ? o.rect : null)
      const tr = target ? toRect(target.getBoundingClientRect()) : null
      if (target) {
        target.style.visibility = 'hidden'
        hidden.current = target
      }
      const end = tr ? tf(tr.x, tr.y, tr.w / W, tr.h / H) : tf(cx - W * 0.25, cy - H * 0.25, 0.5)
      const D = 1200 * k
      A(fillRef.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 0.22 * D, easing: 'ease-out' })
      A(bookRef.current, [
        { transform: zoomed, offset: 0, easing: 'cubic-bezier(.2,.7,.3,1)' },
        { transform: openC, offset: 0.22 },
        { transform: openC, offset: 0.34, easing: 'cubic-bezier(.45,.05,.3,1)' },
        { transform: closedC, offset: 0.72, easing: 'cubic-bezier(.4,0,.2,1)' },
        { transform: end, offset: 1 },
      ], { duration: D })
      for (let i = N - 1; i >= 0; i--) {
        const opts = { delay: (0.2 + (N - 1 - i) * 0.06) * D, duration: 0.34 * D }
        A(pageRefs.current[i], [{ transform: pageT(pageOpenZ(i), -180) }, { transform: pageT(pageStartZ(i), 0) }], { ...opts, easing: 'cubic-bezier(.4,.1,.3,1)' })
        A(shadeRefs.current[i], shadeKf, opts)
      }
      const cd = (0.2 + N * 0.06 + 0.05) * D
      A(coverRef.current, [{ transform: coverT(-180) }, { transform: coverT(0) }], { delay: cd, duration: 0.72 * D - cd, easing: 'cubic-bezier(.45,.05,.3,1)' })
      A(coverShadeRef.current, shadeKf, { delay: cd, duration: 0.72 * D - cd })
      A(leftShadowRef.current, [{ opacity: 1 }, { opacity: 0 }], { delay: cd, duration: (0.72 * D - cd) * 0.5 })
      A(backdropRef.current, [{ opacity: 0.94 }, { opacity: 0 }], { delay: 0.7 * D, duration: 0.3 * D, easing: 'ease-in-out' })
      if (!tr) A(stageRef.current, [{ opacity: 1 }, { opacity: 0 }], { delay: 0.75 * D, duration: 0.25 * D })
      await all()
      setPhase('closed')
    }

    // safety net: whatever happens, never leave the overlay on screen
    const safety = window.setTimeout(() => {
      if (pendingGo.current) {
        pendingGo.current()
        pendingGo.current = null
      }
      finish()
    }, 4000)

    ;(s.mode === 'open' ? runOpen() : runClose())
      .catch(() => {
        if (pendingGo.current) {
          pendingGo.current()
          pendingGo.current = null
        }
      })
      .finally(() => {
        window.clearTimeout(safety)
        if (!cancelled) finish()
      })

    return () => {
      cancelled = true
      window.clearTimeout(safety)
    }
  }, [scene?.id])

  // block scrolling underneath while the book is animating
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const stop = (e: Event) => e.preventDefault()
    el.addEventListener('wheel', stop, { passive: false })
    el.addEventListener('touchmove', stop, { passive: false })
    return () => {
      el.removeEventListener('wheel', stop)
      el.removeEventListener('touchmove', stop)
    }
  }, [scene?.id])

  const value: Ctx = { phase, openBook, closeBook }

  return (
    <BookTransitionContext.Provider value={value}>
      {children}
      {scene && (
        <BookStage
          key={scene.id}
          scene={scene}
          readerBg={READER_BG[reader.theme]}
          refs={{ stageRef, backdropRef, bookRef, coverRef, coverShadeRef, leftShadowRef, fillRef, pageRefs, shadeRefs }}
        />
      )}
    </BookTransitionContext.Provider>
  )
}

/* ================= 3D book ================= */

interface StageRefs {
  stageRef: RefObject<HTMLDivElement>
  backdropRef: RefObject<HTMLDivElement>
  bookRef: RefObject<HTMLDivElement>
  coverRef: RefObject<HTMLDivElement>
  coverShadeRef: RefObject<HTMLDivElement>
  leftShadowRef: RefObject<HTMLDivElement>
  fillRef: RefObject<HTMLDivElement>
  pageRefs: MutableRefObject<(HTMLDivElement | null)[]>
  shadeRefs: MutableRefObject<(HTMLDivElement | null)[]>
}

function BookStage({ scene, readerBg, refs }: { scene: Scene; readerBg: string; refs: StageRefs }) {
  const { book, g, mode } = scene
  const { W, H, T, N, cx, cy, Z } = g
  const u = W / 260
  const pal = PALETTES[book.cover.palette]
  const open = mode === 'close'
  const coverZ = T + 2
  const initialBook = open ? tf(cx, cy - (Z * H) / 2, Z) : scene.from ? tf(scene.from.x, scene.from.y, scene.from.w / W, scene.from.h / H) : tf(cx - W / 2, cy - H / 2)

  const abs: CSSProperties = { position: 'absolute' }
  const face = (back = false): CSSProperties => ({
    ...abs,
    inset: 0,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    transform: back ? 'rotateY(180deg)' : undefined,
    overflow: 'hidden',
  })
  const rightPaper: CSSProperties = { background: `linear-gradient(90deg, rgba(60,45,25,.16), rgba(60,45,25,0) 11%), ${PAPER}` }
  const leftPaper: CSSProperties = { background: `linear-gradient(270deg, rgba(60,45,25,.16), rgba(60,45,25,0) 11%), ${PAPER}` }
  const pageBox: CSSProperties = { ...abs, left: 1, top: 4, width: W - 7, height: H - 8, transformStyle: 'preserve-3d', transformOrigin: '0 50%' }
  const edgeStripes = 'repeating-linear-gradient(90deg, #e9e1cf 0 1px, #fbf8f0 1px 3px)'
  const edgeStripesV = 'repeating-linear-gradient(180deg, #e9e1cf 0 1px, #fbf8f0 1px 3px)'
  // a filled, blurred slab (not a box-shadow) so no unshaded hole shows through the open half
  const groundShadow: CSSProperties = { ...abs, top: 0, width: W, height: H, transform: `translateZ(-2px) translateY(${10 * u}px) scale(.97)`, background: 'rgba(40,28,14,.32)', filter: `blur(${14 * u}px)`, borderRadius: 4 }
  const shade = (i: number): CSSProperties => ({ ...abs, inset: 0, background: 'linear-gradient(90deg, rgba(30,20,10,.55), rgba(30,20,10,.1))', opacity: 0, pointerEvents: 'none', zIndex: 2 + i })

  return (
    <div
      ref={refs.stageRef}
      data-book-stage
      aria-hidden
      style={{ position: 'fixed', inset: 0, zIndex: 100, perspective: `${Math.round(2.2 * Math.max(g.vw, g.vh))}px`, perspectiveOrigin: '50% 42%', overflow: 'hidden', cursor: 'progress' }}
    >
      <div ref={refs.backdropRef} style={{ ...abs, inset: 0, background: LIBRARY_BG, opacity: open ? 0.94 : 0 }} />

      <div ref={refs.bookRef} style={{ ...abs, left: 0, top: 0, width: W, height: H, transformOrigin: '0 0', transformStyle: 'preserve-3d', transform: initialBook, willChange: 'transform' }}>
        {/* ground shadows */}
        <div style={{ ...groundShadow, left: 0 }} />
        <div ref={refs.leftShadowRef} style={{ ...groundShadow, left: -W, opacity: open ? 1 : 0 }} />

        {/* back board */}
        <div style={{ ...abs, inset: 0, background: pal.deep, borderRadius: '2px 4px 4px 2px' }} />

        {/* page block: edges and the page that will face the reader */}
        <div style={{ ...abs, left: W - 6, top: 4, width: T, height: H - 8, transformOrigin: '0 50%', transform: 'rotateY(-90deg)', background: edgeStripes }} />
        <div style={{ ...abs, left: 1, top: H - 4, width: W - 7, height: T, transformOrigin: '50% 0', transform: 'rotateX(90deg)', background: edgeStripesV }} />
        <div style={{ ...abs, left: 1, top: 4 - T, width: W - 7, height: T, transformOrigin: '50% 100%', transform: 'rotateX(-90deg)', background: edgeStripesV }} />
        <div style={{ ...abs, left: 1, top: 4, width: W - 7, height: H - 8, transform: `translateZ(${T}px)`, ...rightPaper }}>
          <ChapterOpening u={u} no={scene.chapterNo} title={scene.chapterTitle} />
        </div>

        {/* turning leaves */}
        {Array.from({ length: N }, (_, i) => (
          <div
            key={i}
            ref={el => (refs.pageRefs.current[i] = el)}
            style={{ ...pageBox, transform: open ? `translateZ(${T + 3 + i}px) rotateY(-180deg)` : `translateZ(${T + 0.5 + (N - i) * 0.3}px) rotateY(0deg)` }}
          >
            <div style={{ ...face(), ...rightPaper }}>
              <LeafFront i={i} u={u} book={book} />
              <div ref={el => (refs.shadeRefs.current[i] = el)} style={shade(i)} />
            </div>
            <div style={{ ...face(true), ...leftPaper }}>{i === N - 1 ? <TitlePage u={u} book={book} /> : <Lines u={u} n={14} faint />}</div>
          </div>
        ))}

        {/* front hardcover */}
        <div
          ref={refs.coverRef}
          style={{ ...abs, inset: 0, transformStyle: 'preserve-3d', transformOrigin: '0 50%', transform: `translateZ(${coverZ}px) rotateY(${open ? -180 : 0}deg)` }}
        >
          <div style={face()}>
            <BookCover book={{ ...book, id: undefined }} fluid className="!h-full !shadow-none" />
            <div ref={refs.coverShadeRef} style={{ ...shade(0), background: 'linear-gradient(90deg, rgba(0,0,0,.5), rgba(0,0,0,.15))' }} />
          </div>
          <div style={{ ...face(true), borderRadius: '4px 2px 2px 4px', background: pal.deep, padding: 6 * u }}>
            <Endpaper u={u} accent={pal.accent} />
          </div>
        </div>
      </div>

      <div ref={refs.fillRef} style={{ ...abs, inset: 0, background: readerBg, opacity: open ? 1 : 0 }} />
    </div>
  )
}

const LINE_WIDTHS = [100, 97, 99, 94, 100, 98, 62, 0, 100, 96, 99, 100, 93, 98, 71, 0, 100, 95, 99, 97, 84]

function Lines({ u, n, faint, from = 0 }: { u: number; n: number; faint?: boolean; from?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6.2 * u }}>
      {Array.from({ length: n }, (_, i) => {
        const w = LINE_WIDTHS[(i + from) % LINE_WIDTHS.length]
        return <div key={i} style={{ height: 2.6 * u, width: `${w}%`, background: w ? `rgba(70,58,42,${faint ? 0.1 : 0.2})` : 'transparent', borderRadius: 1 }} />
      })}
    </div>
  )
}

function ChapterOpening({ u, no, title }: { u: number; no: number; title: string }) {
  return (
    <div style={{ padding: `${30 * u}px ${24 * u}px ${20 * u}px ${28 * u}px` }}>
      <p style={{ font: `600 ${7 * u}px Inter, sans-serif`, letterSpacing: '.2em', color: '#7a7363', textTransform: 'uppercase' }}>Chapter {no}</p>
      <p style={{ marginTop: 6 * u, font: `600 ${17 * u}px/1.1 "Source Serif 4", Georgia, serif`, color: '#22201c' }}>{title}</p>
      <div style={{ margin: `${12 * u}px 0 ${14 * u}px`, height: 1, background: '#e4ddcd' }} />
      <Lines u={u} n={20} />
    </div>
  )
}

function LeafFront({ i, u, book }: { i: number; u: number; book: Book }) {
  if (i === 0)
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30 * u, textAlign: 'center' }}>
        <p style={{ font: `italic 500 ${12 * u}px/1.3 "Source Serif 4", Georgia, serif`, color: '#48433b' }}>{book.title}</p>
      </div>
    )
  return (
    <div style={{ padding: `${30 * u}px ${24 * u}px ${20 * u}px ${28 * u}px` }}>
      {i === 2 && <p style={{ marginBottom: 12 * u, font: `600 ${11 * u}px "Source Serif 4", Georgia, serif`, color: '#22201c' }}>Contents</p>}
      <Lines u={u} n={i === 2 ? 16 : 20} from={i * 5} faint={i === 2} />
    </div>
  )
}

function TitlePage({ u, book }: { u: number; book: Book }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: `${40 * u}px ${24 * u}px ${24 * u}px` }}>
      <p style={{ font: `600 ${6.5 * u}px Inter, sans-serif`, letterSpacing: '.2em', color: '#7a7363', textTransform: 'uppercase' }}>{book.category}</p>
      <p style={{ marginTop: 16 * u, font: `600 ${18 * u}px/1.12 "Source Serif 4", Georgia, serif`, color: '#22201c' }}>{book.title}</p>
      {book.subtitle && <p style={{ marginTop: 6 * u, font: `italic ${9.5 * u}px/1.3 "Source Serif 4", Georgia, serif`, color: '#48433b' }}>{book.subtitle}</p>}
      <div style={{ margin: `${14 * u}px 0`, height: 1, width: 40 * u, background: '#b08d57' }} />
      <p style={{ font: `500 ${8.5 * u}px Inter, sans-serif`, color: '#48433b' }}>{book.author}</p>
      <p style={{ marginTop: 'auto', font: `500 ${6.5 * u}px Inter, sans-serif`, letterSpacing: '.14em', color: '#7a7363', textTransform: 'uppercase' }}>SmartBook · Tashkent · {book.year}</p>
    </div>
  )
}

function Endpaper({ u, accent }: { u: number; accent: string }) {
  return (
    <div
      style={{
        height: '100%',
        borderRadius: 2,
        background: `radial-gradient(${accent}33 ${1.1 * u}px, transparent ${1.3 * u}px) 0 0 / ${9 * u}px ${9 * u}px, radial-gradient(${accent}22 ${1.1 * u}px, transparent ${1.3 * u}px) ${4.5 * u}px ${4.5 * u}px / ${9 * u}px ${9 * u}px, #EFE7D5`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ border: '1px solid #b9ab8c', background: PAPER, padding: `${8 * u}px ${12 * u}px`, textAlign: 'center' }}>
        <p style={{ font: `italic ${8 * u}px "Source Serif 4", Georgia, serif`, color: '#7a7363' }}>Ex libris</p>
        <p style={{ marginTop: 2 * u, font: `600 ${9 * u}px "Source Serif 4", Georgia, serif`, color: '#22201c' }}>SmartBook Library</p>
      </div>
    </div>
  )
}
