import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import NewSale from './pages/NewSale'
import '@fortawesome/fontawesome-free/css/all.min.css'

function App() {
  const [user, setUser] = useState(null)

  return (
    <Router>
      <Routes>
        {/* Если нет юзера → редирект на /login */}
        <Route
          path="/"
          element={
            user ? <Dashboard user={user} onLogout={() => setUser(null)} /> : <Navigate to="/login" />
          }
        />
        <Route path="/new-sale" element={<NewSale user={user} />} />
        <Route path="/login" element={<Login onLogin={setUser} />} />
      </Routes>
    </Router>
  )
}

export default App