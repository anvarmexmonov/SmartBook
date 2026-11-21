import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, BookOpenText, Check, Eye, EyeOff, GraduationCap, Info, Loader2, PenLine } from 'lucide-react'
import BookCover from '../components/BookCover'
import { Logo } from '../components/Header'
import { BOOKS } from '../data/books'
import { DEMO_ACCOUNTS, EMAIL_RE, destinationFor, useAuth, type Role } from '../store/Auth'

/* ================= shared shell ================= */

const SHELF = ['civil-law-fundamentals', 'constitutional-law-uz', 'criminal-procedure', 'international-human-rights', 'legal-research-writing']

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const books = SHELF.map(id => BOOKS.find(b => b.id === id)!).filter(Boolean)
  return (
    <div className="grid min-h-screen bg-ivory lg:grid-cols-[1fr_minmax(480px,560px)]">
      {/* editorial side */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-line px-12 py-10 lg:flex">
        <Logo />
        <div>
          <p className="eyebrow">Faculty library · Tashkent</p>
          <p className="mt-4 max-w-md font-serif text-[40px] font-semibold leading-[1.08] tracking-[-0.02em]">Every course book of the faculty, on one shelf.</p>
          <p className="mt-4 max-w-md font-serif text-[17px] leading-relaxed text-soft">
            Students read, practise and ask the tutor. Professors write, publish and see where their groups struggle.
          </p>
        </div>
        <div className="relative w-fit pb-5">
          <div className="flex items-end gap-4 px-6">
            {books.map((b, i) => (
              <div key={b.id} className="animate-fadeUp" style={{ animationDelay: `${i * 70}ms` }}>
                <BookCover book={{ ...b, id: undefined }} size={i === 1 ? 'md' : 'sm'} />
              </div>
            ))}
          </div>
          <div className="shelf-board absolute inset-x-0 bottom-0 h-5 rounded-[2px]" />
        </div>
      </aside>

      {/* form side */}
      <main className="flex flex-col px-5 py-8 sm:px-10 lg:px-14 lg:py-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          <h1 className="font-serif text-[34px] font-semibold leading-tight tracking-[-0.015em]">{title}</h1>
          <p className="mt-2 text-[14px] text-soft">{subtitle}</p>
          <div className="mt-8 animate-fadeIn">{children}</div>
        </div>
        <p className="mx-auto max-w-[400px] text-center text-[11px] leading-relaxed text-muted">
          LexHackathon prototype. Accounts are kept on the demo SmartBook server, which is not production-grade — please don’t use a real password.
        </p>
      </main>
    </div>
  )
}

function TextField({
  label,
  error,
  type = 'text',
  value,
  onChange,
  autoComplete,
  hint,
  autoFocus,
}: {
  label: string
  error?: string
  type?: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  hint?: string
  autoFocus?: boolean
}) {
  const id = useId()
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
          className={`field h-11 ${isPassword ? 'pr-10' : ''} ${error ? '!border-wine/60 focus:!ring-wine/15' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted hover:text-ink"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-err`} className="mt-1.5 text-[12px] text-wine">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-[12px] text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

/* ================= Log In ================= */

export function LogIn() {
  const { logIn } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const location = useLocation()
  const registered = (location.state as { registered?: { name: string; email: string } } | null)?.registered
  const [email, setEmail] = useState(registered?.email ?? '')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({})
  const [busy, setBusy] = useState<string | null>(null)
  const next = params.get('next')

  const submit = async (e?: FormEvent, creds?: { email: string; password: string }) => {
    e?.preventDefault()
    if (busy) return
    const em = creds?.email ?? email
    const pw = creds?.password ?? password
    const errs: typeof errors = {}
    if (!em.trim()) errs.email = 'Enter your email address.'
    else if (!EMAIL_RE.test(em.trim())) errs.email = 'This doesn’t look like an email address.'
    if (!pw) errs.password = 'Enter your password.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(creds ? creds.email : 'form')
    const res = await logIn(em, pw)
    if (!res.ok) {
      setBusy(null)
      setErrors(res.field === 'email' || res.field === 'password' ? { [res.field]: res.error } : { form: res.error })
      return
    }
    // PublicOnly (App.tsx) sends the now signed-in user on to `next`; navigating here too keeps it explicit
    navigate(destinationFor(next, res.user.role), { replace: true })
  }

  return (
    <AuthShell title="Log in" subtitle="Welcome back to the SmartBook library.">
      {registered && (
        <p className="mb-5 flex items-start gap-2 rounded-md border border-forest/25 bg-forest-50 px-3 py-2.5 text-[13px] text-forest" role="status">
          <Check size={15} className="mt-0.5 shrink-0" /> Account created for {registered.name}. Log in to continue.
        </p>
      )}
      {next && !registered && (
        <p className="mb-5 flex items-start gap-2 rounded-md border border-line bg-paper px-3 py-2.5 text-[13px] text-soft" role="status">
          <Info size={15} className="mt-0.5 shrink-0" /> Please log in to open that page.
        </p>
      )}
      <form onSubmit={submit} noValidate className="space-y-4">
        <TextField label="Email" type="email" value={email} onChange={v => setEmail(v)} autoComplete="email" error={errors.email} autoFocus={!registered} />
        <TextField label="Password" type="password" value={password} onChange={v => setPassword(v)} autoComplete="current-password" error={errors.password} autoFocus={!!registered} />
        {errors.form && <p className="text-[13px] text-wine">{errors.form}</p>}
        <button type="submit" className="btn-primary h-11 w-full" disabled={!!busy}>
          {busy === 'form' ? <Loader2 size={16} className="animate-spin" /> : null}
          {busy === 'form' ? 'Signing in…' : 'Log In'}
        </button>
      </form>
      <p className="mt-5 text-center text-[13px] text-soft">
        New to SmartBook?{' '}
        <Link to={`/signup${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-medium text-forest hover:underline">
          Create an account
        </Link>
      </p>

      <section className="mt-9 rounded-md border border-dashed border-rule p-4" aria-label="Demo accounts">
        <p className="eyebrow">Demo accounts · for testing only</p>
        <div className="mt-3 space-y-2">
          {DEMO_ACCOUNTS.map(d => (
            <button
              key={d.id}
              type="button"
              disabled={!!busy}
              onClick={() => {
                setEmail(d.email)
                setPassword(d.password)
                submit(undefined, { email: d.email, password: d.password })
              }}
              className="group flex w-full items-center gap-3 rounded-md border border-line bg-paper px-3 py-2.5 text-left transition-colors hover:border-forest/40 disabled:opacity-60"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest">
                {d.role === 'student' ? <GraduationCap size={16} /> : <PenLine size={15} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium capitalize">
                  {d.role} · <span className="font-normal text-soft">{d.name}</span>
                </span>
                <span className="block font-mono text-[11px] text-muted">
                  {d.email} / {d.password}
                </span>
              </span>
              {busy === d.email ? <Loader2 size={15} className="animate-spin text-forest" /> : <ArrowRight size={15} className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-forest" />}
            </button>
          ))}
        </div>
      </section>
    </AuthShell>
  )
}

/* ================= Sign Up ================= */

const ROLES: { id: Role; title: string; text: string; icon: ReactNode }[] = [
  { id: 'student', title: 'Student', text: 'Read course books, practise with exercises, track progress.', icon: <BookOpenText size={18} /> },
  { id: 'professor', title: 'Professor', text: 'Write and publish textbooks, follow your groups’ progress.', icon: <PenLine size={17} /> },
]

type SignUpErrors = Partial<Record<'name' | 'email' | 'password' | 'confirm' | 'role' | 'form', string>>

function validate(f: { name: string; email: string; password: string; confirm: string; role: Role | null }): SignUpErrors {
  const e: SignUpErrors = {}
  if (f.name.trim().length < 2) e.name = 'Enter your full name.'
  if (!f.email.trim()) e.email = 'Enter your email address.'
  else if (!EMAIL_RE.test(f.email.trim())) e.email = 'This doesn’t look like an email address.'
  if (f.password.length < 8) e.password = 'Use at least 8 characters.'
  else if (!/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) e.password = 'Include at least one letter and one number.'
  if (!f.confirm) e.confirm = 'Repeat the password.'
  else if (f.confirm !== f.password) e.confirm = 'The passwords don’t match.'
  if (!f.role) e.role = 'Choose how you will use SmartBook.'
  return e
}

export function SignUp() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '', role: null as Role | null })
  const [errors, setErrors] = useState<SignUpErrors>({})
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)

  const set = (p: Partial<typeof f>) => {
    const nf = { ...f, ...p }
    setF(nf)
    if (tried) setErrors(validate(nf)) // live feedback once the user has tried to submit
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    const errs = validate(f)
    setErrors(errs)
    if (Object.keys(errs).length || !f.role) return
    setBusy(true)
    const res = await signUp({ name: f.name, email: f.email, password: f.password, role: f.role })
    setBusy(false)
    if (!res.ok) {
      setErrors({ [res.field ?? 'form']: res.error })
      return
    }
    const next = params.get('next')
    navigate(`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`, { state: { registered: { name: res.user.name, email: res.user.email } } })
  }

  return (
    <AuthShell title="Create an account" subtitle="Join the SmartBook library as a student or a professor.">
      <form onSubmit={submit} noValidate className="space-y-4">
        <TextField label="Full name" value={f.name} onChange={v => set({ name: v })} autoComplete="name" error={errors.name} autoFocus />
        <TextField label="Email" type="email" value={f.email} onChange={v => set({ email: v })} autoComplete="email" error={errors.email} />
        <TextField label="Password" type="password" value={f.password} onChange={v => set({ password: v })} autoComplete="new-password" error={errors.password} hint="At least 8 characters, with a letter and a number." />
        <TextField label="Confirm password" type="password" value={f.confirm} onChange={v => set({ confirm: v })} autoComplete="new-password" error={errors.confirm} />

        <fieldset>
          <legend className="label">I am a</legend>
          <div role="radiogroup" aria-invalid={!!errors.role} className="grid grid-cols-2 gap-2">
            {ROLES.map(r => {
              const active = f.role === r.id
              return (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => set({ role: r.id })}
                  className={`relative flex flex-col items-start rounded-md border p-3 text-left transition-colors ${
                    active ? 'border-forest bg-forest-50' : errors.role ? 'border-wine/50 bg-paper' : 'border-rule bg-paper hover:border-soft/50'
                  }`}
                >
                  <span className={active ? 'text-forest' : 'text-soft'}>{r.icon}</span>
                  <span className={`mt-2 font-serif text-[16px] font-semibold ${active ? 'text-forest' : ''}`}>{r.title}</span>
                  <span className="mt-0.5 text-[11.5px] leading-snug text-muted">{r.text}</span>
                  {active && <Check size={14} className="absolute right-2.5 top-2.5 text-forest" />}
                </button>
              )
            })}
          </div>
          {errors.role && <p className="mt-1.5 text-[12px] text-wine">{errors.role}</p>}
        </fieldset>

        {errors.form && <p className="text-[13px] text-wine">{errors.form}</p>}
        <button type="submit" className="btn-primary h-11 w-full" disabled={busy}>
          {busy && <Loader2 size={16} className="animate-spin" />}
          {busy ? 'Creating account…' : 'Create Account'}
        </button>
      </form>
      <p className="mt-5 text-center text-[13px] text-soft">
        Already have an account?{' '}
        <Link to={`/login${params.get('next') ? `?next=${encodeURIComponent(params.get('next')!)}` : ''}`} className="font-medium text-forest hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  )
}
