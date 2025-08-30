import React from 'react'

export default function TeamRoster({ roster, counts }) {
  const entries = Object.entries(counts || {})
  return (
    <div className="card">
      <div className="row">
        <strong>Counts:</strong>
        {entries.length === 0 ? <span> None</span> : entries.map(([pos, n]) => (
          <span key={pos} className="badge">{pos}: {n}</span>
        ))}
      </div>
      <ul>
        {roster.map(p => (
          <li key={p.id}>{p.name} <span className="muted">({p.position})</span></li>
        ))}
        {roster.length === 0 && <li className="muted">No players drafted yet</li>}
      </ul>
    </div>
  )
}
