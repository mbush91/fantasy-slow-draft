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
  const [selectedTeam, setSelectedTeam] = useState(teamName)
  const [selectedRoster, setSelectedRoster] = useState(null)
  const [players, setPlayers] = useState([])
  const [recentPicks, setRecentPicks] = useState([])
  const [positionFilter, setPositionFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const isMyTurn = useMemo(() => draftState?.current_team === teamName, [draftState, teamName])

  const computeUpcoming = (count = 10) => {
    const order = draftState?.draft_order || []
    const idx = draftState?.current_pick_index ?? 0
    const n = order.length
    if (!n) return []
    const upcoming = []
    for (let k = 0; k < count; k++) {
      const i = idx + k
      const round = Math.floor(i / n)
      const pickInRound = i % n
      const sel = round % 2 === 0 ? pickInRound : n - 1 - pickInRound
      upcoming.push({ pickNumber: i + 1, team: order[sel] })
    }
    return upcoming
  }

  const loadAll = async () => {
    setLoading(true)
    try {
      const [stateRes, teamRes, playersRes, draftedRes] = await Promise.all([
        api.get('/draft/state'),
        api.get('/teams/me'),
        api.get('/players/available', { params: { position: positionFilter || undefined } }),
        api.get('/players/drafted', { params: { limit: 10 } }),
      ])
      setDraftState(stateRes.data)
      setMyTeam(teamRes.data)
      setPlayers(playersRes.data)
      setRecentPicks(draftedRes.data)
      // Load viewer roster based on current selection
      if (selectedTeam === teamName) {
        setSelectedRoster(teamRes.data)
      } else {
        try {
          const other = await api.get(`/teams/by_name/${encodeURIComponent(selectedTeam)}`)
          setSelectedRoster(other.data)
        } catch {
          // If team not found yet, fallback to empty
          setSelectedRoster({ team_name: selectedTeam, players: [], counts_by_position: {} })
        }
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll(); const id = setInterval(loadAll, 3000); return () => clearInterval(id) }, [positionFilter])

  // Refetch available players when position filter changes
  useEffect(() => {
    const refetchPlayers = async () => {
      try {
        const res = await api.get('/players/available', { params: { position: positionFilter || undefined } })
        setPlayers(res.data)
      } catch (e) {
        // ignore
      }
    }
    refetchPlayers()
  }, [positionFilter])

  // Refresh the viewer panel whenever selected team changes (without waiting for the next poll)
  useEffect(() => {
    const run = async () => {
      if (!selectedTeam) return
      if (selectedTeam === teamName) {
        setSelectedRoster(myTeam)
        return
      }
      try {
        const other = await api.get(`/teams/by_name/${encodeURIComponent(selectedTeam)}`)
        setSelectedRoster(other.data)
      } catch {
        setSelectedRoster({ team_name: selectedTeam, players: [], counts_by_position: {} })
      }
    }
    run()
  }, [selectedTeam, teamName, myTeam])

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
          <div className="card" style={{ marginTop: 16 }}>
            <h3>View Team</h3>
            <div style={{ marginBottom: 8 }}>
              <select value={selectedTeam} onChange={async (e) => setSelectedTeam(e.target.value)}>
                {(draftState?.draft_order || [teamName]).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <TeamRoster roster={selectedRoster?.players || []} counts={selectedRoster?.counts_by_position || {}} />
          </div>
          {isAdmin && (
            <div className="card">
              <h3>Admin</h3>
              <CSVUpload onUploaded={loadAll} />
              <DraftConfigForm
                onSaved={loadAll}
                positionLimits={draftState?.position_limits}
                draftOrder={draftState?.draft_order}
                currentPickIndex={draftState?.current_pick_index}
              />
            </div>
          )}
        </div>
        <div>
          <h3>Available Players</h3>
          <div className="row" style={{ marginBottom: 8 }}>
            <label style={{ marginRight: 8 }}>Filter by position:</label>
            <select value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)}>
              <option value="">All</option>
              {(draftState?.position_limits ? Object.keys(draftState.position_limits) : []).map((pos) => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>
          <PlayerTable players={players} onPick={handlePick} disabled={!isMyTurn} loading={loading} />
          <div className="card" style={{ marginTop: 16 }}>
            <h3>Upcoming Picks</h3>
            {draftState?.draft_order?.length ? (
              <ol>
                {computeUpcoming(10).map((p) => (
                  <li key={p.pickNumber}>#{p.pickNumber}: {p.team}</li>
                ))}
              </ol>
            ) : (
              <p>Draft not configured.</p>
            )}
          </div>
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
