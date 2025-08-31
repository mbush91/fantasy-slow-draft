import React, { useEffect, useMemo, useState } from 'react'
import api from '../api'
import DraftHeader from '../components/DraftHeader'
import TeamRoster from '../components/TeamRoster'
import PlayerTable from '../components/PlayerTable'
import CSVUpload from '../components/CSVUpload'
import DraftConfigForm from '../components/DraftConfigForm'

export default function Draft({ onLogout }) {
  const teamName = localStorage.getItem('team_name')
  const isAdmin = localStorage.getItem('is_admin') === 'true'
  const [draftState, setDraftState] = useState(null)
  const [myTeam, setMyTeam] = useState(null)
  const [players, setPlayers] = useState([])
  const [recentPicks, setRecentPicks] = useState([])
  const [loading, setLoading] = useState(false)
  const isMyTurn = useMemo(() => draftState?.current_team === teamName, [draftState, teamName])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [stateRes, teamRes, playersRes, draftedRes] = await Promise.all([
        api.get('/draft/state'),
        api.get('/teams/me'),
        api.get('/players/available'),
        api.get('/players/drafted', { params: { limit: 10 } }),
      ])
      setDraftState(stateRes.data)
      setMyTeam(teamRes.data)
      setPlayers(playersRes.data)
      setRecentPicks(draftedRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll(); const id = setInterval(loadAll, 3000); return () => clearInterval(id) }, [])

  const handlePick = async (playerId) => {
    try {
      await api.post('/draft/pick', { player_id: playerId })
      await loadAll()
    } catch (err) {
      alert(err.response?.data?.detail || 'Pick failed')
    }
  }

  return (
    <div className="container">
      <div className="topbar">
        <h2>Team: {teamName}</h2>
        <button onClick={onLogout}>Logout</button>
      </div>

      <DraftHeader draftState={draftState} onRefresh={loadAll} />

      <div className="grid">
        <div>
          <h3>My Roster</h3>
          <TeamRoster roster={myTeam?.players || []} counts={myTeam?.counts_by_position || {}} />
          {isAdmin && (
            <div className="card">
              <h3>Admin</h3>
              <CSVUpload onUploaded={loadAll} />
              <DraftConfigForm onSaved={loadAll} />
            </div>
          )}
        </div>
        <div>
          <h3>Available Players</h3>
          <PlayerTable players={players} onPick={handlePick} disabled={!isMyTurn} loading={loading} />
          <div className="card" style={{ marginTop: 16 }}>
            <h3>Recent Picks</h3>
            {recentPicks.length === 0 ? (
              <p>No picks yet.</p>
            ) : (
              <ul>
                {recentPicks.map((p) => (
                  <li key={p.id}>
                    <strong>{p.name}</strong> ({p.position}) — picked by {p.drafted_by}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
