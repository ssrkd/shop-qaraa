import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Preloader from './pages/Preloader'
import Login from './pages/Login'
import NewSale from './pages/NewSale'
import AdminPanel from './pages/AdminPanel'
import SalesHistory from './pages/SalesHistory'
import Jarvis from './pages/jarvis'
import AnalitikaHistory from './pages/AnalitikaHistory'
import '@fortawesome/fontawesome-free/css/all.min.css'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Имитация автологина через локалсторадж (опционально)
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  if (loading) return <div>Загрузка...</div>

  return (
    <Router>
      <Routes>
        {/* Главная: если есть user → Preloader → через 2-3 сек Dashboard */}
        <Route
          path="/"
          element={
            user ? <Preloader user={user} /> : <Navigate to="/login" />
          }
        />

        {/* Login */}
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
        />
        
        {/* New Sale */}
        <Route
          path="/new-sale"
          element={user ? <NewSale user={user} /> : <Navigate to="/login" />}
        />

        {/* AdminPanel */}
        <Route
          path="/adminpanel"
          element={user ? <AdminPanel user={user} /> : <Navigate to="/login" />}
        />

        {/* SalesHistory */}
        <Route
          path="/sales-history"
          element={user ? <SalesHistory user={user} /> : <Navigate to="/login" />}
        />

        {/* Jarvis */}
        <Route
          path="/jarvis"
          element={user ? <Jarvis user={user} /> : <Navigate to="/login" />}
        />

        {/* AnalitikaHistory */}
        <Route
          path="/analitika-history"
          element={user ? <AnalitikaHistory user={user} /> : <Navigate to="/login" />}
        />

        {/* Любой другой путь → редирект на "/" */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}

export default App