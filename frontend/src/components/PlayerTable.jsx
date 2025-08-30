import React, { useMemo, useState } from 'react'

export default function PlayerTable({ players, onPick, disabled, loading }) {
  const [filter, setFilter] = useState('')
  const filtered = useMemo(() => {
    const f = filter.trim().toUpperCase()
    return players.filter(p => !f || p.position.toUpperCase() === f)
  }, [players, filter])

  return (
    <div className="card">
      <div className="row">
        <input placeholder="Filter by position (e.g., QB, RB)" value={filter} onChange={e => setFilter(e.target.value)} />
        <button onClick={() => setFilter('')}>Clear</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Position</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.position}</td>
              <td>
                <button disabled={disabled || loading} onClick={() => onPick(p.id)}>Draft</button>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan="3" style={{ textAlign: 'center' }}>No players</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
