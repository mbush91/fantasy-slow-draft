import React from 'react'

export default function DraftHeader({ draftState, onRefresh }) {
  const current = draftState?.current_team || '—'
  return (
    <div className="card">
      <div className="row">
        <h3>On the clock: {current}</h3>
        <button onClick={onRefresh}>Refresh</button>
      </div>
      {draftState && (
        <p className="muted">Pick #{(draftState.current_pick_index ?? 0) + 1} • Order: {draftState.draft_order?.join(' → ')}</p>
      )}
    </div>
  )
}
