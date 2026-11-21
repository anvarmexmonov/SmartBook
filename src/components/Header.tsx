import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { ChevronDown, GraduationCap, LogOut, UserRound } from 'lucide-react'
import { homeFor, useAuth, type SessionUser } from '../store/Auth'

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="5" fill="#23432F" />
        <path d="M9 8h9a5 5 0 0 1 5 5v11H14a5 5 0 0 1-5-5z" fill="none" stroke="#F6F1E6" strokeWidth="2" />
        <path d="M13 13h6M13 17h6" stroke="#F6F1E6" strokeWidth="1.6" />
      </svg>
      {!compact && (
        <span className="font-serif text-[21px] font-semibold tracking-[-0.01em] text-ink">
          SmartBook
        </span>
      )}
    </span>
  )
}

export default function Header() {
  const { user, logOut } = useAuth()
  const navigate = useNavigate()
  const role = user?.role ?? 'student'

  const links =
    role === 'student'
      ? [
          { to: '/', label: 'Library', end: true },
          { to: '/my-books', label: 'My Books' },
        ]
      : [
          { to: '/studio', label: 'Studio' },
          { to: '/radar', label: 'Learning Radar' },
          { to: '/', label: 'Library', end: true },
        ]

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ivory/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <NavLink to={homeFor(role)} aria-label="SmartBook home" className="shrink-0">
          <Logo />
        </NavLink>
        <span className="hidden text-[11px] leading-tight text-muted lg:block">
          Digital library
          <br />
          for legal education
        </span>

        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `relative px-3 py-2 text-sm transition-colors ${
                  isActive ? 'text-ink after:absolute after:inset-x-3 after:-bottom-[13px] after:h-[2px] after:bg-forest' : 'text-muted hover:text-ink'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto">
          {user && (
            <AccountMenu
              user={user}
              onLogOut={() => {
                logOut()
                navigate('/login', { replace: true })
              }}
            />
          )}
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-line px-3 md:hidden">
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `whitespace-nowrap border-b-2 px-3 py-2.5 text-sm ${isActive ? 'border-forest text-ink' : 'border-transparent text-muted'}`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}

const initials = (name: string) =>
  name
    .replace(/^(Prof\.|Dr\.)\s*/, '')
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

function AccountMenu({ user, onLogOut }: { user: SessionUser; onLogOut: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account: ${user.name}`}
        className="flex h-10 items-center gap-2.5 rounded-md border border-transparent pl-1 pr-2 transition-colors hover:border-rule hover:bg-paper"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest font-sans text-[12px] font-semibold tracking-wide text-paper">{initials(user.name)}</span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-[180px] truncate text-[13px] font-medium text-ink">{user.name}</span>
          <span className="block text-[11px] capitalize text-muted">{user.role}</span>
        </span>
        <ChevronDown size={14} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 z-40 w-64 animate-fadeUp rounded-md border border-line bg-paper py-1 shadow-panel">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate font-serif text-[16px] font-semibold">{user.name}</p>
            <p className="truncate text-[12px] text-muted">{user.email}</p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-sm bg-forest-50 px-2 py-0.5 text-[11px] font-medium text-forest">
              {user.role === 'student' ? <GraduationCap size={12} /> : <UserRound size={12} />}
              <span className="capitalize">{user.role}</span>
              {user.demo && <span className="font-normal text-forest/70">· demo account</span>}
            </p>
          </div>
          <button role="menuitem" onClick={onLogOut} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] text-soft hover:bg-ink/[0.04] hover:text-ink">
            <LogOut size={15} /> Log out
          </button>
          <p className="border-t border-line px-4 py-2 text-[11px] leading-snug text-muted">To use the other role, log out and sign in with a different account.</p>
        </div>
      )}
    </div>
  )
}
