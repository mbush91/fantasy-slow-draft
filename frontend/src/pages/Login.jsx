import React, { useState } from 'react'
import api from '../api'

export default function Login({ onLogin }) {
  const [leagueName, setLeagueName] = useState('')
  const [teamName, setTeamName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await api.post('/auth/login', { league_name: leagueName, team_name: teamName, league_password: password })
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('team_name', res.data.team_name)
      localStorage.setItem('league_name', res.data.league_name)
      onLogin?.()
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    }
  }

  return (
    <div className="container">
      <h1>Fantasy Draft Login</h1>
      <form onSubmit={handleSubmit} className="card">
        <label>League Name</label>
        <input value={leagueName} onChange={(e) => setLeagueName(e.target.value)} required />
        <label>Team Name</label>
        <input value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
        <label>League Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Login</button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  )
}
