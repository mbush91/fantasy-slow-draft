import React, { useState } from 'react'
import api from '../api'

export default function Login({ onLogin }) {
  const [leagueName, setLeagueName] = useState('')
  const [teamName, setTeamName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'create'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const path = mode === 'create' ? '/auth/create_league' : '/auth/login'
      const res = await api.post(path, { league_name: leagueName, team_name: teamName, league_password: password })
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('team_name', res.data.team_name)
      localStorage.setItem('league_name', res.data.league_name)
      localStorage.setItem('is_admin', String(!!res.data.is_admin))
      onLogin?.()
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    }
  }

  return (
    <div className="container">
      <h1>Fantasy Draft Login</h1>
      <div className="card" style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8 }}>
          <input type="radio" name="mode" checked={mode === 'login'} onChange={() => setMode('login')} />
          Login to Existing League
        </label>
        <label style={{ marginLeft: 16 }}>
          <input type="radio" name="mode" checked={mode === 'create'} onChange={() => setMode('create')} />
          Create New League
        </label>
      </div>
      <form onSubmit={handleSubmit} className="card">
        <label>League Name</label>
        <input value={leagueName} onChange={(e) => setLeagueName(e.target.value)} required />
        <label>Team Name</label>
        <input value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
        <label>{mode === 'create' ? 'Set League Password' : 'League Password'}</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">{mode === 'create' ? 'Create League' : 'Login'}</button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  )
}
