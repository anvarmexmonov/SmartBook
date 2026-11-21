import { useEffect } from 'react'
import { Outlet, Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header'
import { BookTransitionProvider } from './components/BookTransition'
import BookDetails from './components/BookDetails'
import Footer from './components/Footer'
import { DeniedNotice, PublicOnly, RequireAuth, RoleOnly } from './components/Guards'
import Library from './pages/Library'
import Reader from './pages/Reader'
import MyBooks from './pages/MyBooks'
import Studio from './pages/Studio'
import Radar from './pages/Radar'
import NotFound from './pages/NotFound'
import { LogIn, SignUp } from './pages/Auth'

function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <DeniedNotice />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <BookDetails />
    </div>
  )
}

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo(0, 0), [pathname])
  return null
}

export default function App() {
  return (
    <BookTransitionProvider>
      <ScrollTop />
      <Routes>
        <Route path="/login" element={<PublicOnly><LogIn /></PublicOnly>} />
        <Route path="/signup" element={<PublicOnly><SignUp /></PublicOnly>} />
        {/* both roles: students read, professors preview as a student would */}
        <Route path="/read/:bookId/:chapterId?" element={<RequireAuth><Reader /></RequireAuth>} />
        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Library />} />
          <Route path="my-books" element={<RoleOnly role="student"><MyBooks /></RoleOnly>} />
          <Route path="studio" element={<RoleOnly role="professor"><Studio /></RoleOnly>} />
          <Route path="studio/:bookId" element={<RoleOnly role="professor"><Studio /></RoleOnly>} />
          <Route path="radar" element={<RoleOnly role="professor"><Radar /></RoleOnly>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BookTransitionProvider>
  )
}
