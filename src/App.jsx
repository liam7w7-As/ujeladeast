import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute, { AdminRoute } from './routes/ProtectedRoute'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import SpotlightBackground from './components/ui/SpotlightBackground'
import ChatWidget from './components/ui/ChatWidget'
import Home from './pages/Home'
import Feed from './pages/Feed'
import Login from './pages/Login'
import Register from './pages/Register'
import Hymnal from './pages/Hymnal'
import BibleStudy from './pages/BibleStudy'
import Societies from './pages/Societies'
import Resources from './pages/Resources'
import Chat from './pages/Chat'

// Admin Pages
import Admin from './pages/Admin'
import Dashboard from './pages/admin/Dashboard'
import SocietiesAdmin from './components/admin/SocietiesAdmin'
import ResourcesAdmin from './components/admin/ResourcesAdmin'
import AdminUsers from './pages/admin/AdminUsers'
import AdminPosts from './pages/admin/AdminPosts'
import AdminHymnal from './pages/admin/AdminHymnal'
import AdminStudies from './pages/admin/AdminStudies'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SpotlightBackground />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/himnario" element={<Hymnal />} />
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
          </Route>
        </Routes>

        {/* UJELADITO: widget flotante presente en TODAS las páginas */}
        <ChatWidget />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
