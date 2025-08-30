import React, { useEffect, useState } from 'react'
import Login from './pages/Login'
import Draft from './pages/Draft'

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))

  useEffect(() => {
    const onStorage = () => setToken(localStorage.getItem('token'))
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  if (!token) {
    return <Login onLogin={() => setToken(localStorage.getItem('token'))} />
  }
  return <Draft onLogout={() => { localStorage.clear(); setToken(null) }} />
}
