import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Check, MessageSquareText, Plus, Users } from 'lucide-react'
import BookCover from '../components/BookCover'
import { COURSES, type ChapterStat } from '../data/radar'
import { useStore } from '../store/AppStore'

const MEASURES: { key: keyof Pick<ChapterStat, 'opened' | 'completed' | 'understood'>; label: string; hint: string; color: string }[] = [
  { key: 'opened', label: 'Opened', hint: 'opened the chapter at least once', color: '#C9D6C9' },
  { key: 'completed', label: 'Completed reading', hint: 'scrolled to the end or marked it as read', color: '#6F927A' },
  { key: 'understood', label: 'Demonstrated understanding', hint: 'scored 70% or more on the chapter exercises', color: '#23432F' },
]

export default function Radar() {
  const { getBook, plan, togglePlan } = useStore()
  const navigate = useNavigate()
  const [courseId, setCourseId] = useState(COURSES[0].id)
  const course = COURSES.find(c => c.id === courseId)!
  const book = getBook(course.bookId)


  const avg = (k: keyof ChapterStat) => Math.round(course.stats.reduce((a, s) => a + (s[k] as number), 0) / course.stats.length)
  const totalAi = course.stats.reduce((a, s) => a + s.aiRequests, 0)
  const weakest = [...course.stats].filter(s => s.opened >= 60).sort((a, b) => b.completed - b.understood - (a.completed - a.understood))[0]

  return (
    <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-ink/80 pb-8">
        <div>
          <p className="eyebrow">Learning Radar · week {course.week} of 15</p>
          <h1 className="mt-3 font-serif text-[44px] font-semibold leading-none tracking-[-0.02em]">How your groups are reading</h1>
        </div>
        <span className="demo-tag">Demo cohort data</span>
      </div>

      {/* Courses */}
      <div className="mt-8 grid gap-3 md:grid-cols-3" role="radiogroup" aria-label="Course">
        {COURSES.map(c => {
          const b = getBook(c.bookId)
          const active = c.id === courseId
          return (
            <button
              key={c.id}
              role="radio"
              aria-checked={active}
              onClick={() => setCourseId(c.id)}
              className={`flex items-center gap-4 rounded-md border p-4 text-left transition-colors ${active ? 'border-forest bg-paper shadow-panel' : 'border-line bg-paper/50 hover:border-rule hover:bg-paper'}`}
            >
              {b && <BookCover book={b} size="xs" className="!w-10 shrink-0" />}
              <div className="min-w-0">
                <p className={`font-serif text-[17px] font-semibold ${active ? 'text-forest' : ''}`}>{c.name}</p>
                <p className="text-[12px] text-muted">{c.group}</p>
                <p className="mt-1 flex items-center gap-1 truncate text-[12px] text-soft">
                  <Users size={12} /> {c.students} students · {b?.title}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Headline numbers */}
      <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line lg:grid-cols-4">
        <Headline label="Opened assigned chapters" value={`${avg('opened')}%`} />
        <Headline label="Completed the reading" value={`${avg('completed')}%`} />
        <Headline label="Demonstrated understanding" value={`${avg('understood')}%`} note="≥ 70% on exercises" />
        <Headline label="AI explanation requests" value={totalAi.toLocaleString()} note="this semester" />
      </dl>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1.5fr_1fr]">
        {/* Funnel per chapter */}
        <section>
          <h2 className="font-serif text-[22px] font-semibold">Reading versus understanding, by chapter</h2>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-muted">
            Opening a chapter is not the same as reading it, and reading it is not the same as understanding it. The three bars separate those steps.
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-soft">
            {MEASURES.map(m => (
              <li key={m.key} className="flex items-center gap-1.5" title={m.hint}>
                <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: m.color }} /> {m.label}
              </li>
            ))}
          </ul>
          <div className="mt-6 space-y-5">
            {course.stats.map(s => (
              <div key={s.chapter} className="grid grid-cols-[120px_1fr] items-center gap-4 sm:grid-cols-[150px_1fr]">
                <p className={`text-[13px] ${s === weakest ? 'font-medium text-wine' : 'text-soft'}`}>{s.chapter}</p>
                <div className="space-y-[3px]">
                  {MEASURES.map(m => (
                    <div key={m.key} className="group relative flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-r-[3px] bg-line/60">
                        <div className="h-full rounded-r-[3px] transition-all duration-500" style={{ width: `${s[m.key]}%`, background: m.color }} />
                      </div>
                      <span className="w-9 text-right text-[11px] tabular-nums text-muted">{s[m.key]}%</span>
                      <span className="pointer-events-none absolute -top-7 left-0 z-10 hidden whitespace-nowrap rounded bg-ink px-2 py-1 text-[11px] text-paper group-hover:block">
                        {s[m.key]}% {m.hint}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {weakest && (
            <p className="mt-6 flex items-start gap-2 rounded-sm bg-wine-50 px-3 py-2.5 text-[13px] leading-relaxed text-wine">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              Largest gap: {weakest.chapter} — {weakest.completed}% finished the reading, but only {weakest.understood}% passed the exercises.
            </p>
          )}
        </section>

        {/* Quiz chart */}
        <section>
          <h2 className="font-serif text-[22px] font-semibold">Average exercise score</h2>
          <p className="mt-1 text-[13px] text-muted">Per chapter, students who attempted the exercises.</p>
          <QuizChart stats={course.stats} />
        </section>
      </div>

      <div className="mt-14 grid gap-12 lg:grid-cols-3">
        <section>
          <h2 className="border-b border-line pb-2 font-serif text-[19px] font-semibold">Difficult topics</h2>
          <ul className="divide-y divide-line">
            {course.difficult.map(d => (
              <li key={d.topic} className="py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-serif text-[15px]">{d.topic}</p>
                  <span className={`shrink-0 text-[13px] font-medium tabular-nums ${d.correct < 55 ? 'text-wine' : 'text-soft'}`}>{d.correct}%</span>
                </div>
                <p className="text-[12px] text-muted">§{d.section} · correct answers, {d.attempts} attempts</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="border-b border-line pb-2 font-serif text-[19px] font-semibold">Most explained passages</h2>
          <ul className="divide-y divide-line">
            {course.hotspots.map(h => (
              <li key={h.passage} className="py-3">
                <p className="font-serif text-[15px] italic leading-snug text-soft">{h.passage}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[12px] text-muted">
                  <MessageSquareText size={12} /> {h.requests} AI explanation requests · §{h.section}
                </p>
              </li>
            ))}
          </ul>
          {book && course.bookId === 'civil-law-fundamentals' && (
            <button onClick={() => navigate('/read/civil-law-fundamentals/clf-4#c4-h-3')} className="mt-2 text-[13px] font-medium text-forest hover:underline">
              Open §4.3 in the reader →
            </button>
          )}
        </section>

        <section>
          <h2 className="border-b border-line pb-2 font-serif text-[19px] font-semibold">Suggested teaching actions</h2>
          <ul className="divide-y divide-line">
            {course.actions.map(a => {
              const added = plan.includes(a.id)
              return (
                <li key={a.id} className="py-3">
                  <p className="font-serif text-[15px] leading-snug">{a.text}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted">{a.reason}</p>
                  <button
                    onClick={() => togglePlan(a.id)}
                    className={`mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium ${added ? 'text-forest' : 'text-soft hover:text-ink'}`}
                    aria-pressed={added}
                  >
                    {added ? <Check size={13} /> : <Plus size={13} />} {added ? 'In your lesson plan' : 'Add to lesson plan'}
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-[11px] text-muted">Suggestions are generated from fixed rules on the demo data, not by an AI model.</p>
        </section>
      </div>
    </div>
  )
}

function Headline({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-paper px-5 py-5">
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className="mt-1 font-serif text-[34px] font-semibold leading-none tabular-nums">{value}</dd>
      {note && <p className="mt-1.5 text-[11px] text-muted">{note}</p>}
    </div>
  )
}

function QuizChart({ stats }: { stats: ChapterStat[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 420
  const H = 220
  const pad = { l: 30, r: 8, t: 16, b: 40 }
  const innerW = W - pad.l - pad.r
  const innerH = H - pad.t - pad.b
  const step = innerW / stats.length
  const barW = Math.min(36, step * 0.5)
  const y = (v: number) => pad.t + innerH - (v / 100) * innerH

  return (
    <div className="relative mt-6">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Average exercise score by chapter">
        {[0, 50, 70, 100].map(t => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={t === 70 ? '#B9AE96' : '#E4DDCD'} strokeDasharray={t === 70 ? '3 3' : undefined} />
            <text x={pad.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="#77705F" fontFamily="Inter, sans-serif">
              {t}
            </text>
          </g>
        ))}
        <text x={W - pad.r} y={y(70) - 4} textAnchor="end" fontSize="9.5" fill="#77705F" fontFamily="Inter, sans-serif">
          pass line 70%
        </text>
        {stats.map((s, i) => {
          const cx = pad.l + step * i + step / 2
          const top = y(s.quizAvg)
          const h = pad.t + innerH - top
          return (
            <g key={s.chapter} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={cx - step / 2} y={pad.t} width={step} height={innerH} fill="transparent" />
              <path
                d={`M${cx - barW / 2},${pad.t + innerH} V${top + 4} q0,-4 4,-4 H${cx + barW / 2 - 4} q4,0 4,4 V${pad.t + innerH} Z`}
                fill={s.quizAvg < 70 ? '#7A2431' : '#23432F'}
                opacity={hover === null || hover === i ? 1 : 0.45}
                style={{ transition: 'opacity .15s' }}
              />
              <text x={cx} y={H - pad.b + 16} textAnchor="middle" fontSize="10" fill="#46423B" fontFamily="Inter, sans-serif">
                {s.chapter.split(' ').slice(0, 2).join(' ')}
              </text>
              {h > 0 && hover === i && (
                <text x={cx} y={top - 6} textAnchor="middle" fontSize="11" fontWeight={600} fill="#1F1D1A" fontFamily="Inter, sans-serif">
                  {s.quizAvg}%
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <div className="mt-1 flex flex-wrap gap-4 text-[12px] text-soft">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[2px] bg-forest" /> At or above pass line</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[2px] bg-wine" /> Below pass line</span>
      </div>
      <table className="sr-only">
        <caption>Average exercise score by chapter</caption>
        <tbody>
          {stats.map(s => (
            <tr key={s.chapter}>
              <th>{s.chapter}</th>
              <td>{s.quizAvg}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
