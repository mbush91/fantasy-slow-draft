import React from 'react'

export default function PlayerTable({ players, onPick, disabled, loading }) {
  return (
    <div className="card">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Name</th>
            <th>Position</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {players.map(p => (
            <tr key={p.id}>
              <td>{p.rank ?? '—'}</td>
              <td>{p.name}</td>
              <td>{p.position}</td>
              <td>
                <button disabled={disabled || loading} onClick={() => onPick(p.id)}>Draft</button>
              </td>
            </tr>
          ))}
          {players.length === 0 && (
            <tr><td colSpan="4" style={{ textAlign: 'center' }}>No players</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
