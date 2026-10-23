import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { MotionConfig } from 'motion/react'
import { AuthProvider } from './context/AuthContext'
import { AdminRoute } from './routes/ProtectedRoute'
import SpotlightBackground from './components/ui/SpotlightBackground'
import ChatWidget from './components/ui/ChatWidget'
import InstallPrompt from './components/ui/InstallPrompt'
import OfflineBanner from './components/ui/OfflineBanner'
import UpdatePrompt from './components/ui/UpdatePrompt'
import RouteMetadata from './components/seo/Metadata'
import About from './pages/About'
import Publication from './pages/Publication'

import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import RecoverPassword from './pages/RecoverPassword'
import AuthCallback from './pages/AuthCallback'
import AccountSetupGate from './components/layout/AccountSetupGate'
const Account = lazy(() => import('./pages/Account'))
const Feed = lazy(() => import('./pages/Feed'))
const Hymnal = lazy(() => import('./pages/Hymnal'))
const BibleStudy = lazy(() => import('./pages/BibleStudy'))
const Societies = lazy(() => import('./pages/Societies'))
const Resources = lazy(() => import('./pages/Resources'))
const Chat = lazy(() => import('./pages/Chat'))

// Admin Pages
const Admin = lazy(() => import('./pages/Admin'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const SocietiesAdmin = lazy(() => import('./components/admin/SocietiesAdmin'))
const ResourcesAdmin = lazy(() => import('./components/admin/ResourcesAdmin'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminPosts = lazy(() => import('./pages/admin/AdminPosts'))
const AdminHymnal = lazy(() => import('./pages/admin/AdminHymnal'))
const AdminStudies = lazy(() => import('./pages/admin/AdminStudies'))
const AdminStudyTracking = lazy(() => import('./pages/admin/AdminStudyTracking'))
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'))
const AdminSearchResults = lazy(() => import('./pages/admin/AdminSearchResults'))

const Bible = lazy(() => import('./pages/Bible'))

function App() {
  return (
    <AuthProvider>
      <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <RouteMetadata />
        <OfflineBanner />
        <UpdatePrompt />
        <SpotlightBackground />
        <AccountSetupGate><Suspense fallback={<div role="status" className="p-24 text-center">Cargando...</div>}><Routes>
          <Route path="/" element={<Home />} />
          <Route path="/nosotros" element={<About />} />
          <Route path="/estudio-biblico" element={<About study />} />
          <Route path="/publicaciones/:id" element={<Publication />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/recuperar" element={<RecoverPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/completar-perfil" element={<Account onboarding />} />
          <Route path="/cuenta" element={<Account />} />
          <Route path="/himnario" element={<Hymnal />} />
          <Route path="/biblia" element={<Suspense fallback={<div role="status" className="p-24 text-center">Abriendo Biblia...</div>}><Bible /></Suspense>} />
          <Route path="/estudios" element={<BibleStudy />} />
          <Route path="/sociedades" element={<Societies />} />
          <Route path="/recursos" element={<Resources />} />
          <Route path="/chat" element={<Chat />} />
          
          <Route path="/admin" element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="sociedades" element={<SocietiesAdmin />} />
            <Route path="recursos" element={<ResourcesAdmin />} />
            <Route path="usuarios" element={<AdminUsers />} />
            <Route path="posts" element={<AdminPosts />} />
            <Route path="himnario" element={<AdminHymnal />} />
            <Route path="estudios" element={<AdminStudies />} />
            <Route path="seguimiento" element={<AdminStudyTracking />} />
            <Route path="notificaciones" element={<AdminNotifications />} />
            <Route path="buscar" element={<AdminSearchResults />} />
          </Route>
        </Routes></Suspense></AccountSetupGate>

        {/* Componentes Globales */}
        <ChatWidget />
        <InstallPrompt />
      </BrowserRouter>
      </MotionConfig>
    </AuthProvider>
  )
}

export default App
