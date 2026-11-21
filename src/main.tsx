import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AppStoreProvider } from './store/AppStore'
import { AuthProvider, useAuth } from './store/Auth'
import './index.css'

/** Each signed-in account gets its own store instance (shelf, progress, answers). */
function AccountStore({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return (
    <AppStoreProvider key={user?.id ?? 'guest'} userId={user?.id ?? null} role={user?.role ?? 'student'}>
      {children}
    </AppStoreProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AccountStore>
          <App />
        </AccountStore>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
